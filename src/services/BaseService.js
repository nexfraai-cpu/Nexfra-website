import { getStorageProvider } from '../storage/index.js';
import { CONFIG } from '../config.js';

export class BaseService {
  constructor() {
    this.storage = getStorageProvider();
    this.stateKey = CONFIG.STORAGE_KEYS.ERP_STATE;
  }

  async loadState() {
    const state = await this.storage.getJSON(this.stateKey) || {};
    this._ensureDefaults(state);
    return state;
  }

  async saveState(state) {
    await this.storage.setJSON(this.stateKey, state);
  }

  _ensureDefaults(state) {
    if (!state.customers) state.customers = [];
    if (!state.quotations) state.quotations = [];
    if (!state.workOrders) state.workOrders = [];
    if (!state.productionItems) state.productionItems = [];
    if (!state.sales) state.sales = [];
    if (!state.payments) state.payments = [];
    if (!state.employees) state.employees = [];
    if (!state.logs) state.logs = [];
    if (!state.customItemDefinitions) state.customItemDefinitions = [];
    if (!state.chassisRecords) state.chassisRecords = [];
    if (!state.employeeCounter) state.employeeCounter = 0;
    if (!state.quotationCounter) state.quotationCounter = 0;
    if (!state.adminPricing) state.adminPricing = {};
    if (!state.productSpecOverrides) state.productSpecOverrides = {};
  }

  async logActivity(message) {
    const state = await this.loadState();
    if (!state.logs) state.logs = [];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    state.logs.unshift({ time, message });
    if (state.logs.length > CONFIG.MAX_LOG_ENTRIES) state.logs.pop();
    await this.saveState(state);
  }
}
