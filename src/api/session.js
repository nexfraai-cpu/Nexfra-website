import { getStorageProvider } from '../storage/index.js';

const TOKEN_KEY = 'NEXFRA_AUTH_TOKEN';
const REFRESH_TOKEN_KEY = 'NEXFRA_REFRESH_TOKEN';
const USER_KEY = 'NEXFRA_SESSION_USER';
const ROLE_KEY = 'NEXFRA_USER_ROLE';
const NAME_KEY = 'NEXFRA_USER_NAME';

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeJSON(key, value) {
  if (value == null) localStorage.removeItem(key);
  else localStorage.setItem(key, JSON.stringify(value));
}

export const sessionStore = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setToken(token) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);

    const provider = getStorageProvider();
    if (provider && typeof provider.setToken === 'function') {
      provider.setToken(token || null);
    }
  },

  getRefreshToken() {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },

  setRefreshToken(token) {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  },

  getUser() {
    return readJSON(USER_KEY);
  },

  setUser(user) {
    writeJSON(USER_KEY, user);
    if (user) {
      localStorage.setItem(ROLE_KEY, user.role || '');
      localStorage.setItem(NAME_KEY, user.name || user.fullName || '');
    } else {
      localStorage.removeItem(ROLE_KEY);
      localStorage.removeItem(NAME_KEY);
    }
  },

  getRole() {
    return localStorage.getItem(ROLE_KEY);
  },

  getName() {
    return localStorage.getItem(NAME_KEY);
  },

  clear() {
    [TOKEN_KEY, REFRESH_TOKEN_KEY, USER_KEY, ROLE_KEY, NAME_KEY].forEach((key) => {
      localStorage.removeItem(key);
    });
    const provider = getStorageProvider();
    if (provider && typeof provider.setToken === 'function') {
      provider.setToken(null);
    }
  },
};
