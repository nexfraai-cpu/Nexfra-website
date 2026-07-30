import { BaseService } from './BaseService.js';

export class CustomerService extends BaseService {
  async getAll() {
    const state = await this.loadState();
    return state.customers || [];
  }

  async getById(id) {
    const state = await this.loadState();
    return (state.customers || []).find(c => c.id === id) || null;
  }

  async getByCompany(company) {
    const state = await this.loadState();
    return (state.customers || []).find(c =>
      c.company?.toLowerCase() === (company || '').toLowerCase()
    ) || null;
  }

  async create(data) {
    const state = await this.loadState();
    const id = 'CUST-' + String((state.customers || []).length + 1).padStart(3, '0');
    const customer = {
      id,
      name: data.name || '',
      company: data.company || data.name || '',
      gst: data.gst || 'Pending',
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      vehicles: data.vehicles || [],
      outstanding: 0
    };
    if (!state.customers) state.customers = [];
    state.customers.push(customer);
    await this.saveState(state);
    await this.logActivity(`Customer created: ${customer.company}`);
    return customer;
  }

  async update(id, data) {
    const state = await this.loadState();
    const customer = state.customers.find(c => c.id === id);
    if (!customer) throw new Error(`Customer ${id} not found`);
    Object.assign(customer, data);
    await this.saveState(state);
    return customer;
  }

  async recalculateOutstanding() {
    const state = await this.loadState();
    (state.customers || []).forEach(cust => {
      const custSales = (state.sales || []).filter(sale => sale.customerName === cust.company);
      let due = 0;
      custSales.forEach(sale => {
        const totalPaid = (state.payments || [])
          .filter(p => p.invoiceId === sale.invoiceId)
          .reduce((sum, p) => sum + p.amount, 0);
        due += Math.max(0, sale.amount - totalPaid);
      });
      cust.outstanding = due;
    });
    await this.saveState(state);
  }
}
