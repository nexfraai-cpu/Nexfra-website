import { CONFIG } from '../config.js';
import { LocalStorageProvider } from './LocalStorageProvider.js';
import { ApiProvider } from './ApiProvider.js';

let _instance = null;

export function getStorageProvider() {
  if (_instance) return _instance;
  
  switch (CONFIG.STORAGE_PROVIDER) {
    case 'api':
      _instance = new ApiProvider();
      break;
    case 'localStorage':
    default:
      _instance = new LocalStorageProvider();
      break;
  }
  
  return _instance;
}

export function resetStorageProvider() {
  _instance = null;
}

export { LocalStorageProvider } from './LocalStorageProvider.js';
export { ApiProvider } from './ApiProvider.js';
export { StorageProvider } from './StorageProvider.js';
