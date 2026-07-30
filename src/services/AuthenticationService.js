import { BaseService } from './BaseService.js';
import { EmployeeService } from './EmployeeService.js';
import { CONFIG, isDevelopment } from '../config.js';

class AuthService extends BaseService {
  constructor() {
    super();
    this._currentUser = null;
    this.employeeService = new EmployeeService();
  }

  get currentUser() {
    return this._currentUser;
  }

  get isLoggedIn() {
    return this._currentUser !== null;
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
    const employee = await this.employeeService.authenticate(email, password);
    if (!employee) {
      throw new Error('Invalid credentials or account is disabled.');
    }
    this._currentUser = employee;
    return employee;
  }

  async loginByRole(role) {
    if (!isDevelopment()) {
      throw new Error('Quick login is only available in development mode.');
    }
    const employee = await this.employeeService.findByRole(role);
    if (employee) {
      await this.employeeService.updateLastLogin(employee.id);
      this._currentUser = employee;
    } else {
      this._currentUser = {
        id: `EMP-${role}-dev`,
        fullName: role.charAt(0).toUpperCase() + role.slice(1),
        email: `${role}@nexframfg.com`,
        role: role,
        status: 'Active'
      };
    }
    return this._currentUser;
  }

  logout() {
    this._currentUser = null;
  }

  async persistSession() {
    if (!this._currentUser) return;
    const state = await this.loadState();
    const emp = state.employees.find(e => e.id === this._currentUser.id);
    if (emp) {
      emp.lastLogin = new Date().toISOString();
      await this.saveState(state);
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
