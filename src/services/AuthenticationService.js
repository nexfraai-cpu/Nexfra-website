import { apiClient, ApiError } from '../api/client.js';
import { sessionStore } from '../api/session.js';
import { isDevelopment } from '../config.js';

const DEV_ACCOUNTS = {
  admin: 'admin@nexfra.dev',
  sales: 'sales@nexfra.dev',
  finance: 'finance@nexfra.dev',
  manager: 'manager@nexfra.dev',
};

const DEV_PASSWORD = 'Nexfra@Dev123';

function normalizeUser(user) {
  return {
    ...user,
    fullName: user.name || user.fullName || '',
    status: 'Active',
  };
}

class AuthService {
  constructor() {
    this._currentUser = null;
    this._restoreSession();
  }

  _restoreSession() {
    const token = sessionStore.getToken();
    if (!token) return;
    const user = sessionStore.getUser();
    if (!user) {
      sessionStore.clear();
      return;
    }
    this._currentUser = normalizeUser(user);
  }

  get currentUser() {
    return this._currentUser;
  }

  get isLoggedIn() {
    return this._currentUser !== null && !!sessionStore.getToken();
  }

  get userRole() {
    return this._currentUser ? this._currentUser.role : null;
  }

  get userName() {
    return this._currentUser ? this._currentUser.fullName : null;
  }

  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const payload = await apiClient.post('/api/auth/login', { email, password });

    if (payload.requiresMfa) {
      throw new Error('MFA verification is required but not yet supported.');
    }

    const { user, session } = payload.data || {};
    if (!user || !session?.token) {
      throw new Error('Invalid response from authentication server.');
    }

    this._currentUser = normalizeUser(user);
    sessionStore.setToken(session.token);
    sessionStore.setUser(this._currentUser);
    return this._currentUser;
  }

  async loginByRole(role) {
    if (!isDevelopment()) {
      throw new Error('Quick login is only available in development mode.');
    }
    const email = DEV_ACCOUNTS[role];
    if (!email) {
      throw new Error(`No development account for role: ${role}`);
    }
    return this.login(email, DEV_PASSWORD);
  }

  async logout() {
    const token = sessionStore.getToken();
    if (token) {
      try {
        await apiClient.post('/api/auth/logout');
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          // Session already invalid — proceed with local cleanup.
        }
      }
    }
    this._currentUser = null;
    sessionStore.clear();
  }

  async persistSession() {
    if (this._currentUser && sessionStore.getToken()) {
      sessionStore.setUser(this._currentUser);
    }
  }

  canAccess(moduleName) {
    const permissions = {
      dashboard: ['admin', 'sales', 'finance', 'manager'],
      quotations: ['sales', 'admin'],
      allquotations: ['sales', 'admin'],
      approvals: ['admin'],
      status: ['manager', 'admin'],
      workorders: ['manager', 'admin'],
      sales: ['manager', 'admin'],
      accounts: ['finance', 'admin'],
      admin: ['admin']
    };
    const allowed = permissions[moduleName];
    return allowed && allowed.includes(this._currentUser?.role);
  }

  getUserDefaultModule() {
    const defaults = {
      sales: 'quotations',
      finance: 'accounts',
      manager: 'workorders',
      admin: 'dashboard'
    };
    return defaults[this._currentUser?.role] || 'dashboard';
  }
}

export const AuthenticationService = new AuthService();
