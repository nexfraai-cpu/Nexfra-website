import { StorageProvider } from './StorageProvider.js';
import { CONFIG } from '../config.js';

export class ApiProvider extends StorageProvider {
  constructor() {
    super();
    this.baseUrl = CONFIG.API_BASE_URL;
    this.token = null;
  }

  async _request(endpoint, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    const response = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  async get(key) {
    const data = await this._request(`/storage/${key}`);
    return data.value;
  }

  async set(key, value) {
    await this._request(`/storage/${key}`, {
      method: 'POST',
      body: JSON.stringify({ value })
    });
  }

  async remove(key) {
    await this._request(`/storage/${key}`, { method: 'DELETE' });
  }

  async clear() {
    await this._request('/storage', { method: 'DELETE' });
  }

  async getJSON(key) {
    const raw = await this.get(key);
    return raw ? JSON.parse(raw) : null;
  }

  async setJSON(key, value) {
    await this.set(key, JSON.stringify(value));
  }
}
