import { FinanceQueries } from './finance.queries.js';
import {
  SaleNotFoundError,
  PaymentNotFoundError,
  PaymentExceedsOutstandingError,
  InvoiceNumberConflictError,
  InvalidPaymentModeError,
} from './finance.errors.js';
import {
  SaleResponse,
  SaleSummaryResponse,
  PaymentResponse,
  PaginatedResult,
  LedgerEntryResponse,
  TransactionResponse,
  FinanceAuditLogResponse,
} from './finance.types.js';
import { logger } from '../config/logger.js';
import { supabase } from '../database/client.js';
import { AuthenticatedUser } from '../middleware/auth.js';

const VALID_PAYMENT_MODES = ['Cash', 'RTGS', 'Cheque', 'UPI', 'Card', 'Other'];

export class FinanceService {
  constructor(private queries: FinanceQueries) {}

  /*** Sales ***/

  async listSales(
    options: { status?: string; search?: string; sortBy?: string; sortOrder?: string; page: number; perPage: number },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<SaleSummaryResponse>> {
    const { data, total } = await this.queries.findSales(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Sales listed');

    const result: SaleSummaryResponse[] = [];
    for (const row of data) {
      const payments = await this.queries.findPaymentsBySale((row as any).id, user);
      const paidAmount = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      result.push({
        id: (row as any).id,
        invoiceNumber: (row as any).invoice_number,
        customerName: (row as any).customer_name,
        productName: (row as any).product_name,
        amount: Number((row as any).amount),
        paidAmount,
        outstanding: Number((row as any).amount) - paidAmount,
        status: (row as any).status,
        createdAt: (row as any).created_at,
      });
    }

    return {
      data: result,
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  async getSaleById(id: string, user: AuthenticatedUser): Promise<SaleResponse> {
    const sale = await this.queries.findSaleById(id, user);
    if (!sale || (sale as any).deleted_at) throw new SaleNotFoundError(id);

    const payments = await this.queries.findPaymentsBySale(id, user);
    const paidAmount = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

    logger.info({ actorId: user.id, saleId: id }, 'Sale retrieved');
    return this._toSaleResponse(sale, payments, paidAmount);
  }

  async createSale(input: Record<string, unknown>, user: AuthenticatedUser): Promise<SaleResponse> {
    let invoiceNumber = input.invoiceNumber as string | undefined;
    if (!invoiceNumber) {
      invoiceNumber = await this.queries.getNextInvoiceNumber(user);
    } else {
      const existing = await this.queries.findSaleByInvoice(invoiceNumber, user);
      if (existing) throw new InvoiceNumberConflictError(invoiceNumber);
    }

    const sale = await this.queries.createSale({
      invoice_number: invoiceNumber,
      quotation_id: input.quotationId ?? null,
      customer_name: input.customerName,
      product_name: input.productName,
      amount: input.amount,
      status: 'Pending',
      delivery_date: input.deliveryDate ?? null,
      notes: input.notes ?? null,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    await this._logAudit(user.id, 'create', 'sale', sale.id as string, null, {
      invoiceNumber, amount: input.amount, customerName: input.customerName,
    });

    logger.info({ actorId: user.id, saleId: sale.id, invoiceNumber }, 'Sale created');
    return this._toSaleResponse(sale, [], 0);
  }

  async updateSale(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<SaleResponse> {
    const sale = await this.queries.findSaleById(id, user);
    if (!sale || (sale as any).deleted_at) throw new SaleNotFoundError(id);

    if (input.invoiceNumber) {
      const existing = await this.queries.findSaleByInvoice(input.invoiceNumber as string, user);
      if (existing && (existing as any).id !== id) throw new InvoiceNumberConflictError(input.invoiceNumber as string);
    }

    const oldData = { ...sale };
    const updates: Record<string, unknown> = { updated_by: user.id };
    const fieldMap: Record<string, string> = {
      customerName: 'customer_name', productName: 'product_name', amount: 'amount',
      deliveryDate: 'delivery_date', notes: 'notes', invoiceNumber: 'invoice_number',
    };
    for (const [ik, dbk] of Object.entries(fieldMap)) {
      if (input[ik] !== undefined) updates[dbk] = input[ik];
    }

    if (Object.keys(updates).length === 1) {
      const payments = await this.queries.findPaymentsBySale(id, user);
      const paidAmount = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
      return this._toSaleResponse(sale, payments, paidAmount);
    }

    const updated = await this.queries.updateSale(id, updates as any, user);
    const payments = await this.queries.findPaymentsBySale(id, user);
    const paidAmount = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);

    await this._logAudit(user.id, 'update', 'sale', id, oldData, updated);
    logger.info({ actorId: user.id, saleId: id }, 'Sale updated');
    return this._toSaleResponse(updated, payments, paidAmount);
  }

  async softDeleteSale(id: string, user: AuthenticatedUser): Promise<void> {
    const sale = await this.queries.findSaleById(id, user);
    if (!sale || (sale as any).deleted_at) throw new SaleNotFoundError(id);

    await this.queries.softDeleteSale(id, user);
    await this._logAudit(user.id, 'delete', 'sale', id, sale, { deleted: true });
    logger.info({ actorId: user.id, saleId: id }, 'Sale soft-deleted');
  }

  /*** Payments ***/

  async listPayments(
    options: { saleId?: string; mode?: string; startDate?: string; endDate?: string; sortBy?: string; sortOrder?: string; page: number; perPage: number },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<PaymentResponse>> {
    const { data, total } = await this.queries.findPayments(options as any, user);

    logger.info({ actorId: user.id, page: options.page, total }, 'Payments listed');
    return {
      data: data.map((r: any) => ({
        id: r.id, paymentNumber: r.payment_number, saleId: r.sale_id,
        amount: Number(r.amount), mode: r.mode, reference: r.reference ?? null,
        paymentDate: r.payment_date, notes: r.notes ?? null,
        receivedBy: r.received_by ?? null, createdAt: r.created_at, updatedAt: r.updated_at,
        invoiceNumber: r.sales?.invoice_number, customerName: r.sales?.customer_name,
      })),
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  async getPaymentById(id: string, user: AuthenticatedUser): Promise<PaymentResponse> {
    const payment = await this.queries.findPaymentById(id, user);
    if (!payment || (payment as any).deleted_at) throw new PaymentNotFoundError(id);
    logger.info({ actorId: user.id, paymentId: id }, 'Payment retrieved');
    return this._toPaymentResponse(payment);
  }

  async createPayment(input: Record<string, unknown>, user: AuthenticatedUser): Promise<PaymentResponse> {
    const sale = await this.queries.findSaleById(input.saleId as string, user);
    if (!sale || (sale as any).deleted_at) throw new SaleNotFoundError(input.saleId as string);

    const mode = input.mode as string;
    if (!VALID_PAYMENT_MODES.includes(mode)) throw new InvalidPaymentModeError(mode);

    const existingPayments = await this.queries.findPaymentsBySale(input.saleId as string, user);
    const paidSoFar = existingPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const saleAmount = Number((sale as any).amount);
    const newPaymentAmount = Number(input.amount);
    const newTotalPaid = paidSoFar + newPaymentAmount;

    if (newTotalPaid > saleAmount) {
      throw new PaymentExceedsOutstandingError(newPaymentAmount, saleAmount - paidSoFar);
    }

    const payment = await this.queries.createPayment({
      sale_id: input.saleId,
      amount: newPaymentAmount,
      mode,
      reference: input.reference ?? null,
      payment_date: input.paymentDate ?? new Date().toISOString().split('T')[0],
      notes: input.notes ?? null,
      received_by: user.id,
      created_by: user.id,
      updated_by: user.id,
    } as any);

    const newStatus = newTotalPaid >= saleAmount ? 'Paid' : 'Partial';
    await this.queries.updateSale(input.saleId as string, { status: newStatus } as any, user);

    await this._logAudit(user.id, 'create', 'payment', payment.id as string, null, {
      saleId: input.saleId, amount: newPaymentAmount, mode, newStatus,
    });

    logger.info({ actorId: user.id, paymentId: payment.id, saleId: input.saleId, newStatus }, 'Payment recorded');
    return this._toPaymentResponse(payment);
  }

  async updatePayment(id: string, input: Record<string, unknown>, user: AuthenticatedUser): Promise<PaymentResponse> {
    const payment = await this.queries.findPaymentById(id, user);
    if (!payment || (payment as any).deleted_at) throw new PaymentNotFoundError(id);

    const oldData = { ...payment };
    const updates: Record<string, unknown> = { updated_by: user.id };
    const fieldMap: Record<string, string> = {
      amount: 'amount', mode: 'mode', reference: 'reference',
      paymentDate: 'payment_date', notes: 'notes',
    };
    for (const [ik, dbk] of Object.entries(fieldMap)) {
      if (input[ik] !== undefined) updates[dbk] = input[ik];
    }

    if (Object.keys(updates).length === 1) return this._toPaymentResponse(payment);

    if (updates.mode && !VALID_PAYMENT_MODES.includes(updates.mode as string)) {
      throw new InvalidPaymentModeError(updates.mode as string);
    }

    const updated = await this.queries.updatePayment(id, updates as any, user);

    const saleId = (payment as any).sale_id;
    const allPayments = await this.queries.findPaymentsBySale(saleId, user);
    const sale = await this.queries.findSaleById(saleId, user);
    const paidAmount = allPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const saleAmount = sale ? Number((sale as any).amount) : 0;
    const newStatus = paidAmount >= saleAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending';
    await this.queries.updateSale(saleId, { status: newStatus } as any, user);

    await this._logAudit(user.id, 'update', 'payment', id, oldData, updated);
    logger.info({ actorId: user.id, paymentId: id }, 'Payment updated');
    return this._toPaymentResponse(updated);
  }

  async softDeletePayment(id: string, user: AuthenticatedUser): Promise<void> {
    const payment = await this.queries.findPaymentById(id, user);
    if (!payment || (payment as any).deleted_at) throw new PaymentNotFoundError(id);

    await this.queries.softDeletePayment(id, user);

    const saleId = (payment as any).sale_id;
    const allPayments = await this.queries.findPaymentsBySale(saleId, user);
    const sale = await this.queries.findSaleById(saleId, user);
    const paidAmount = allPayments.reduce((s: number, p: any) => s + Number(p.amount), 0);
    const saleAmount = sale ? Number((sale as any).amount) : 0;
    const newStatus = paidAmount >= saleAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Pending';
    await this.queries.updateSale(saleId, { status: newStatus } as any, user);

    await this._logAudit(user.id, 'delete', 'payment', id, payment, { deleted: true });
    logger.info({ actorId: user.id, paymentId: id }, 'Payment soft-deleted');
  }

  /*** Ledger ***/

  async getLedger(
    options: { startDate?: string; endDate?: string; customerName?: string; page: number; perPage: number },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<LedgerEntryResponse>> {
    const { data, total } = await this.queries.getLedgerEntries(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Ledger entries retrieved');
    return {
      data: data as unknown as LedgerEntryResponse[],
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  /*** Transactions ***/

  async getTransactions(
    options: { type?: string; startDate?: string; endDate?: string; customerName?: string; page: number; perPage: number },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<TransactionResponse>> {
    const { data, total } = await this.queries.getTransactions(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Transactions retrieved');
    return {
      data: data as unknown as TransactionResponse[],
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  /*** Audit Logs ***/

  async getAuditLogs(
    options: { entityType?: string; entityId?: string; action?: string; page: number; perPage: number },
    user: AuthenticatedUser,
  ): Promise<PaginatedResult<FinanceAuditLogResponse>> {
    const { data, total } = await this.queries.findAuditLogs(options as any, user);
    logger.info({ actorId: user.id, page: options.page, total }, 'Audit logs retrieved');
    return {
      data: data.map((r: any) => ({
        id: r.id,
        employeeId: r.employee_id ?? null,
        employeeName: r.employees?.full_name ?? null,
        action: r.action,
        entityType: r.entity_type,
        entityId: r.entity_id ?? null,
        description: r.description,
        metadata: r.metadata,
        createdAt: r.created_at,
      })),
      meta: { total, page: options.page, perPage: options.perPage, totalPages: Math.ceil(total / options.perPage) || 1 },
    };
  }

  /*** Stats & Outstanding ***/

  async getMonthlyStats(user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    const stats = await this.queries.getMonthlyStats();
    logger.info({ actorId: user.id }, 'Monthly stats retrieved');
    return stats;
  }

  async getOutstandingBalances(user: AuthenticatedUser): Promise<Record<string, unknown>[]> {
    const balances = await this.queries.getOutstandingBalances();
    logger.info({ actorId: user.id }, 'Outstanding balances retrieved');
    return balances;
  }

  /*** Private ***/

  private async _logAudit(actorId: string, action: string, entityType: string, entityId: string, oldValue: unknown, newValue: unknown) {
    const { error } = await supabase.from('audit_logs').insert({
      employee_id: actorId, action, entity_type: entityType, entity_id: entityId,
      description: `${action} ${entityType}`, metadata: { old: oldValue, new: newValue },
    });
    if (error) logger.error({ error, action, entityId }, 'Audit log insertion failed');
  }

  private _toSaleResponse(sale: any, payments: any[], paidAmount: number): SaleResponse {
    return {
      id: sale.id, invoiceNumber: sale.invoice_number, quotationId: sale.quotation_id ?? null,
      customerName: sale.customer_name, productName: sale.product_name,
      amount: Number(sale.amount), paidAmount, outstanding: Number(sale.amount) - paidAmount,
      status: sale.status, deliveryDate: sale.delivery_date ?? null, notes: sale.notes ?? null,
      createdBy: sale.created_by ?? null, createdAt: sale.created_at, updatedAt: sale.updated_at,
      payments: payments.map((p: any) => ({
        id: p.id, paymentNumber: p.payment_number,
        amount: Number(p.amount), mode: p.mode, paymentDate: p.payment_date, reference: p.reference ?? null,
      })),
    };
  }

  private _toPaymentResponse(p: any): PaymentResponse {
    return {
      id: p.id, paymentNumber: p.payment_number, saleId: p.sale_id,
      amount: Number(p.amount), mode: p.mode, reference: p.reference ?? null,
      paymentDate: p.payment_date, notes: p.notes ?? null,
      receivedBy: p.received_by ?? null, createdAt: p.created_at, updatedAt: p.updated_at,
      invoiceNumber: p.sales?.invoice_number, customerName: p.sales?.customer_name,
    };
  }
}
