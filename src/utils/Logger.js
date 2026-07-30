import { CONFIG } from '../config.js';

export const Logger = {
  info(message, ...args) {
    if (CONFIG.FEATURE_FLAGS.ENABLE_CONSOLE_LOGS) {
      console.log(`[${CONFIG.APP_NAME}] ${message}`, ...args);
    }
  },
  warn(message, ...args) {
    console.warn(`[${CONFIG.APP_NAME}] WARN: ${message}`, ...args);
  },
  error(message, ...args) {
    console.error(`[${CONFIG.APP_NAME}] ERROR: ${message}`, ...args);
  },
  debug(message, ...args) {
    if (CONFIG.FEATURE_FLAGS.ENABLE_CONSOLE_LOGS) {
      console.debug(`[${CONFIG.APP_NAME}] DEBUG: ${message}`, ...args);
    }
  }
};
