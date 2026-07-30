import { BaseService } from './BaseService.js';

export class FinanceService extends BaseService {
  async getAllSales() {
    const state = await this.loadState();
    return state.sales || [];
  }

  async getAllPayments() {
    const state = await this.loadState();
    return state.payments || [];
  }

  async addSale(data) {
    const state = await this.loadState();
    if (!state.sales) state.sales = [];
    const sale = {
      invoiceId: data.invoiceId || `INV-${Date.now()}`,
      customerName: data.customerName || '',
      product: data.product || '',
      amount: data.amount || 0,
      date: data.date || new Date().toISOString().split('T')[0],
      status: 'Pending'
    };
    state.sales.push(sale);
    await this.saveState(state);
    await this.logActivity(`Sale ${sale.invoiceId} recorded.`);
    return sale;
  }

  async addPayment(data) {
    const state = await this.loadState();
    if (!state.payments) state.payments = [];
    const payment = {
      id: `PAY-${Date.now()}`,
      invoiceId: data.invoiceId || '',
      amount: data.amount || 0,
      mode: data.mode || 'Cash',
      date: data.date || new Date().toISOString().split('T')[0],
      notes: data.notes || ''
    };
    state.payments.push(payment);
    await this.saveState(state);
    await this.logActivity(`Payment of ₹${data.amount} recorded for ${data.invoiceId}.`);
    return payment;
  }

  async recalculateStatuses() {
    const state = await this.loadState();
    (state.sales || []).forEach(sale => {
      const totalPaid = (state.payments || [])
        .filter(p => p.invoiceId === sale.invoiceId)
        .reduce((sum, p) => sum + p.amount, 0);
      const balance = Math.max(0, sale.amount - totalPaid);
      if (balance <= 0) sale.status = 'Paid';
      else if (totalPaid > 0) sale.status = 'Partial';
      else sale.status = 'Pending';
    });
    await this.saveState(state);
  }

  async getMonthlyStats() {
    const state = await this.loadState();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    const prevMonth = thisMonth === 0 ? 11 : thisMonth - 1;
    const prevYear = thisMonth === 0 ? thisYear - 1 : thisYear;

    const payments = state.payments || [];
    const thisMonthPayments = payments.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });
    const prevMonthPayments = payments.filter(p => {
      const d = new Date(p.date);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    return {
      thisMonth: thisMonthPayments.reduce((s, p) => s + p.amount, 0),
      prevMonth: prevMonthPayments.reduce((s, p) => s + p.amount, 0)
    };
  }

  async getOutstandingBalance() {
    const state = await this.loadState();
    let total = 0;
    (state.customers || []).forEach(c => total += (c.outstanding || 0));
    return total;
  }
}
