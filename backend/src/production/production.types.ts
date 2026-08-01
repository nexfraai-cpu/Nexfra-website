export interface ProductionItemResponse {
  id: string;
  workOrderId: string;
  quotationId: string | null;
  quotationNumber: string | null;
  currentStage: string;
  boardColumn: 'Not Started' | 'Work in Progress' | 'Finished';
  progressPercentage: number;
  completedStages: string[];
  completedStageCount: number;
  totalStages: number;
  isFinished: boolean;
  stageProgress: Record<string, unknown>;
  stageRecords: StageRecordResponse[];
  dispatchFields: Record<string, unknown>;
  startedAt: string | null;
  completedAt: string | null;
  workOrderNumber?: string;
  customerName?: string;
  productName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionItemDetailResponse extends ProductionItemResponse {
  chassisRecords: ChassisRecordResponse[];
}

export interface StageRecordResponse {
  id: string;
  productionItemId: string;
  stageKey: string;
  stageName: string;
  isCompleted: boolean;
  completedBy: string | null;
  completedAt: string | null;
  remark: string | null;
  createdAt: string;
}

export interface ChassisRecordResponse {
  id: string;
  workOrderId: string | null;
  customerId: string | null;
  field: string | null;
  brand: string | null;
  model: string | null;
  chassisNumber: string | null;
  arrivalDate: string | null;
  customerName: string | null;
  productName: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdvanceStageInput {
  stageKey?: string;
  remark?: string | null;
}

export interface UpdateProductionItemInput {
  dispatchFields?: Record<string, unknown>;
  productionStages?: { stageKey: string; stageName?: string; isCompleted: boolean }[];
}

export interface CreateChassisInput {
  field?: string | null;
  brand?: string | null;
  model?: string | null;
  chassisNumber?: string | null;
  arrivalDate?: string | null;
  customerName?: string | null;
  productName?: string | null;
  notes?: string | null;
}

export interface UpdateChassisInput {
  field?: string | null;
  brand?: string | null;
  model?: string | null;
  chassisNumber?: string | null;
  arrivalDate?: string | null;
  notes?: string | null;
}

export interface ProductionListOptions {
  stage?: string;
  workOrderId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page: number;
  perPage: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; page: number; perPage: number; totalPages: number };
}
