import { apiClient } from '../api/client.js';

const PRICING_KEY = 'pricing_coefficients';
const METAL_PRICE_KEY = 'metal_price_per_kg';

const DEFAULT_PRICING = {
  floor6: -15000,
  floor10: 30000,
  steelHardox: 150000,
  axle2: -100000,
  axle3_16: 80000,
};

function parseValue(raw, fallback) {
  if (raw == null) return fallback;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch (e) {
    return fallback;
  }
}

export class AdminService {
  async getPricing() {
    const { value } = await apiClient.get(`/api/storage/${PRICING_KEY}`);
    return { ...DEFAULT_PRICING, ...(parseValue(value, {}) || {}) };
  }

  async updatePricing(pricing) {
    const current = await this.getPricing();
    const next = { ...current, ...pricing };
    await apiClient.post(`/api/storage/${PRICING_KEY}`, { value: next });
    return next;
  }

  async getMetalPrice() {
    const { value } = await apiClient.get(`/api/storage/${METAL_PRICE_KEY}`);
    const parsed = parseValue(value, 100);
    return typeof parsed === 'number' ? parsed : 100;
  }

  async setMetalPrice(price) {
    await apiClient.post(`/api/storage/${METAL_PRICE_KEY}`, {
      value: parseFloat(price) || 100,
    });
  }

  async resetAllSystemData() {
    const res = await apiClient.post('/api/admin/reset');
    return res.data || { reset: true };
  }
}
