-- ============================================================================
-- Nexfra ERP — PostgreSQL Database Schema
-- Optimized for PostgreSQL 15+ and Supabase compatibility
-- ============================================================================

-- ============================================================================
-- 0. EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_uuidv7";  -- For UUID v7; fallback to gen_random_uuid()

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('admin', 'sales', 'finance', 'manager');
CREATE TYPE employee_status AS ENUM ('Active', 'Disabled');
CREATE TYPE quotation_status AS ENUM ('Draft', 'Pending', 'Approved', 'Denied');
CREATE TYPE payment_mode AS ENUM ('Cash', 'RTGS', 'Cheque', 'UPI', 'Card', 'Other');
CREATE TYPE production_stage AS ENUM (
  'Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding',
  'Painting', 'Assembly', 'QC', 'Ready', 'Delivered'
);
CREATE TYPE order_status AS ENUM ('Pending', 'Partial', 'Paid');

-- ============================================================================
-- 2. SEQUENCES
-- ============================================================================

CREATE SEQUENCE seq_employees START 1 INCREMENT 1;
CREATE SEQUENCE seq_customers START 1 INCREMENT 1;
CREATE SEQUENCE seq_quotations START 1 INCREMENT 1;
CREATE SEQUENCE seq_work_orders START 1 INCREMENT 1;
CREATE SEQUENCE seq_payments START 1 INCREMENT 1;

-- ============================================================================
-- 3. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 employees
-- ----------------------------------------------------------------------------

CREATE TABLE employees (
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

CREATE INDEX idx_employees_role ON employees(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_employees_status ON employees(status) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_employees_updated_at
  BEFORE UPDATE ON employees
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.2 customers
-- ----------------------------------------------------------------------------

CREATE TABLE customers (
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

CREATE INDEX idx_customers_company ON customers(company) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_email ON customers(email) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.3 products
-- ----------------------------------------------------------------------------

CREATE TABLE products (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.4 product_templates
-- ----------------------------------------------------------------------------

CREATE TABLE product_templates (
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

CREATE INDEX idx_product_templates_product ON product_templates(product_id);

CREATE TRIGGER trg_product_templates_updated_at
  BEFORE UPDATE ON product_templates
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.5 product_template_specs
-- ----------------------------------------------------------------------------

CREATE TABLE product_template_specs (
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

CREATE INDEX idx_template_specs_template ON product_template_specs(template_id);

CREATE TRIGGER trg_product_template_specs_updated_at
  BEFORE UPDATE ON product_template_specs
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.6 product_spec_options
-- ----------------------------------------------------------------------------

CREATE TABLE product_spec_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id     UUID NOT NULL REFERENCES product_template_specs(id) ON DELETE CASCADE,
  option_name TEXT NOT NULL,
  price_diff  NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default  BOOLEAN NOT NULL DEFAULT false,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_spec_options_name UNIQUE (spec_id, option_name)
);

CREATE INDEX idx_spec_options_spec ON product_spec_options(spec_id);

-- ----------------------------------------------------------------------------
-- 4.7 quotations
-- ----------------------------------------------------------------------------

CREATE TABLE quotations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number TEXT UNIQUE NOT NULL DEFAULT 'NQ-' || LPAD(NEXTVAL('seq_quotations')::TEXT, 6, '0'),
  version         INTEGER NOT NULL DEFAULT 1,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  customer_name   TEXT NOT NULL,
  customer_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  product_key     TEXT,
  template_key    TEXT,
  capacity        TEXT,
  dimensions      JSONB NOT NULL DEFAULT '{}'::jsonb,
  total           NUMERIC(12,2) NOT NULL DEFAULT 0,
  manual_total    NUMERIC(12,2),
  gst_rate        NUMERIC(5,2) NOT NULL DEFAULT 18,
  order_qty       INTEGER NOT NULL DEFAULT 1,
  status          quotation_status NOT NULL DEFAULT 'Draft',
  terms           JSONB NOT NULL DEFAULT '[]'::jsonb,
  scope_of_work   TEXT,
  bank_details    JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes           TEXT,
  approved_by     UUID REFERENCES employees(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  denied_by       UUID REFERENCES employees(id) ON DELETE SET NULL,
  denied_at       TIMESTAMPTZ,
  denied_reason   TEXT,
  created_by      UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_quotations_status ON quotations(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_customer ON quotations(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_created_by ON quotations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotations_created_at ON quotations(created_at DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.8 quotation_spec_values
-- ----------------------------------------------------------------------------

CREATE TABLE quotation_spec_values (
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

CREATE INDEX idx_quotation_specs_quotation ON quotation_spec_values(quotation_id);

-- ----------------------------------------------------------------------------
-- 4.9 quotation_custom_items
-- ----------------------------------------------------------------------------

CREATE TABLE quotation_custom_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id  UUID NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  price         NUMERIC(10,2) NOT NULL DEFAULT 0,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotation_custom_items_quotation ON quotation_custom_items(quotation_id);

-- ----------------------------------------------------------------------------
-- 4.10 work_orders
-- ----------------------------------------------------------------------------

CREATE TABLE work_orders (
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

CREATE INDEX idx_work_orders_quotation ON work_orders(quotation_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_status ON work_orders(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_work_orders_due_date ON work_orders(due_date) WHERE deleted_at IS NULL AND status != 'Completed';
CREATE INDEX idx_work_orders_urgent ON work_orders(is_urgent) WHERE deleted_at IS NULL AND is_urgent = true;

CREATE TRIGGER trg_work_orders_updated_at
  BEFORE UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.11 production_items
-- ----------------------------------------------------------------------------

CREATE TABLE production_items (
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

CREATE INDEX idx_production_items_work_order ON production_items(work_order_id);
CREATE INDEX idx_production_items_stage ON production_items(current_stage) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_production_items_updated_at
  BEFORE UPDATE ON production_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.12 production_stage_records
-- ----------------------------------------------------------------------------

CREATE TABLE production_stage_records (
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

CREATE INDEX idx_production_stage_records_item ON production_stage_records(production_item_id);

-- ----------------------------------------------------------------------------
-- 4.13 chassis_records
-- ----------------------------------------------------------------------------

CREATE TABLE chassis_records (
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

CREATE INDEX idx_chassis_records_work_order ON chassis_records(work_order_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chassis_records_customer ON chassis_records(customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_chassis_records_chassis ON chassis_records(chassis_number) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_chassis_records_updated_at
  BEFORE UPDATE ON chassis_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.14 sales
-- ----------------------------------------------------------------------------

CREATE TABLE sales (
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

CREATE INDEX idx_sales_customer ON sales(customer_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_status ON sales(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_sales_quotation ON sales(quotation_id) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.15 payments
-- ----------------------------------------------------------------------------

CREATE TABLE payments (
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

CREATE INDEX idx_payments_sale ON payments(sale_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_date ON payments(payment_date DESC) WHERE deleted_at IS NULL;

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.16 audit_logs
-- ----------------------------------------------------------------------------

CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   TEXT,
  description TEXT NOT NULL,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_employee ON audit_logs(employee_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- ----------------------------------------------------------------------------
-- 4.17 custom_item_definitions
-- ----------------------------------------------------------------------------

CREATE TABLE custom_item_definitions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  default_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_by    UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_custom_item_definitions_active ON custom_item_definitions(is_active);

CREATE TRIGGER trg_custom_item_definitions_updated_at
  BEFORE UPDATE ON custom_item_definitions
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.18 app_settings
-- ----------------------------------------------------------------------------

CREATE TABLE app_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         TEXT UNIQUE NOT NULL,
  value       JSONB NOT NULL,
  description TEXT,
  updated_by  UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ----------------------------------------------------------------------------
-- 4.19 product_spec_overrides
-- ----------------------------------------------------------------------------

CREATE TABLE product_spec_overrides (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key   TEXT NOT NULL,
  spec_key       TEXT NOT NULL,
  override_data  JSONB NOT NULL,
  created_by     UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_spec_overrides_target UNIQUE (template_key, spec_key)
);

CREATE TRIGGER trg_product_spec_overrides_updated_at
  BEFORE UPDATE ON product_spec_overrides
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- ============================================================================
-- 5. VIEWS
-- ============================================================================

-- Outstanding balance per customer
CREATE VIEW v_customer_outstanding AS
SELECT
  c.id AS customer_id,
  c.customer_number,
  c.company,
  COALESCE(SUM(s.amount - COALESCE(p.paid, 0)), 0) AS outstanding
FROM customers c
LEFT JOIN sales s ON s.customer_name = c.company AND s.deleted_at IS NULL
LEFT JOIN (
  SELECT sale_id, SUM(amount) AS paid
  FROM payments
  WHERE deleted_at IS NULL
  GROUP BY sale_id
) p ON p.sale_id = s.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.customer_number, c.company;

-- Monthly revenue summary
CREATE VIEW v_monthly_revenue AS
SELECT
  DATE_TRUNC('month', p.payment_date) AS month,
  COUNT(DISTINCT p.sale_id) AS invoice_count,
  COUNT(p.id) AS payment_count,
  SUM(p.amount) AS total_collected
FROM payments p
WHERE p.deleted_at IS NULL
GROUP BY DATE_TRUNC('month', p.payment_date)
ORDER BY month DESC;

-- Production pipeline summary
CREATE VIEW v_production_pipeline AS
SELECT
  pi.current_stage,
  COUNT(*) AS item_count,
  COUNT(*) FILTER (WHERE pi.completed_at IS NOT NULL) AS completed_count
FROM production_items pi
WHERE pi.deleted_at IS NULL
GROUP BY pi.current_stage
ORDER BY pi.current_stage;

-- ============================================================================
-- 6. ROW-LEVEL SECURITY (Supabase)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_template_specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_spec_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_spec_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_custom_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE chassis_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_item_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_spec_overrides ENABLE ROW LEVEL SECURITY;

-- Admin: full access to everything
CREATE POLICY admin_all ON employees
  FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Sales: read customers, manage own quotations
CREATE POLICY sales_select_customers ON customers
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'sales'));

-- Finance: read sales/payments, manage payments
CREATE POLICY finance_select_sales ON sales
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'finance'));

-- Manager: manage work orders, production items, chassis
CREATE POLICY manager_select_work_orders ON work_orders
  FOR SELECT USING (auth.jwt() ->> 'role' IN ('admin', 'manager'));

-- ============================================================================
-- 7. SEED DATA
-- ============================================================================

BEGIN;

-- Products
INSERT INTO products (key, name, description, sort_order) VALUES
  ('trailer', 'Trailer', 'Flat Bed, Side Wall, and Tip Trailers', 1),
  ('tipper', 'Tipper', 'Box Body and Rock Body Tippers', 2),
  ('rigid', 'Rigid Load Body', 'Rigid truck load bodies', 3);

-- Product Templates
INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'flatbed', 'Flat Bed Trailer', 850000, '{"length": "40 Feet", "height": "NA", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'trailer';

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'sidewall', 'Side Wall Trailer', 1420000, '{"length": "40 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'trailer';

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'tiptrailer', 'Tip Trailer', 1420000, '{"length": "32 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 3
FROM products p WHERE p.key = 'trailer';

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'boxbody', 'Box Body Tipper', 780000, '{"length": "20 Feet", "height": "4.5 Feet", "width": "98 Inches"}'::jsonb, 1
FROM products p WHERE p.key = 'tipper';

INSERT INTO product_templates (product_id, key, name, base_price, dimensions, sort_order)
SELECT p.id, 'rockbody', 'Rock Body Tipper', 1150000, '{"length": "18 Feet", "height": "4 Feet", "width": "96 Inches"}'::jsonb, 2
FROM products p WHERE p.key = 'tipper';

-- App Settings (default pricing coefficients)
INSERT INTO app_settings (key, value, description) VALUES
  ('pricing_coefficients', '{"floor6": -15000, "floor10": 30000, "steelHardox": 150000, "axle2": -100000, "axle3_16": 80000}'::jsonb, 'Raw material pricing adjustment coefficients');

COMMIT;

-- ============================================================================
-- 8. FUNCTIONS
-- ============================================================================

-- Recalculate customer outstanding balance
CREATE OR REPLACE FUNCTION recalculate_customer_outstanding(p_customer_id UUID)
RETURNS NUMERIC(12,2) AS $$
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
  p_employee_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO audit_logs (employee_id, action, entity_type, entity_id, description, metadata)
  VALUES (p_employee_id, p_action, p_entity_type, p_entity_id, p_description, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
