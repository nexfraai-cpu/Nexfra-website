import { StorageProvider } from './StorageProvider.js';

export class LocalStorageProvider extends StorageProvider {
  async get(key) {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error(`LocalStorageProvider.get('${key}') failed:`, e);
      return null;
    }
  }

  async set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error(`LocalStorageProvider.set('${key}') failed:`, e);
    }
  }

  async remove(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error(`LocalStorageProvider.remove('${key}') failed:`, e);
    }
  }

  async clear() {
    try {
      localStorage.clear();
    } catch (e) {
      console.error('LocalStorageProvider.clear() failed:', e);
    }
  }

  async getJSON(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      console.error(`LocalStorageProvider.getJSON('${key}') parse failed:`, e);
      return null;
    }
  }

  async setJSON(key, value) {
    try {
      await this.set(key, JSON.stringify(value));
    } catch (e) {
      console.error(`LocalStorageProvider.setJSON('${key}') failed:`, e);
    }
  }
}
