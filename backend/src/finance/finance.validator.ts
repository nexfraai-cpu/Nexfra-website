import { z } from 'zod';

const validPaymentModes = ['Cash', 'RTGS', 'NEFT', 'Cheque', 'UPI', 'Card', 'Other'] as const;
const validSaleStatuses = ['Pending', 'Partial', 'Paid'] as const;

export const createSaleSchema = z.object({
  body: z.object({
    quotationId: z.string().uuid().nullable().optional(),
    customerName: z.string().min(1).max(200),
    productName: z.string().min(1).max(200),
    amount: z.coerce.number().min(1, 'Amount must be positive'),
    invoiceNumber: z.string().max(50).optional(),
    deliveryDate: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
});

export const updateSaleSchema = z.object({
  body: z.object({
    customerName: z.string().min(1).max(200).optional(),
    productName: z.string().min(1).max(200).optional(),
    amount: z.coerce.number().min(1).optional(),
    deliveryDate: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    invoiceNumber: z.string().max(50).optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const saleIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const saleSortBy = ['created_at', 'updated_at', 'customer_name', 'amount', 'status', 'invoice_number'] as const;

export const saleListSchema = z.object({
  query: z.object({
    status: z.enum(validSaleStatuses).optional(),
    search: z.string().max(100).optional(),
    sortBy: z.enum(saleSortBy).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const createPaymentSchema = z.object({
  body: z.object({
    saleId: z.string().uuid(),
    amount: z.coerce.number().min(1, 'Payment amount must be positive'),
    mode: z.enum(validPaymentModes, { message: 'Must be Cash, RTGS, Cheque, UPI, Card, or Other' }),
    reference: z.string().max(100).nullable().optional(),
    paymentDate: z.string().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
});

export const updatePaymentSchema = z.object({
  body: z.object({
    amount: z.coerce.number().min(1).optional(),
    mode: z.enum(validPaymentModes).optional(),
    reference: z.string().max(100).nullable().optional(),
    paymentDate: z.string().optional(),
    notes: z.string().max(500).nullable().optional(),
  }),
  params: z.object({ id: z.string().uuid() }),
});

export const paymentIdSchema = z.object({
  params: z.object({ id: z.string().uuid() }),
});

const paymentSortBy = ['created_at', 'payment_date', 'amount', 'mode'] as const;

export const paymentListSchema = z.object({
  query: z.object({
    saleId: z.string().uuid().optional(),
    mode: z.enum(validPaymentModes).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(paymentSortBy).optional().default('created_at'),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const ledgerListSchema = z.object({
  query: z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    customerName: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export const transactionListSchema = z.object({
  query: z.object({
    type: z.enum(['Sale', 'Payment']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    customerName: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

const auditEntityTypes = ['sale', 'payment'] as const;

export const auditLogListSchema = z.object({
  query: z.object({
    entityType: z.enum(auditEntityTypes).optional(),
    entityId: z.string().uuid().optional(),
    action: z.string().max(50).optional(),
    page: z.coerce.number().int().min(1).optional().default(1),
    perPage: z.coerce.number().int().min(1).max(100).optional().default(20),
  }),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>['body'];
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>['body'];
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>['body'];
export type SaleListQuery = z.infer<typeof saleListSchema>['query'];
export type PaymentListQuery = z.infer<typeof paymentListSchema>['query'];
export type LedgerListQuery = z.infer<typeof ledgerListSchema>['query'];
export type TransactionListQuery = z.infer<typeof transactionListSchema>['query'];
export type AuditLogListQuery = z.infer<typeof auditLogListSchema>['query'];
