import { BaseService } from './BaseService.js';
import { CustomerService } from './CustomerService.js';

export class QuotationService extends BaseService {
  constructor() {
    super();
    this.customerService = new CustomerService();
  }

  async getAll() {
    const state = await this.loadState();
    return state.quotations || [];
  }

  async getById(id) {
    const state = await this.loadState();
    return (state.quotations || []).find(q => q.id === id) || null;
  }

  async create(data) {
    const state = await this.loadState();
    state.quotationCounter = (state.quotationCounter || 0) + 1;
    const initials = this._getInitials(data.customerName);
    const year = new Date().getFullYear();
    const quoteId = `${initials}/${String(state.quotationCounter).padStart(3, '0')}/${year}`;

    let client = await this.customerService.getByCompany(data.company);
    if (!client) {
      client = await this.customerService.create(data);
    }

    const newQuote = {
      id: quoteId,
      subtype: data.subtype || 'flatbed',
      customerId: client.id,
      customerName: client.company || client.name,
      model: data.model || 'Commercial Vehicle',
      productName: data.productName || 'Custom Vehicle',
      date: data.date || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      total: data.total || 0,
      status: 'Pending Approval',
      specs: data.specs || {},
      notRequired: data.notRequired || {},
      capacity: data.capacity || 'NA',
      dimensions: data.dimensions || {},
      scopeOfWork: data.scopeOfWork || 'As Mentioned above',
      terms: data.terms || [],
      orderQty: data.orderQty || 1,
      bankDetails: data.bankDetails || {}
    };

    if (!state.quotations) state.quotations = [];
    state.quotations.push(newQuote);
    await this.saveState(state);
    await this.logActivity(`Quotation ${quoteId} generated.`);
    return newQuote;
  }

  async update(id, data) {
    const state = await this.loadState();
    const quote = state.quotations.find(q => q.id === id);
    if (!quote) throw new Error(`Quotation ${id} not found`);
    Object.assign(quote, data);
    await this.saveState(state);
    await this.logActivity(`Quotation ${id} updated.`);
    return quote;
  }

  async approve(id) {
    const state = await this.loadState();
    const quote = state.quotations.find(q => q.id === id);
    if (!quote) throw new Error(`Quotation ${id} not found`);
    quote.status = 'Approved';
    await this.saveState(state);
    await this.logActivity(`Quotation ${id} approved.`);
    return quote;
  }

  async deny(id) {
    const state = await this.loadState();
    const quote = state.quotations.find(q => q.id === id);
    if (!quote) throw new Error(`Quotation ${id} not found`);
    quote.status = 'Denied';
    await this.saveState(state);
    await this.logActivity(`Quotation ${id} denied.`);
    return quote;
  }

  async delete(id) {
    const state = await this.loadState();
    state.quotations = (state.quotations || []).filter(q => q.id !== id);
    await this.saveState(state);
    await this.logActivity(`Quotation ${id} deleted.`);
  }

  async getNextCounter() {
    const state = await this.loadState();
    return (state.quotationCounter || 0) + 1;
  }

  _getInitials(name) {
    if (!name) return 'XX';
    const parts = name.trim().split(/\s+/);
    const first = parts[0]?.charAt(0).toUpperCase() || 'X';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0).toUpperCase() : 'X';
    return first + last;
  }
}
