// Database row types — generated from Supabase schema or written manually.
// These mirror the PostgreSQL tables defined in supabase/migrations/20260731000001_schema.sql.

export interface Database {
  public: {
    Tables: {
      employees: EmployeeRow;
      customers: CustomerRow;
      product_templates: ProductTemplateRow;
      product_template_specs: ProductTemplateSpecRow;
      product_spec_options: ProductSpecOptionRow;
      quotations: QuotationRow;
      quotation_spec_values: QuotationSpecValueRow;
      quotation_custom_items: QuotationCustomItemRow;
      work_orders: WorkOrderRow;
      production_items: ProductionItemRow;
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
  deleted_at: string | null;
}

export interface ProductTemplateRow {
  id: string;
  product_key: string;
  name: string;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductTemplateSpecRow {
  id: string;
  template_id: string;
  spec_key: string;
  label: string;
  control_type: string;
  unit: string | null;
  placeholder: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProductSpecOptionRow {
  id: string;
  spec_id: string;
  label: string;
  value: string;
  multiplier: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface QuotationRow {
  id: string;
  quotation_number: string;
  customer_id: string;
  employee_id: string;
  product_key: string;
  product_name: string;
  quantity: number;
  base_price: number;
  spec_price_total: number;
  custom_items_total: number;
  total_amount: number;
  delivery_date: string | null;
  notes: string | null;
  status: 'Draft' | 'Pending' | 'Approved' | 'Denied';
  approval_comment: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface QuotationSpecValueRow {
  id: string;
  quotation_id: string;
  spec_key: string;
  spec_label: string;
  value: string;
  price_impact: number;
  created_at: string;
}

export interface QuotationCustomItemRow {
  id: string;
  quotation_id: string;
  description: string;
  amount: number;
  created_at: string;
}

export interface WorkOrderRow {
  id: string;
  work_order_number: string;
  quotation_id: string;
  customer_id: string;
  total_amount: number;
  delivery_date: string | null;
  due_date: string | null;
  is_urgent: boolean;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ProductionItemRow {
  id: string;
  work_order_id: string;
  product_name: string;
  quantity: number;
  specs: unknown;
  stage: string;
  started_at: string | null;
  completed_at: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChassisRecordRow {
  id: string;
  production_item_id: string;
  chassis_number: string;
  stage: string;
  recorded_at: string;
  recorded_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface SaleRow {
  id: string;
  quotation_id: string;
  customer_id: string;
  total_amount: number;
  paid_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRow {
  id: string;
  payment_number: string;
  sale_id: string;
  amount: number;
  mode: string;
  reference: string | null;
  received_at: string;
  received_by: string | null;
  created_at: string;
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
