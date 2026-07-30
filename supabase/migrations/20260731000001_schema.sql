-- ============================================================================
-- Nexfra ERP — Supabase Migration 001: Full Schema
-- Date: 2026-07-31
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. EXTENSIONS
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- ----------------------------------------------------------------------------
-- 1. ENUMS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'sales', 'finance', 'manager');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE employee_status AS ENUM ('Active', 'Disabled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE quotation_status AS ENUM ('Draft', 'Pending', 'Approved', 'Denied');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_mode AS ENUM ('Cash', 'RTGS', 'Cheque', 'UPI', 'Card', 'Other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE production_stage AS ENUM (
    'Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding',
    'Painting', 'Assembly', 'QC', 'Ready', 'Delivered'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('Pending', 'Partial', 'Paid');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. SEQUENCES
-- ----------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS seq_employees START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_customers START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_quotations START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_work_orders START 1 INCREMENT 1;
CREATE SEQUENCE IF NOT EXISTS seq_payments START 1 INCREMENT 1;

-- ----------------------------------------------------------------------------
-- 3. UPDATED_AT TRIGGER FUNCTION
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 4. AUTO-CREATE EMPLOYEE ON SUPABASE AUTH SIGNUP
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.employees (
    auth_id,
    email,
    full_name,
    role
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      split_part(NEW.email, '@', 1)
    ),
    COALESCE(
      (NEW.raw_user_meta_data ->> 'role')::user_role,
      'sales'::user_role
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 5. TABLES
-- ----------------------------------------------------------------------------

-- 5.1 employees
CREATE TABLE IF NOT EXISTS employees (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id         UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  employee_number TEXT UNIQUE NOT NULL DEFAULT 'EMP-' || LPAD(NEXTVAL('seq_employees')::TEXT, 6, '0'),
  full_name       TEXT NOT NULL,
  email           TEXT UNIQUE NOT NULL,
  phone           TEXT,
  employee_code   TEXT,
  role            user_role NOT NULL DEFAULT 'sales',
  status          employee_status NOT NULL DEFAULT 'Active',
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 5.2 customers
CREATE TABLE IF NOT EXISTS customers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_number TEXT UNIQUE NOT NULL DEFAULT 'CUS-' || LPAD(NEXTVAL('seq_customers')::TEXT, 6, '0'),
  name            TEXT NOT NULL,
  company         TEXT NOT NULL,
  gst             TEXT UNIQUE,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  vehicles        JSONB NOT NULL DEFAULT '[]'::jsonb,
  outstanding     NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

-- 5.3 products
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.4 product_templates
CREATE TABLE IF NOT EXISTS product_templates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,
  name        TEXT NOT NULL,
  base_price  NUMERIC(12,2) NOT NULL DEFAULT 0,
  dimensions  JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_product_templates_key UNIQUE (product_id, key)
);

-- 5.5 product_template_specs
CREATE TABLE IF NOT EXISTS product_template_specs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  spec_key      TEXT NOT NULL,
  name          TEXT NOT NULL,
  section       TEXT NOT NULL,
  spec_type     TEXT NOT NULL DEFAULT 'dropdown',
  default_value TEXT,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_template_specs_key UNIQUE (template_id, spec_key)
);

-- 5.6 product_spec_options
CREATE TABLE IF NOT EXISTS product_spec_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id     UUID NOT NULL REFERENCES product_template_specs(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  price_diff  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_spec_options_name UNIQUE (spec_id, option_name)
);

-- 5.7 quotations
CREATE TABLE IF NOT EXISTS quotations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT UNIQUE NOT NULL DEFAULT 'NQ-' || LPAD(NEXTVAL('seq_quotations')::TEXT, 6, '0'),
  version          INTEGER NOT NULL DEFAULT 1,
  customer_id      UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name    TEXT NOT NULL,
  customer_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_key      TEXT,
  template_key     TEXT,
  capacity         TEXT,
  dimensions       JSONB NOT NULL DEFAULT '{}'::jsonb,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,
  manual_total     NUMERIC(12,2),
  gst_rate         NUMERIC(5,2) NOT NULL DEFAULT 18,
  order_qty        INTEGER NOT NULL DEFAULT 1,
  status           quotation_status NOT NULL DEFAULT 'Draft',
  terms            JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope_of_work    TEXT,
  bank_details     JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes            TEXT,
  approved_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  denied_by        UUID REFERENCES employees(id) ON DELETE SET NULL,
  denied_at        TIMESTAMPTZ,
  denied_reason    TEXT,
  created_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- 5.8 quotation_spec_values
CREATE TABLE IF NOT EXISTS quotation_spec_values (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id         UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  spec_key             TEXT NOT NULL,
  spec_name            TEXT NOT NULL,
  section              TEXT NOT NULL,
  selected_value       TEXT,
  custom_description   TEXT,
  custom_price         NUMERIC(10,2),
  is_not_required      BOOLEAN NOT NULL DEFAULT false,
  effective_price_diff NUMERIC(10,2) NOT NULL DEFAULT 0,
  CONSTRAINT uq_quotation_spec UNIQUE (quotation_id, spec_key)
);

-- 5.9 quotation_custom_items
CREATE TABLE IF NOT EXISTS quotation_custom_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id  UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.10 work_orders
CREATE TABLE IF NOT EXISTS work_orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_number TEXT UNIQUE NOT NULL DEFAULT 'WO-' || LPAD(NEXTVAL('seq_work_orders')::TEXT, 6, '0'),
  version           INTEGER NOT NULL DEFAULT 1,
  quotation_id      UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_name     TEXT NOT NULL,
  product_name      TEXT NOT NULL,
  specifications    JSONB NOT NULL DEFAULT '{}'::jsonb,
  dimensions        JSONB NOT NULL DEFAULT '{}'::jsonb,
  colour            TEXT,
  quantity          INTEGER NOT NULL DEFAULT 1,
  factory_notes     TEXT,
  due_date          DATE,
  is_urgent         BOOLEAN NOT NULL DEFAULT false,
  status            TEXT NOT NULL DEFAULT 'Open',
  booked_by         UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);

-- 5.11 production_items
CREATE TABLE IF NOT EXISTS production_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id    UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  quotation_id     UUID REFERENCES quotations(id) ON DELETE SET NULL,
  current_stage    production_stage NOT NULL DEFAULT 'Pending',
  stage_progress   JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatch_fields  JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

-- 5.12 production_stage_records
CREATE TABLE IF NOT EXISTS production_stage_records (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_item_id UUID NOT NULL REFERENCES production_items(id) ON DELETE CASCADE,
  stage_key          TEXT NOT NULL,
  stage_name         TEXT NOT NULL,
  is_completed       BOOLEAN NOT NULL DEFAULT false,
  completed_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  completed_at       TIMESTAMPTZ,
  remark             TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_production_stage_record UNIQUE (production_item_id, stage_key)
);

-- 5.13 chassis_records
CREATE TABLE IF NOT EXISTS chassis_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id  UUID REFERENCES work_orders(id) ON DELETE SET NULL,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  field          TEXT,
  brand          TEXT,
  model          TEXT,
  chassis_number TEXT,
  arrival_date   DATE,
  customer_name  TEXT,
  product_name   TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

-- 5.14 sales
CREATE TABLE IF NOT EXISTS sales (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  quotation_id   UUID REFERENCES quotations(id) ON DELETE SET NULL,
  customer_name  TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  amount         NUMERIC(12,2) NOT NULL,
  status         order_status NOT NULL DEFAULT 'Pending',
  delivery_date  DATE,
  notes          TEXT,
  created_by     UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

-- 5.15 payments
CREATE TABLE IF NOT EXISTS payments (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_number TEXT UNIQUE NOT NULL DEFAULT 'PAY-' || LPAD(NEXTVAL('seq_payments')::TEXT, 6, '0'),
  sale_id        UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  amount         NUMERIC(12,2) NOT NULL,
  mode           payment_mode NOT NULL DEFAULT 'Cash',
  reference      TEXT,
  payment_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  received_by    UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at     TIMESTAMPTZ
);

-- 5.16 audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  description TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.17 custom_item_definitions
CREATE TABLE IF NOT EXISTS custom_item_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.18 app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5.19 product_spec_overrides
CREATE TABLE IF NOT EXISTS product_spec_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   TEXT NOT NULL,
  spec_key       TEXT NOT NULL,
  override_data  JSONB NOT NULL,
  created_by     UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_spec_overrides_target UNIQUE (template_key, spec_key)
);

-- ----------------------------------------------------------------------------
-- 6. INDEXES
-- ----------------------------------------------------------------------------

-- employees
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status) WHERE deleted_at IS NULL;

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_company ON customers(company) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email) WHERE deleted_at IS NULL;

-- product_templates
CREATE INDEX IF NOT EXISTS idx_product_templates_product ON product_templates(product_id);

-- product_template_specs
CREATE INDEX IF NOT EXISTS idx_template_specs_template ON product_template_specs(template_id);

-- product_spec_options
CREATE INDEX IF NOT EXISTS idx_spec_options_spec ON product_spec_options(spec_id);

-- quotations
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_customer ON quotations(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_created_at ON quotations(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_number ON quotations(quotation_number);

-- quotation_spec_values
CREATE INDEX IF NOT EXISTS idx_quotation_specs_quotation ON quotation_spec_values(quotation_id);

-- quotation_custom_items
CREATE INDEX IF NOT EXISTS idx_quotation_custom_items_quotation ON quotation_custom_items(quotation_id);

-- work_orders
CREATE INDEX IF NOT EXISTS idx_work_orders_quotation ON work_orders(quotation_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_work_orders_due_date ON work_orders(due_date) WHERE deleted_at IS NULL AND status != 'Completed';
CREATE INDEX IF NOT EXISTS idx_work_orders_urgent ON work_orders(is_urgent) WHERE deleted_at IS NULL AND is_urgent = true;

-- production_items
CREATE INDEX IF NOT EXISTS idx_production_items_work_order ON production_items(work_order_id);
CREATE INDEX IF NOT EXISTS idx_production_items_stage ON production_items(current_stage) WHERE deleted_at IS NULL;

-- production_stage_records
CREATE INDEX IF NOT EXISTS idx_production_stage_records_item ON production_stage_records(production_item_id);

-- chassis_records
CREATE INDEX IF NOT EXISTS idx_chassis_records_work_order ON chassis_records(work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chassis_records_customer ON chassis_records(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chassis_records_chassis ON chassis_records(chassis_number) WHERE deleted_at IS NULL;

-- sales
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_name) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_sales_quotation ON sales(quotation_id) WHERE deleted_at IS NULL;

-- payments
CREATE INDEX IF NOT EXISTS idx_payments_sale ON payments(sale_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date DESC) WHERE deleted_at IS NULL;

-- audit_logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_employee ON audit_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- custom_item_definitions
CREATE INDEX IF NOT EXISTS idx_custom_item_definitions_active ON custom_item_definitions(is_active);

-- ----------------------------------------------------------------------------
-- 7. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------

CREATE TRIGGER IF NOT EXISTS trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_product_templates_updated_at
  BEFORE UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_product_template_specs_updated_at
  BEFORE UPDATE ON product_template_specs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_production_items_updated_at
  BEFORE UPDATE ON production_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_chassis_records_updated_at
  BEFORE UPDATE ON chassis_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_custom_item_definitions_updated_at
  BEFORE UPDATE ON custom_item_definitions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER IF NOT EXISTS trg_product_spec_overrides_updated_at
  BEFORE UPDATE ON product_spec_overrides
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 8. AUTH TRIGGER (auto-create employee on signup)
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

-- 9.1 Enable RLS on all tables
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_template_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_spec_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotation_spec_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quotation_custom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS production_stage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS chassis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS product_spec_overrides ENABLE ROW LEVEL SECURITY;

-- 9.2 Helper function: check if current user has a specific role
CREATE OR REPLACE FUNCTION auth_has_role(required_role user_role)
RETURNS BOOLEAN
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM employees
    WHERE auth_id = auth.uid()
      AND role = required_role
      AND status = 'Active'
      AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Helper: get current employee record
CREATE OR REPLACE FUNCTION auth_current_employee()
RETURNS SETOF employees
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM employees
  WHERE auth_id = auth.uid()
    AND deleted_at IS NULL
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- 9.3 employees RLS
CREATE POLICY "employees_admin_all" ON employees
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "employees_self_read" ON employees
  FOR SELECT USING (auth_id = auth.uid());

CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 9.4 customers RLS
CREATE POLICY "customers_admin_all" ON customers
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "customers_sales_read" ON customers
  FOR SELECT USING (auth_has_role('sales'));

CREATE POLICY "customers_sales_insert" ON customers
  FOR INSERT WITH CHECK (auth_has_role('sales'));

CREATE POLICY "customers_sales_update" ON customers
  FOR UPDATE USING (auth_has_role('sales'));

-- 9.5 products RLS (all authenticated users can read)
CREATE POLICY "products_read_all" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (auth_has_role('admin'));

-- 9.6 product_templates RLS
CREATE POLICY "product_templates_read_all" ON product_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "product_templates_admin_all" ON product_templates
  FOR ALL USING (auth_has_role('admin'));

-- 9.7 product_template_specs RLS
CREATE POLICY "product_template_specs_read_all" ON product_template_specs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "product_template_specs_admin_all" ON product_template_specs
  FOR ALL USING (auth_has_role('admin'));

-- 9.8 product_spec_options RLS
CREATE POLICY "product_spec_options_read_all" ON product_spec_options
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "product_spec_options_admin_all" ON product_spec_options
  FOR ALL USING (auth_has_role('admin'));

-- 9.9 quotations RLS
CREATE POLICY "quotations_admin_all" ON quotations
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "quotations_sales_all" ON quotations
  FOR ALL USING (auth_has_role('sales'));

CREATE POLICY "quotations_finance_read" ON quotations
  FOR SELECT USING (auth_has_role('finance'));

CREATE POLICY "quotations_manager_read" ON quotations
  FOR SELECT USING (auth_has_role('manager'));

-- 9.10 quotation_spec_values RLS (inherit from parent quotation)
CREATE POLICY "quotation_spec_values_admin_all" ON quotation_spec_values
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "quotation_spec_values_sales_all" ON quotation_spec_values
  FOR ALL USING (auth_has_role('sales'));

CREATE POLICY "quotation_spec_values_read" ON quotation_spec_values
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.11 quotation_custom_items RLS
CREATE POLICY "quotation_custom_items_admin_all" ON quotation_custom_items
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "quotation_custom_items_sales_all" ON quotation_custom_items
  FOR ALL USING (auth_has_role('sales'));

-- 9.12 work_orders RLS
CREATE POLICY "work_orders_admin_all" ON work_orders
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "work_orders_manager_all" ON work_orders
  FOR ALL USING (auth_has_role('manager'));

CREATE POLICY "work_orders_sales_read" ON work_orders
  FOR SELECT USING (auth_has_role('sales'));

-- 9.13 production_items RLS
CREATE POLICY "production_items_admin_all" ON production_items
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "production_items_manager_all" ON production_items
  FOR ALL USING (auth_has_role('manager'));

CREATE POLICY "production_items_read" ON production_items
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.14 production_stage_records RLS
CREATE POLICY "production_stage_records_admin_all" ON production_stage_records
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "production_stage_records_manager_all" ON production_stage_records
  FOR ALL USING (auth_has_role('manager'));

-- 9.15 chassis_records RLS
CREATE POLICY "chassis_records_admin_all" ON chassis_records
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "chassis_records_manager_all" ON chassis_records
  FOR ALL USING (auth_has_role('manager'));

CREATE POLICY "chassis_records_sales_read" ON chassis_records
  FOR SELECT USING (auth_has_role('sales'));

-- 9.16 sales RLS
CREATE POLICY "sales_admin_all" ON sales
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "sales_finance_all" ON sales
  FOR ALL USING (auth_has_role('finance'));

CREATE POLICY "sales_manager_read" ON sales
  FOR SELECT USING (auth_has_role('manager'));

CREATE POLICY "sales_sales_read" ON sales
  FOR SELECT USING (auth_has_role('sales'));

-- 9.17 payments RLS
CREATE POLICY "payments_admin_all" ON payments
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "payments_finance_all" ON payments
  FOR ALL USING (auth_has_role('finance'));

CREATE POLICY "payments_read" ON payments
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.18 audit_logs RLS
CREATE POLICY "audit_logs_admin_all" ON audit_logs
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "audit_logs_read" ON audit_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.19 custom_item_definitions RLS
CREATE POLICY "custom_item_definitions_admin_all" ON custom_item_definitions
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "custom_item_definitions_read" ON custom_item_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.20 app_settings RLS
CREATE POLICY "app_settings_admin_all" ON app_settings
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- 9.21 product_spec_overrides RLS
CREATE POLICY "product_spec_overrides_admin_all" ON product_spec_overrides
  FOR ALL USING (auth_has_role('admin'));

CREATE POLICY "product_spec_overrides_read" ON product_spec_overrides
  FOR SELECT USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 10. FUNCTIONS (business logic)
-- ----------------------------------------------------------------------------

-- Recalculate customer outstanding balance
CREATE OR REPLACE FUNCTION recalculate_customer_outstanding(p_customer_id UUID)
RETURNS NUMERIC(12,2)
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_outstanding NUMERIC(12,2);
BEGIN
  SELECT COALESCE(SUM(s.amount - COALESCE(p.paid, 0)), 0)
  INTO v_outstanding
  FROM sales s
  LEFT JOIN (
    SELECT sale_id, SUM(amount) AS paid
    FROM payments WHERE deleted_at IS NULL
    GROUP BY sale_id
  ) p ON p.sale_id = s.id
  WHERE s.customer_name = (SELECT company FROM customers WHERE id = p_customer_id)
    AND s.deleted_at IS NULL;

  UPDATE customers SET outstanding = v_outstanding WHERE id = p_customer_id;
  RETURN v_outstanding;
END;
$$ LANGUAGE plpgsql;

-- Log an audit entry
CREATE OR REPLACE FUNCTION log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_employee_id UUID;
  v_id UUID;
BEGIN
  SELECT id INTO v_employee_id FROM employees WHERE auth_id = auth.uid() AND deleted_at IS NULL;

  INSERT INTO audit_logs (employee_id, action, entity_type, entity_id, description, metadata)
  VALUES (v_employee_id, p_action, p_entity_type, p_entity_id, p_description, p_metadata)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 11. VIEWS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW v_customer_outstanding AS
SELECT
  c.id AS customer_id,
  c.customer_number,
  c.company,
  COALESCE(SUM(s.amount - COALESCE(p.paid, 0)), 0) AS outstanding
FROM customers c
LEFT JOIN sales s ON s.customer_name = c.company AND s.deleted_at IS NULL
LEFT JOIN (
  SELECT sale_id, SUM(amount) AS paid
  FROM payments WHERE deleted_at IS NULL
  GROUP BY sale_id
) p ON p.sale_id = s.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.customer_number, c.company;

CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', p.payment_date) AS month,
  COUNT(DISTINCT p.sale_id) AS invoice_count,
  COUNT(p.id) AS payment_count,
  SUM(p.amount) AS total_collected
FROM payments p
WHERE p.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', p.payment_date)
ORDER BY month DESC;

CREATE OR REPLACE VIEW v_production_pipeline AS
SELECT
  pi.current_stage,
  COUNT(*) AS item_count,
  COUNT(*) FILTER (WHERE pi.completed_at IS NOT NULL) AS completed_count
FROM production_items pi
WHERE pi.deleted_at IS NULL
GROUP BY pi.current_stage
ORDER BY pi.current_stage;
