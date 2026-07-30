import { StorageProvider } from './StorageProvider.js';
import { CONFIG } from '../config.js';

export class ApiProvider extends StorageProvider {
  constructor() {
    super();
    this.baseUrl = CONFIG.API_BASE_URL;
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async _request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      return response.json();
    } catch (e) {
      if (e.message?.startsWith('API error:')) throw e;
      console.error(`ApiProvider._request('${endpoint}') failed:`, e);
      return null;
    }
  }

  async get(key) {
    const data = await this._request(`/api/storage/${key}`);
    return data ? data.value : null;
  }

  async set(key, value) {
    await this._request(`/api/storage/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value }),
    });
  }

  async remove(key) {
    await this._request(`/api/storage/${key}`, { method: 'DELETE' });
  }

  async clear() {
    await this._request('/api/storage', { method: 'DELETE' });
  }

  async getJSON(key) {
    const raw = await this.get(key);
    if (raw == null) return null;
    try {
      return typeof raw === 'string' ? JSON.parse(raw) : raw;
    } catch (e) {
      console.error(`ApiProvider.getJSON('${key}') parse failed:`, e);
      return null;
    }
  }

  async setJSON(key, value) {
    await this.set(key, JSON.stringify(value));
  }
}
