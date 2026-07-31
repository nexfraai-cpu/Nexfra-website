export interface SpecValueInput {
  specKey: string;
  specName?: string;
  section?: string;
  selectedValue?: string | null;
  customDescription?: string | null;
  customPrice?: number | null;
  isNotRequired?: boolean;
  effectivePriceDiff?: number;
}

export interface CustomItemInput {
  name: string;
  description?: string | null;
  quantity?: number;
  price?: number;
  sortOrder?: number;
}

export interface CreateQuotationInput {
  customerId?: string | null;
  customerName: string;
  customerDetails?: Record<string, unknown>;
  productKey?: string | null;
  templateKey?: string | null;
  capacity?: string | null;
  dimensions?: Record<string, unknown>;
  manualTotal?: number | null;
  gstRate?: number;
  orderQty?: number;
  terms?: unknown[];
  scopeOfWork?: string | null;
  bankDetails?: Record<string, unknown>;
  notes?: string | null;
  specValues?: SpecValueInput[];
  customItems?: CustomItemInput[];
}

export interface UpdateQuotationInput {
  customerId?: string | null;
  customerName?: string;
  customerDetails?: Record<string, unknown>;
  productKey?: string | null;
  templateKey?: string | null;
  capacity?: string | null;
  dimensions?: Record<string, unknown>;
  manualTotal?: number | null;
  gstRate?: number;
  orderQty?: number;
  terms?: unknown[];
  scopeOfWork?: string | null;
  bankDetails?: Record<string, unknown>;
  notes?: string | null;
  specValues?: SpecValueInput[];
  customItems?: CustomItemInput[];
}

export interface SpecValueResponse {
  id: string;
  quotationId: string;
  specKey: string;
  specName: string;
  section: string;
  selectedValue: string | null;
  customDescription: string | null;
  customPrice: number | null;
  isNotRequired: boolean;
  effectivePriceDiff: number;
}

export interface CustomItemResponse {
  id: string;
  quotationId: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  sortOrder: number;
  createdAt: string;
}

export interface QuotationResponse {
  id: string;
  quotationNumber: string;
  version: number;
  customerId: string | null;
  customerName: string;
  customerDetails: Record<string, unknown>;
  productKey: string | null;
  templateKey: string | null;
  capacity: string | null;
  dimensions: Record<string, unknown>;
  total: number;
  manualTotal: number | null;
  gstRate: number;
  orderQty: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Denied';
  terms: unknown[];
  scopeOfWork: string | null;
  bankDetails: Record<string, unknown>;
  notes: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  deniedBy: string | null;
  deniedAt: string | null;
  deniedReason: string | null;
  financeOwner: string | null;
  paymentDueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  specValues: SpecValueResponse[];
  customItems: CustomItemResponse[];
}

export interface QuotationListOptions {
  status?: string;
  search?: string;
  customerName?: string;
  financeView?: 'inbox' | 'mine';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface QuotationSummaryResponse {
  id: string;
  quotationNumber: string;
  version: number;
  customerName: string;
  productKey: string | null;
  templateKey: string | null;
  total: number;
  status: string;
  orderQty: number;
  financeOwner: string | null;
  paymentDueDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    perPage: number;
    totalPages: number;
  };
}

export interface ApprovalInput {
  comment?: string;
}

export interface DenyInput {
  reason: string;
}
