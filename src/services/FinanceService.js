import { apiClient } from '../api/client.js';

const PER_PAGE = 100;

function saleToLegacy(sale) {
  return {
    id: sale.id,
    invoiceId: sale.invoiceNumber,
    customerName: sale.customerName,
    product: sale.productName,
    amount: sale.amount ?? 0,
    paidAmount: sale.paidAmount ?? 0,
    outstanding: sale.outstanding ?? 0,
    date: (sale.createdAt || '').split('T')[0],
    status: sale.status || 'Pending',
    _backendId: sale.id,
  };
}

function paymentToLegacy(payment) {
  return {
    id: payment.id,
    invoiceId: payment.invoiceNumber || payment.saleId,
    saleId: payment.saleId,
    quoteId: payment.saleId,
    amount: payment.amount ?? 0,
    mode: payment.mode || 'Cash',
    date: (payment.paymentDate || payment.createdAt || '').split('T')[0],
    time: new Date(payment.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ref: payment.reference || '',
    notes: payment.notes || '',
    _backendId: payment.id,
  };
}

export class FinanceService {
  async getSales() {
    const rows = [];
    let page = 1;
    let total = Infinity;
    while (rows.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/finance/sales?page=${page}&perPage=${PER_PAGE}`,
      );
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return rows.map(saleToLegacy);
  }

  async getPayments() {
    const rows = [];
    let page = 1;
    let total = Infinity;
    while (rows.length < total) {
      const { data, meta } = await apiClient.get(
        `/api/finance/payments?page=${page}&perPage=${PER_PAGE}`,
      );
      rows.push(...(data || []));
      total = meta?.total ?? rows.length;
      if (!data || data.length < PER_PAGE) break;
      page += 1;
    }
    return rows.map(paymentToLegacy);
  }

  async hydrate() {
    const [sales, payments] = await Promise.all([this.getSales(), this.getPayments()]);
    return { sales, payments };
  }

  async addSale(data) {
    const { data: created } = await apiClient.post('/api/finance/sales', {
      customerName: data.customerName,
      productName: data.product || data.productName,
      amount: data.amount,
      invoiceNumber: data.invoiceId && !String(data.invoiceId).startsWith('INV-')
        ? data.invoiceId
        : undefined,
      deliveryDate: data.deliveryDate || null,
      notes: data.notes || null,
    });
    return saleToLegacy(created);
  }

  async addPayment(data) {
    const { data: created } = await apiClient.post('/api/finance/payments', {
      saleId: data.saleId || data._backendSaleId,
      amount: data.amount,
      mode: data.mode || 'Cash',
      reference: data.ref || data.reference || null,
      paymentDate: data.date || null,
      notes: data.notes || null,
    });
    return paymentToLegacy(created);
  }
}
