export interface ChassisRecordResponse {
  id: string;
  workOrderId: string | null;
  workOrderNumber: string | null;
  customerId: string | null;
  field: string | null;
  brand: string | null;
  model: string | null;
  chassisNumber: string | null;
  arrivalDate: string | null;
  outDate: string | null;
  customerName: string | null;
  productName: string | null;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChassisInput {
  workOrderId: string | null;
  field?: string | null;
  brand?: string | null;
  model?: string | null;
  chassisNumber?: string | null;
  arrivalDate?: string | null;
  outDate?: string | null;
  notes?: string | null;
}

export interface UpdateChassisInput {
  workOrderId?: string | null;
  field?: string | null;
  brand?: string | null;
  model?: string | null;
  chassisNumber?: string | null;
  arrivalDate?: string | null;
  outDate?: string | null;
  notes?: string | null;
}