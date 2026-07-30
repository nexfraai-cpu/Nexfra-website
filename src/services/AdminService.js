import { BaseService } from './BaseService.js';

export class AdminService extends BaseService {
  async getPricing() {
    const state = await this.loadState();
    return state.adminPricing || {};
  }

  async updatePricing(pricing) {
    const state = await this.loadState();
    state.adminPricing = { ...(state.adminPricing || {}), ...pricing };
    await this.saveState(state);
    await this.logActivity('Admin pricing updated.');
  }

  async getMetalPrice() {
    const state = await this.loadState();
    return state.metalPricePerKg || 100;
  }

  async setMetalPrice(price) {
    const state = await this.loadState();
    state.metalPricePerKg = parseFloat(price) || 100;
    await this.saveState(state);
  }

  async resetAllSystemData() {
    const state = await this.loadState();
    state.quotations = [];
    state.productionItems = [];
    state.workOrders = [];
    state.sales = [];
    state.payments = [];
    state.chassisRecords = [];
    state.logs = [
      { time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), message: 'System database reset to production baseline.' }
    ];
    if (state.customers) {
      state.customers.forEach(c => { c.outstanding = 0; c.vehicles = []; });
    }
    state.productSpecOverrides = {};
    state.customItemDefinitions = [];
    delete state.metalPricePerKg;
    await this.saveState(state);
    await this.logActivity('System data reset performed.');
    return state;
  }
}
