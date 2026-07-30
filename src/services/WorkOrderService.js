import { BaseService } from './BaseService.js';

export class WorkOrderService extends BaseService {
  async getAll() {
    const state = await this.loadState();
    return state.workOrders || [];
  }

  async getById(id) {
    const state = await this.loadState();
    return (state.workOrders || []).find(w => w.id === id) || null;
  }

  async getByQuoteId(quoteId) {
    const state = await this.loadState();
    return (state.workOrders || []).find(w => w.quoteId === quoteId) || null;
  }

  async create(data) {
    const state = await this.loadState();
    state.quotationCounter = (state.quotationCounter || 0) + 1;
    const year = new Date().getFullYear();
    const woId = `WO-${year}-${String(state.quotationCounter).padStart(3, '0')}`;

    const wo = {
      id: woId,
      quoteId: data.quoteId || '',
      customerName: data.customerName || '',
      product: data.product || '',
      date: data.date || new Date().toISOString().split('T')[0],
      stage: 'Pending',
      progress: 0,
      specs: data.specs || [],
      notes: data.notes || '',
      dueDate: null,
      urgent: false,
      _collapsed: true
    };

    if (!state.workOrders) state.workOrders = [];
    state.workOrders.push(wo);
    await this.saveState(state);
    await this.logActivity(`Work Order ${woId} created.`);
    return wo;
  }

  async update(id, data) {
    const state = await this.loadState();
    const wo = state.workOrders.find(w => w.id === id);
    if (!wo) throw new Error(`Work Order ${id} not found`);
    Object.assign(wo, data);
    await this.saveState(state);
    return wo;
  }

  async setDueDate(id, dueDate) {
    const state = await this.loadState();
    const wo = state.workOrders.find(w => w.id === id);
    if (!wo) throw new Error(`Work Order ${id} not found`);
    wo.dueDate = dueDate;
    await this.saveState(state);
    return wo;
  }

  async toggleUrgent(id) {
    const state = await this.loadState();
    const wo = state.workOrders.find(w => w.id === id);
    if (!wo) throw new Error(`Work Order ${id} not found`);
    wo.urgent = !wo.urgent;
    await this._syncProductionItemUrgent(state, wo);
    await this.saveState(state);
    return wo;
  }

  async _syncProductionItemUrgent(state, wo) {
    if (!state.productionItems) state.productionItems = [];
    const prod = state.productionItems.find(p => p.quoteId === wo.quoteId);
    if (prod) prod.urgent = wo.urgent;
  }

  async toggleCollapse(id) {
    const state = await this.loadState();
    const wo = state.workOrders.find(w => w.id === id);
    if (!wo) return;
    wo._collapsed = wo._collapsed !== false ? false : true;
    await this.saveState(state);
  }

  async ensureProductionItem(quoteId, dueDate) {
    const state = await this.loadState();
    if (!state.productionItems) state.productionItems = [];
    if (state.productionItems.find(p => p.quoteId === quoteId)) return;
    const quote = (state.quotations || []).find(q => q.id === quoteId);
    const wo = (state.workOrders || []).find(w => w.quoteId === quoteId);
    state.productionItems.push({
      id: quoteId,
      quoteId,
      customerName: quote ? quote.customerName : (wo ? wo.customerName : 'Client'),
      product: quote ? quote.productName : (wo ? wo.product : 'Custom Body'),
      date: quote ? quote.date : (wo ? wo.date : new Date().toISOString().split('T')[0]),
      columnStatus: 'Not Started',
      progressPct: 0,
      progressionMap: {},
      remarks: {},
      dueDate,
      urgent: wo ? !!wo.urgent : false
    });
    await this.saveState(state);
  }

  async getProductionItems() {
    const state = await this.loadState();
    return state.productionItems || [];
  }

  async updateProductionItem(quoteId, data) {
    const state = await this.loadState();
    if (!state.productionItems) state.productionItems = [];
    const item = state.productionItems.find(p => p.quoteId === quoteId);
    if (item) {
      Object.assign(item, data);
      await this.saveState(state);
    }
  }

  async getChassisRecords() {
    const state = await this.loadState();
    return state.chassisRecords || [];
  }

  async addChassisRecord(data) {
    const state = await this.loadState();
    if (!state.chassisRecords) state.chassisRecords = [];
    const id = 'CH-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    const record = {
      id,
      field: data.field || '',
      brand: data.brand || '',
      model: data.model || '',
      brandModel: data.brand + (data.model ? ' / ' + data.model : ''),
      workOrderId: data.workOrderId || '',
      chassisNumber: data.chassisNumber || '',
      arrivalDate: data.arrivalDate || new Date().toISOString().split('T')[0],
      outDate: data.outDate || ''
    };
    state.chassisRecords.push(record);
    await this.saveState(state);
    await this.logActivity(`Chassis ${data.chassisNumber} registered.`);
    return record;
  }

  async updateChassisRecord(id, data) {
    const state = await this.loadState();
    const rec = (state.chassisRecords || []).find(c => c.id === id);
    if (!rec) throw new Error(`Chassis record ${id} not found`);
    Object.assign(rec, data);
    await this.saveState(state);
    return rec;
  }

  async deleteChassisRecord(id) {
    const state = await this.loadState();
    state.chassisRecords = (state.chassisRecords || []).filter(c => c.id !== id);
    await this.saveState(state);
  }
}
