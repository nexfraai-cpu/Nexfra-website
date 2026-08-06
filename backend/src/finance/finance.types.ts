export interface CreateSaleInput {
  quotationId?: string | null;
  customerName: string;
  productName: string;
  amount: number;
  invoiceNumber?: string;
  deliveryDate?: string | null;
  notes?: string | null;
}

export interface UpdateSaleInput {
  customerName?: string;
  productName?: string;
  amount?: number;
  deliveryDate?: string | null;
  notes?: string | null;
  invoiceNumber?: string;
}

export interface SaleResponse {
  id: string;
  invoiceNumber: string;
  quotationId: string | null;
  customerName: string;
  productName: string;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: 'Pending' | 'Partial' | 'Paid';
  deliveryDate: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  payments: PaymentSummary[];
}

export interface SaleSummaryResponse {
  id: string;
  invoiceNumber: string;
  quotationId: string | null;
  customerName: string;
  productName: string;
  amount: number;
  paidAmount: number;
  outstanding: number;
  status: string;
  createdAt: string;
}

export interface PaymentSummary {
  id: string;
  paymentNumber: string;
  amount: number;
  mode: string;
  paymentDate: string;
  reference: string | null;
}

export interface CreatePaymentInput {
  saleId: string;
  amount: number;
  mode: 'Cash' | 'RTGS' | 'Cheque' | 'UPI' | 'Card' | 'Other';
  reference?: string | null;
  paymentDate?: string;
  notes?: string | null;
}

export interface UpdatePaymentInput {
  amount?: number;
  mode?: 'Cash' | 'RTGS' | 'Cheque' | 'UPI' | 'Card' | 'Other';
  reference?: string | null;
  paymentDate?: string;
  notes?: string | null;
}

export interface PaymentResponse {
  id: string;
  paymentNumber: string;
  saleId: string;
  amount: number;
  mode: string;
  reference: string | null;
  paymentDate: string;
  notes: string | null;
  receivedBy: string | null;
  createdAt: string;
  updatedAt: string;
  invoiceNumber?: string;
  customerName?: string;
}

export interface LedgerEntryResponse {
  id: string;
  date: string;
  type: 'sale' | 'payment';
  reference: string;
  customerName: string;
  productName: string;
  debit: number;
  credit: number;
  balance: number;
  description: string | null;
}

export interface TransactionResponse {
  id: string;
  date: string;
  type: 'Sale' | 'Payment';
  referenceNumber: string;
  customerName: string;
  productName: string | null;
  amount: number;
  mode: string | null;
  status: string | null;
  description: string | null;
}

export interface FinanceAuditLogResponse {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: unknown;
  createdAt: string;
}

export interface MonthlyStatsResponse {
  month: string;
  invoiceCount: number;
  paymentCount: number;
  totalCollected: number;
}

export interface OutstandingResponse {
  customerId: string;
  customerNumber: string;
  company: string;
  outstanding: number;
}

export interface SaleListOptions {
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface PaymentListOptions {
  saleId?: string;
  mode?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface LedgerListOptions {
  startDate?: string;
  endDate?: string;
  customerName?: string;
  page: number;
  perPage: number;
}

export interface TransactionListOptions {
  type?: 'Sale' | 'Payment';
  startDate?: string;
  endDate?: string;
  customerName?: string;
  page: number;
  perPage: number;
}

export interface AuditLogListOptions {
  entityType?: string;
  entityId?: string;
  action?: string;
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}
