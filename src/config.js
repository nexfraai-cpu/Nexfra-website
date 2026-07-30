export const CONFIG = {
  APP_NAME: 'Nexfra ERP',
  VERSION: '1.0.0',
  ENVIRONMENT: import.meta.env.VITE_APP_ENV || 'development',
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  STORAGE_PROVIDER: import.meta.env.VITE_STORAGE_PROVIDER || 'localStorage',
  FEATURE_FLAGS: {
    DEVELOPMENT: (import.meta.env.VITE_APP_ENV || 'development') === 'development',
    ENABLE_QUICK_LOGIN: import.meta.env.VITE_ENABLE_QUICK_LOGIN === 'true',
    ENABLE_RESET_DATA: import.meta.env.VITE_ENABLE_RESET_DATA === 'true',
    ENABLE_CONSOLE_LOGS: (import.meta.env.VITE_APP_ENV || 'development') === 'development',
    ENABLE_DEMO_ACCOUNTS: import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true'
  },
  STORAGE_KEYS: {
    ERP_STATE: 'NEXFRA_ERP_STATE',
    AUTH_TOKEN: 'NEXFRA_AUTH_TOKEN',
    USER_ROLE: 'NEXFRA_USER_ROLE',
    USER_NAME: 'NEXFRA_USER_NAME',
    REDIRECT_AFTER_LOGIN: 'NEXFRA_REDIRECT_AFTER_LOGIN'
  },
  DEFAULT_TAX_RATE: 18,
  DEFAULT_CURRENCY: 'INR',
  MAX_LOG_ENTRIES: 50
};

export function isDevelopment() {
  return CONFIG.FEATURE_FLAGS.DEVELOPMENT;
}

export function isQuickLoginEnabled() {
  return CONFIG.FEATURE_FLAGS.DEVELOPMENT && CONFIG.FEATURE_FLAGS.ENABLE_QUICK_LOGIN;
}

export function isResetDataEnabled() {
  return CONFIG.FEATURE_FLAGS.DEVELOPMENT && CONFIG.FEATURE_FLAGS.ENABLE_RESET_DATA;
}
