export interface CreateWorkOrderInput {
  quotationId: string;
  factoryNotes?: string | null;
  dueDate?: string | null;
  isUrgent?: boolean;
}

export interface UpdateWorkOrderInput {
  factoryNotes?: string | null;
  dueDate?: string | null;
  isUrgent?: boolean;
  status?: string;
}

export interface WorkOrderResponse {
  id: string;
  workOrderNumber: string;
  version: number;
  quotationId: string | null;
  quotationNumber: string | null;
  customerName: string;
  productName: string;
  specifications: Record<string, unknown>;
  dimensions: Record<string, unknown>;
  colour: string | null;
  quantity: number;
  factoryNotes: string | null;
  dueDate: string | null;
  isUrgent: boolean;
  status: string;
  bookedBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  productionItems: ProductionItemRef[];
}

export interface WorkOrderSummaryResponse {
  id: string;
  workOrderNumber: string;
  quotationId: string | null;
  quotationNumber: string | null;
  customerName: string;
  productName: string;
  quantity: number;
  status: string;
  dueDate: string | null;
  isUrgent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionItemRef {
  id: string;
  currentStage: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface WorkOrderListOptions {
  status?: string;
  search?: string;
  urgent?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}
