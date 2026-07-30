import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { FinanceService } from './finance.service.js';
import { FinanceQueries } from './finance.queries.js';
import {
  SaleNotFoundError,
  PaymentNotFoundError,
  PaymentExceedsOutstandingError,
  InvoiceNumberConflictError,
  InvalidPaymentModeError,
} from './finance.errors.js';

jest.mock('../database/client', () => ({
  supabase: {
    from: jest.fn(() => ({
      insert: jest.fn(() => ({ error: null })),
    })),
  },
}));

function createMockSale(overrides: Record<string, any> = {}) {
  return {
    id: 'sale-1111-1111-1111-1111',
    invoice_number: 'INV-000001',
    quotation_id: null,
    customer_name: 'Tata Logistics',
    product_name: 'Flat Bed Trailer',
    amount: 850000,
    status: 'Pending',
    delivery_date: null,
    notes: null,
    created_by: 'actor-uuid-1',
    created_at: '2026-07-30T10:00:00Z',
    updated_at: '2026-07-30T10:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockPayment(overrides: Record<string, any> = {}) {
  return {
    id: 'pay-1111-1111-1111-1111',
    payment_number: 'PAY-000001',
    sale_id: 'sale-1111-1111-1111-1111',
    amount: 425000,
    mode: 'RTGS',
    reference: 'RTGS-REF-001',
    payment_date: '2026-08-01',
    notes: null,
    received_by: 'actor-uuid-1',
    created_at: '2026-08-01T12:00:00Z',
    updated_at: '2026-08-01T12:00:00Z',
    deleted_at: null,
    ...overrides,
  };
}

function createMockQueries() {
  return {
    findSales: jest.fn<any>(),
    findSaleById: jest.fn<any>(),
    findSaleByInvoice: jest.fn<any>(),
    getNextInvoiceNumber: jest.fn<any>(),
    createSale: jest.fn<any>(),
    updateSale: jest.fn<any>(),
    softDeleteSale: jest.fn<any>(),
    findPaymentsBySale: jest.fn<any>(),
    findPayments: jest.fn<any>(),
    findPaymentById: jest.fn<any>(),
    createPayment: jest.fn<any>(),
    updatePayment: jest.fn<any>(),
    softDeletePayment: jest.fn<any>(),
    getLedgerEntries: jest.fn<any>(),
    getTransactions: jest.fn<any>(),
    findAuditLogs: jest.fn<any>(),
    getMonthlyStats: jest.fn<any>(),
    getOutstandingBalances: jest.fn<any>(),
  };
}

describe('FinanceService', () => {
  let queries: ReturnType<typeof createMockQueries>;
  let service: FinanceService;
  const actorId = 'actor-uuid-1';

  beforeEach(() => {
    queries = createMockQueries();
    service = new FinanceService(queries as unknown as FinanceQueries);
  });

  /*** Sales ***/
  describe('listSales', () => {
    it('returns paginated sales with paid amounts', async () => {
      const rows = [createMockSale(), createMockSale({ id: 'sale-2', invoice_number: 'INV-000002', amount: 1200000 })];
      queries.findSales.mockResolvedValue({ data: rows, total: 2 });
      queries.findPaymentsBySale
        .mockResolvedValueOnce([{ amount: 425000 }])
        .mockResolvedValueOnce([{ amount: 600000 }]);

      const result = await service.listSales({ page: 1, perPage: 20 }, actorId);

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].invoiceNumber).toBe('INV-000001');
      expect(result.data[0].paidAmount).toBe(425000);
      expect(result.data[0].outstanding).toBe(425000);
    });
  });

  describe('getSaleById', () => {
    it('returns sale with payments detail', async () => {
      const sale = createMockSale();
      queries.findSaleById.mockResolvedValue(sale);
      queries.findPaymentsBySale.mockResolvedValue([createMockPayment()]);

      const result = await service.getSaleById(sale.id, actorId);

      expect(result.invoiceNumber).toBe('INV-000001');
      expect(result.payments).toHaveLength(1);
      expect(result.payments[0].amount).toBe(425000);
    });

    it('throws SaleNotFoundError when missing', async () => {
      queries.findSaleById.mockResolvedValue(null);
      await expect(service.getSaleById('bad', actorId)).rejects.toThrow(SaleNotFoundError);
    });
  });

  describe('createSale', () => {
    it('creates sale with auto-generated invoice number', async () => {
      queries.getNextInvoiceNumber.mockResolvedValue('INV-000001');
      queries.createSale.mockResolvedValue(createMockSale());

      const result = await service.createSale({
        customerName: 'Tata Logistics',
        productName: 'Flat Bed Trailer',
        amount: 850000,
      }, actorId);

      expect(queries.createSale).toHaveBeenCalled();
      expect(result.invoiceNumber).toBe('INV-000001');
      expect(result.status).toBe('Pending');
    });

    it('creates sale with custom invoice number', async () => {
      queries.findSaleByInvoice.mockResolvedValue(null);
      queries.createSale.mockResolvedValue(createMockSale({ invoice_number: 'INV-CUSTOM-001' }));

      const result = await service.createSale({
        customerName: 'Tata Logistics',
        productName: 'Flat Bed Trailer',
        amount: 850000,
        invoiceNumber: 'INV-CUSTOM-001',
      }, actorId);

      expect(queries.findSaleByInvoice).toHaveBeenCalledWith('INV-CUSTOM-001');
      expect(result.invoiceNumber).toBe('INV-CUSTOM-001');
    });

    it('throws InvoiceNumberConflictError for duplicate invoice', async () => {
      queries.findSaleByInvoice.mockResolvedValue({ id: 'existing' });

      await expect(service.createSale({
        customerName: 'Tata',
        productName: 'Trailer',
        amount: 1000,
        invoiceNumber: 'INV-EXISTING',
      }, actorId)).rejects.toThrow(InvoiceNumberConflictError);
    });
  });

  describe('updateSale', () => {
    it('updates sale fields', async () => {
      const sale = createMockSale();
      queries.findSaleById.mockResolvedValue(sale);
      queries.updateSale.mockResolvedValue({ ...sale, customer_name: 'Updated Customer' });
      queries.findPaymentsBySale.mockResolvedValue([]);

      const result = await service.updateSale(sale.id, { customerName: 'Updated Customer' }, actorId);

      expect(queries.updateSale).toHaveBeenCalled();
      expect(result.customerName).toBe('Updated Customer');
    });

    it('throws SaleNotFoundError when missing', async () => {
      queries.findSaleById.mockResolvedValue(null);
      await expect(service.updateSale('bad', {}, actorId)).rejects.toThrow(SaleNotFoundError);
    });
  });

  describe('softDeleteSale', () => {
    it('soft-deletes a sale', async () => {
      queries.findSaleById.mockResolvedValue(createMockSale());
      queries.softDeleteSale.mockResolvedValue(undefined);

      await service.softDeleteSale('sale-1111-1111-1111-1111', actorId);
      expect(queries.softDeleteSale).toHaveBeenCalled();
    });

    it('throws SaleNotFoundError when missing', async () => {
      queries.findSaleById.mockResolvedValue(null);
      await expect(service.softDeleteSale('bad', actorId)).rejects.toThrow(SaleNotFoundError);
    });
  });

  /*** Payments ***/
  describe('listPayments', () => {
    it('returns paginated payments with sale info', async () => {
      const rows = [{
        ...createMockPayment(),
        sales: { invoice_number: 'INV-000001', customer_name: 'Tata Logistics' },
      }];
      queries.findPayments.mockResolvedValue({ data: rows, total: 1 });

      const result = await service.listPayments({ page: 1, perPage: 20 }, actorId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].invoiceNumber).toBe('INV-000001');
      expect(result.data[0].paymentNumber).toBe('PAY-000001');
    });
  });

  describe('getPaymentById', () => {
    it('returns payment with sale info', async () => {
      const payment = {
        ...createMockPayment(),
        sales: { invoice_number: 'INV-000001', customer_name: 'Tata Logistics' },
      };
      queries.findPaymentById.mockResolvedValue(payment);

      const result = await service.getPaymentById(payment.id, actorId);

      expect(result.paymentNumber).toBe('PAY-000001');
      expect(result.amount).toBe(425000);
    });

    it('throws PaymentNotFoundError when missing', async () => {
      queries.findPaymentById.mockResolvedValue(null);
      await expect(service.getPaymentById('bad', actorId)).rejects.toThrow(PaymentNotFoundError);
    });
  });

  describe('createPayment', () => {
    it('creates payment and updates sale status to Partial', async () => {
      const sale = createMockSale();
      queries.findSaleById.mockResolvedValue(sale);
      queries.findPaymentsBySale.mockResolvedValue([]);
      queries.createPayment.mockResolvedValue(createMockPayment());
      queries.updateSale.mockResolvedValue({ ...sale, status: 'Partial' });

      const result = await service.createPayment({
        saleId: sale.id,
        amount: 425000,
        mode: 'RTGS',
      }, actorId);

      expect(queries.createPayment).toHaveBeenCalled();
      expect(queries.updateSale).toHaveBeenCalledWith(sale.id, { status: 'Partial' });
      expect(result.paymentNumber).toBe('PAY-000001');
    });

    it('updates sale status to Paid when fully paid', async () => {
      const sale = createMockSale({ amount: 425000 });
      queries.findSaleById.mockResolvedValue(sale);
      queries.findPaymentsBySale.mockResolvedValue([]);
      queries.createPayment.mockResolvedValue(createMockPayment({ amount: 425000 }));
      queries.updateSale.mockResolvedValue({ ...sale, status: 'Paid' });

      const result = await service.createPayment({
        saleId: sale.id,
        amount: 425000,
        mode: 'UPI',
      }, actorId);

      expect(queries.updateSale).toHaveBeenCalledWith(sale.id, { status: 'Paid' });
      expect(result.amount).toBe(425000);
    });

    it('throws PaymentExceedsOutstandingError', async () => {
      const sale = createMockSale({ amount: 1000 });
      queries.findSaleById.mockResolvedValue(sale);
      queries.findPaymentsBySale.mockResolvedValue([]);

      await expect(service.createPayment({
        saleId: sale.id,
        amount: 2000,
        mode: 'Cash',
      }, actorId)).rejects.toThrow(PaymentExceedsOutstandingError);
    });

    it('throws InvalidPaymentModeError', async () => {
      const sale = createMockSale();
      queries.findSaleById.mockResolvedValue(sale);
      queries.findPaymentsBySale.mockResolvedValue([]);

      await expect(service.createPayment({
        saleId: sale.id,
        amount: 500,
        mode: 'Bitcoin',
      }, actorId)).rejects.toThrow(InvalidPaymentModeError);
    });
  });

  describe('updatePayment', () => {
    it('updates payment and recalculates sale status', async () => {
      const payment = createMockPayment();
      const sale = createMockSale({ amount: 425000 });
      queries.findPaymentById.mockResolvedValue(payment);
      queries.updatePayment.mockResolvedValue({ ...payment, amount: 425000 });
      queries.findPaymentsBySale.mockResolvedValue([{ amount: 425000 }]);
      queries.findSaleById.mockResolvedValue(sale);

      const result = await service.updatePayment(payment.id, { amount: 425000 }, actorId);

      expect(queries.updateSale).toHaveBeenCalled();
      expect(result.amount).toBe(425000);
    });
  });

  describe('softDeletePayment', () => {
    it('soft-deletes payment and recalculates sale status', async () => {
      const payment = createMockPayment({ amount: 425000 });
      const sale = createMockSale({ amount: 425000 });
      queries.findPaymentById.mockResolvedValue(payment);
      queries.findPaymentsBySale.mockResolvedValue([]);
      queries.findSaleById.mockResolvedValue(sale);
      queries.softDeletePayment.mockResolvedValue(undefined);

      await service.softDeletePayment(payment.id, actorId);
      expect(queries.softDeletePayment).toHaveBeenCalled();
      expect(queries.updateSale).toHaveBeenCalledWith('sale-1111-1111-1111-1111', { status: 'Pending' });
    });
  });

  /*** Ledger ***/
  describe('getLedger', () => {
    it('returns unified ledger entries', async () => {
      queries.getLedgerEntries.mockResolvedValue({
        data: [
          { id: '1', date: '2026-07-30T10:00:00Z', type: 'sale', reference: 'INV-000001', customerName: 'Tata', productName: 'Trailer', debit: 850000, credit: 0, balance: 850000, description: null },
          { id: '2', date: '2026-08-01', type: 'payment', reference: 'PAY-000001', customerName: 'Tata', productName: 'Trailer', debit: 0, credit: 425000, balance: 425000, description: null },
        ],
        total: 2,
      });

      const result = await service.getLedger({ page: 1, perPage: 20 }, actorId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('sale');
      expect(result.data[1].type).toBe('payment');
    });
  });

  /*** Transactions ***/
  describe('getTransactions', () => {
    it('returns unified transactions', async () => {
      queries.getTransactions.mockResolvedValue({
        data: [
          { id: '1', date: '2026-07-30T10:00:00Z', type: 'Sale', referenceNumber: 'INV-000001', customerName: 'Tata', productName: 'Trailer', amount: 850000, mode: null, status: 'Pending', description: null },
          { id: '2', date: '2026-08-01', type: 'Payment', referenceNumber: 'PAY-000001', customerName: 'Tata', productName: 'Trailer', amount: 425000, mode: 'RTGS', status: null, description: null },
        ],
        total: 2,
      });

      const result = await service.getTransactions({ page: 1, perPage: 20 }, actorId);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('Sale');
    });
  });

  /*** Audit Logs ***/
  describe('getAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      queries.findAuditLogs.mockResolvedValue({
        data: [
          { id: 'log-1', employee_id: actorId, employees: { full_name: 'Admin User' }, action: 'create', entity_type: 'sale', entity_id: 'sale-1', description: 'create sale', metadata: {}, created_at: '2026-07-30T10:00:00Z' },
        ],
        total: 1,
      });

      const result = await service.getAuditLogs({ page: 1, perPage: 20 }, actorId);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].action).toBe('create');
      expect(result.data[0].employeeName).toBe('Admin User');
    });
  });

  /*** Stats ***/
  describe('getMonthlyStats', () => {
    it('returns monthly revenue stats', async () => {
      queries.getMonthlyStats.mockResolvedValue([
        { month: '2026-07-01', invoice_count: 5, payment_count: 3, total_collected: 2500000 },
      ]);

      const result = await service.getMonthlyStats(actorId);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('total_collected');
    });
  });

  describe('getOutstandingBalances', () => {
    it('returns outstanding balances', async () => {
      queries.getOutstandingBalances.mockResolvedValue([
        { customer_id: 'cus-1', customer_number: 'CUS-000001', company: 'Tata Logistics', outstanding: 850000 },
      ]);

      const result = await service.getOutstandingBalances(actorId);

      expect(result).toHaveLength(1);
      expect(result[0].company).toBe('Tata Logistics');
    });
  });
});
