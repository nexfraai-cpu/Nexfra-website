// Database row types — generated from Supabase schema or written manually.
// These mirror the PostgreSQL tables defined in supabase/migrations/20260731000001_schema.sql.

export interface Database {
  public: {
    Tables: {
      employees: EmployeeRow;
      customers: CustomerRow;
      products: ProductRow;
      product_templates: ProductTemplateRow;
      product_template_specs: ProductTemplateSpecRow;
      product_spec_options: ProductSpecOptionRow;
      quotations: QuotationRow;
      quotation_spec_values: QuotationSpecValueRow;
      quotation_custom_items: QuotationCustomItemRow;
      work_orders: WorkOrderRow;
      production_items: ProductionItemRow;
      production_stage_records: ProductionStageRecordRow;
      chassis_records: ChassisRecordRow;
      sales: SaleRow;
      payments: PaymentRow;
      audit_logs: AuditLogRow;
      settings: SettingRow;
    };
  };
}

export interface EmployeeRow {
  id: string;
  auth_id: string | null;
  employee_number: string;
  full_name: string;
  email: string;
  phone: string | null;
  employee_code: string | null;
  role: 'admin' | 'sales' | 'finance' | 'manager';
  status: 'Active' | 'Disabled';
  last_login_at: string | null;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  deleted_at: string | null;
}

export interface CustomerRow {
  id: string;
  customer_number: string;
  name: string;
  company: string;
  gst: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  vehicles: unknown;
  outstanding: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface ProductRow {
  id: string;
  key: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  created_by: string | null;
  updated_at: string;
  updated_by: string | null;
}

export interface ProductTemplateRow {
  id: string;
  product_id: string;
  key: string;
  name: string;
  base_price: number;
  dimensions: unknown;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductTemplateSpecRow {
  id: string;
  template_id: string;
  spec_key: string;
  name: string;
  section: string;
  spec_type: string;
  default_value: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSpecOptionRow {
  id: string;
  spec_id: string;
  option_name: string;
  price_diff: number;
  is_default: boolean;
  sort_order: number;
  created_at: string;
}

export interface QuotationRow {
  id: string;
  quotation_number: string;
  version: number;
  customer_id: string | null;
  customer_name: string;
  customer_details: unknown;
  product_key: string | null;
  template_key: string | null;
  capacity: string | null;
  dimensions: unknown;
  total: number;
  manual_total: number | null;
  gst_rate: number;
  order_qty: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Denied';
  terms: unknown;
  scope_of_work: string | null;
  bank_details: unknown;
  notes: string | null;
  approved_by: string | null;
  approved_at: string | null;
  denied_by: string | null;
  denied_at: string | null;
  denied_reason: string | null;
  created_by: string | null;
  assigned_to_employee_id: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface QuotationSpecValueRow {
  id: string;
  quotation_id: string;
  spec_key: string;
  spec_name: string;
  section: string;
  selected_value: string | null;
  custom_description: string | null;
  custom_price: number | null;
  is_not_required: boolean;
  effective_price_diff: number;
}

export interface QuotationCustomItemRow {
  id: string;
  quotation_id: string;
  name: string;
  description: string | null;
  quantity: number;
  price: number;
  sort_order: number;
  created_at: string;
}

export interface WorkOrderRow {
  id: string;
  work_order_number: string;
  version: number;
  quotation_id: string | null;
  customer_name: string;
  product_name: string;
  specifications: unknown;
  dimensions: unknown;
  colour: string | null;
  quantity: number;
  factory_notes: string | null;
  due_date: string | null;
  is_urgent: boolean;
  status: string;
  booked_by: string | null;
  approved_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface ProductionItemRow {
  id: string;
  work_order_id: string;
  quotation_id: string | null;
  current_stage: string;
  stage_progress: unknown;
  dispatch_fields: unknown;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface ProductionStageRecordRow {
  id: string;
  production_item_id: string;
  stage_key: string;
  stage_name: string;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  remark: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SaleRow {
  id: string;
  invoice_number: string;
  quotation_id: string | null;
  customer_name: string;
  product_name: string;
  amount: number;
  status: 'Pending' | 'Partial' | 'Paid';
  delivery_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface PaymentRow {
  id: string;
  payment_number: string;
  sale_id: string;
  amount: number;
  mode: 'Cash' | 'RTGS' | 'Cheque' | 'UPI' | 'Card' | 'Other';
  reference: string | null;
  payment_date: string;
  notes: string | null;
  received_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface ChassisRecordRow {
  id: string;
  work_order_id: string | null;
  customer_id: string | null;
  field: string | null;
  brand: string | null;
  model: string | null;
  chassis_number: string | null;
  arrival_date: string | null;
  customer_name: string | null;
  product_name: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  updated_by: string | null;
  deleted_at: string | null;
}

export interface AuditLogRow {
  id: string;
  employee_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_value: unknown;
  new_value: unknown;
  ip_address: string | null;
  created_at: string;
}

export interface SettingRow {
  id: string;
  key: string;
  value: unknown;
  updated_at: string;
}
