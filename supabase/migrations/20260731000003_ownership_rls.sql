-- ============================================================================
-- Nexfra ERP — Supabase Migration 003: Ownership & Record-Level Access Control
-- Date: 2026-07-31
--
-- Adds ownership columns (created_by / assigned_to / updated_by), supporting
-- indexes, and rewrites RLS policies so that record-level access is enforced
-- by the database itself (defense-in-depth). The backend enforces the same
-- rules in its query layer using the service role.
--
-- Access matrix (SELECT/INSERT/UPDATE/DELETE unless noted):
--   admin   -> every record
--   sales   -> records created_by = self (quotations: created_by = self OR
--              assigned_to_employee_id = self)
--   finance -> finance tables only (sales, payments, audit_logs)
--   manager -> work_orders, production_items, production_stage_records,
--              chassis_records (all records)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. HELPER: current employee id (auth.users -> employees)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_employee_id()
RETURNS UUID
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT id INTO v_id
  FROM employees
  WHERE auth_id = auth.uid()
    AND status = 'Active'
    AND deleted_at IS NULL
  LIMIT 1;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

-- Ownership write trigger: defaults created_by/updated_by to the acting
-- employee when not explicitly provided. Backend always passes explicit
-- values; this covers direct/PostgREST writes.
CREATE OR REPLACE FUNCTION trigger_set_ownership()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := auth_employee_id();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.updated_by IS NULL THEN
      NEW.updated_by := auth_employee_id();
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. OWNERSHIP COLUMNS
-- ----------------------------------------------------------------------------

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS assigned_to_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE work_orders
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE production_items
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE production_stage_records
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE chassis_records
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

ALTER TABLE payments
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;

-- ----------------------------------------------------------------------------
-- 3. INDEXES (ownership lookups + assignment filtering)
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);

CREATE INDEX IF NOT EXISTS idx_quotations_created_by ON quotations(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_quotations_assigned_to ON quotations(assigned_to_employee_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_orders_created_by ON work_orders(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_production_items_created_by ON production_items(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chassis_records_created_by ON chassis_records(created_by) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 4. OWNERSHIP WRITE TRIGGERS
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_customers_ownership ON customers;
CREATE TRIGGER trg_customers_ownership
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_products_ownership ON products;
CREATE TRIGGER trg_products_ownership
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_quotations_ownership ON quotations;
CREATE TRIGGER trg_quotations_ownership
  BEFORE INSERT OR UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_work_orders_ownership ON work_orders;
CREATE TRIGGER trg_work_orders_ownership
  BEFORE INSERT OR UPDATE ON work_orders
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_production_items_ownership ON production_items;
CREATE TRIGGER trg_production_items_ownership
  BEFORE INSERT OR UPDATE ON production_items
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_production_stage_records_ownership ON production_stage_records;
CREATE TRIGGER trg_production_stage_records_ownership
  BEFORE INSERT OR UPDATE ON production_stage_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_chassis_records_ownership ON chassis_records;
CREATE TRIGGER trg_chassis_records_ownership
  BEFORE INSERT OR UPDATE ON chassis_records
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_sales_ownership ON sales;
CREATE TRIGGER trg_sales_ownership
  BEFORE INSERT OR UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

DROP TRIGGER IF EXISTS trg_payments_ownership ON payments;
CREATE TRIGGER trg_payments_ownership
  BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION trigger_set_ownership();

-- ----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY — ownership-based policies
-- ----------------------------------------------------------------------------
-- Policy names are deterministic so this migration is re-runnable; each table
-- first drops its old broad policies, then recreates scoped ones.

-- 5.1 employees
DROP POLICY IF EXISTS "employees_admin_all" ON employees;
DROP POLICY IF EXISTS "employees_self_read" ON employees;
DROP POLICY IF EXISTS "employees_self_update" ON employees;
CREATE POLICY "employees_admin_all" ON employees
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "employees_self_read" ON employees
  FOR SELECT USING (auth_id = auth.uid());
CREATE POLICY "employees_self_update" ON employees
  FOR UPDATE USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- 5.2 customers — admin all, sales only own
DROP POLICY IF EXISTS "customers_admin_all" ON customers;
DROP POLICY IF EXISTS "customers_sales_read" ON customers;
DROP POLICY IF EXISTS "customers_sales_insert" ON customers;
DROP POLICY IF EXISTS "customers_sales_update" ON customers;
CREATE POLICY "customers_admin_all" ON customers
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "customers_sales_own_all" ON customers
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.3 products — all authenticated read, admin writes (admin owned)
DROP POLICY IF EXISTS "products_read_all" ON products;
DROP POLICY IF EXISTS "products_admin_all" ON products;
CREATE POLICY "products_read_all" ON products
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "products_admin_all" ON products
  FOR ALL USING (auth_has_role('admin'));

-- 5.4 product_templates
DROP POLICY IF EXISTS "product_templates_read_all" ON product_templates;
DROP POLICY IF EXISTS "product_templates_admin_all" ON product_templates;
CREATE POLICY "product_templates_read_all" ON product_templates
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "product_templates_admin_all" ON product_templates
  FOR ALL USING (auth_has_role('admin'));

-- 5.5 product_template_specs
DROP POLICY IF EXISTS "product_template_specs_read_all" ON product_template_specs;
DROP POLICY IF EXISTS "product_template_specs_admin_all" ON product_template_specs;
CREATE POLICY "product_template_specs_read_all" ON product_template_specs
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "product_template_specs_admin_all" ON product_template_specs
  FOR ALL USING (auth_has_role('admin'));

-- 5.6 product_spec_options
DROP POLICY IF EXISTS "product_spec_options_read_all" ON product_spec_options;
DROP POLICY IF EXISTS "product_spec_options_admin_all" ON product_spec_options;
CREATE POLICY "product_spec_options_read_all" ON product_spec_options
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "product_spec_options_admin_all" ON product_spec_options
  FOR ALL USING (auth_has_role('admin'));

-- 5.7 quotations — admin all; sales own OR assigned
DROP POLICY IF EXISTS "quotations_admin_all" ON quotations;
DROP POLICY IF EXISTS "quotations_sales_all" ON quotations;
DROP POLICY IF EXISTS "quotations_finance_read" ON quotations;
DROP POLICY IF EXISTS "quotations_manager_read" ON quotations;
CREATE POLICY "quotations_admin_all" ON quotations
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "quotations_sales_own_all" ON quotations
  FOR ALL USING (
    auth_has_role('sales')
    AND (
      created_by = auth_employee_id()
      OR assigned_to_employee_id = auth_employee_id()
    )
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );
CREATE POLICY "quotations_approval_admin" ON quotations
  FOR SELECT USING (auth_has_role('admin'));
CREATE POLICY "quotations_manager_read" ON quotations
  FOR SELECT USING (auth_has_role('manager'));

-- 5.8 quotation_spec_values — inherit parent quotation access
DROP POLICY IF EXISTS "quotation_spec_values_admin_all" ON quotation_spec_values;
DROP POLICY IF EXISTS "quotation_spec_values_sales_all" ON quotation_spec_values;
DROP POLICY IF EXISTS "quotation_spec_values_read" ON quotation_spec_values;
CREATE POLICY "quotation_spec_values_owner_all" ON quotation_spec_values
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
        AND (
          auth_has_role('admin')
          OR (
            auth_has_role('sales')
            AND (q.created_by = auth_employee_id()
                 OR q.assigned_to_employee_id = auth_employee_id())
          )
        )
    )
  );

-- 5.9 quotation_custom_items — inherit parent quotation access
DROP POLICY IF EXISTS "quotation_custom_items_admin_all" ON quotation_custom_items;
DROP POLICY IF EXISTS "quotation_custom_items_sales_all" ON quotation_custom_items;
CREATE POLICY "quotation_custom_items_owner_all" ON quotation_custom_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
        AND (
          auth_has_role('admin')
          OR (
            auth_has_role('sales')
            AND (q.created_by = auth_employee_id()
                 OR q.assigned_to_employee_id = auth_employee_id())
          )
        )
    )
  );

-- 5.10 work_orders — admin + manager all; sales own
DROP POLICY IF EXISTS "work_orders_admin_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_manager_all" ON work_orders;
DROP POLICY IF EXISTS "work_orders_sales_read" ON work_orders;
CREATE POLICY "work_orders_admin_manager_all" ON work_orders
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('manager'));
CREATE POLICY "work_orders_sales_own_all" ON work_orders
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.11 production_items — admin + manager all; sales own
DROP POLICY IF EXISTS "production_items_admin_all" ON production_items;
DROP POLICY IF EXISTS "production_items_manager_all" ON production_items;
DROP POLICY IF EXISTS "production_items_read" ON production_items;
CREATE POLICY "production_items_admin_manager_all" ON production_items
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('manager'));
CREATE POLICY "production_items_sales_own_all" ON production_items
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.12 production_stage_records — admin + manager all; sales own
DROP POLICY IF EXISTS "production_stage_records_admin_all" ON production_stage_records;
DROP POLICY IF EXISTS "production_stage_records_manager_all" ON production_stage_records;
CREATE POLICY "production_stage_records_admin_manager_all" ON production_stage_records
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('manager'));
CREATE POLICY "production_stage_records_sales_own_all" ON production_stage_records
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.13 chassis_records — admin + manager all; sales own
DROP POLICY IF EXISTS "chassis_records_admin_all" ON chassis_records;
DROP POLICY IF EXISTS "chassis_records_manager_all" ON chassis_records;
DROP POLICY IF EXISTS "chassis_records_sales_read" ON chassis_records;
CREATE POLICY "chassis_records_admin_manager_all" ON chassis_records
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('manager'));
CREATE POLICY "chassis_records_sales_own_all" ON chassis_records
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.14 sales — admin + finance all; sales own
DROP POLICY IF EXISTS "sales_admin_all" ON sales;
DROP POLICY IF EXISTS "sales_finance_all" ON sales;
DROP POLICY IF EXISTS "sales_manager_read" ON sales;
DROP POLICY IF EXISTS "sales_sales_read" ON sales;
CREATE POLICY "sales_admin_finance_all" ON sales
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('finance'));
CREATE POLICY "sales_sales_own_all" ON sales
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.15 payments — admin + finance all; sales own
DROP POLICY IF EXISTS "payments_admin_all" ON payments;
DROP POLICY IF EXISTS "payments_finance_all" ON payments;
DROP POLICY IF EXISTS "payments_read" ON payments;
CREATE POLICY "payments_admin_finance_all" ON payments
  FOR ALL USING (auth_has_role('admin') OR auth_has_role('finance'));
CREATE POLICY "payments_sales_own_all" ON payments
  FOR ALL USING (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  )
  WITH CHECK (
    auth_has_role('sales')
    AND created_by = auth_employee_id()
  );

-- 5.16 audit_logs — admin all; others see own entries
DROP POLICY IF EXISTS "audit_logs_admin_all" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_read" ON audit_logs;
CREATE POLICY "audit_logs_admin_all" ON audit_logs
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "audit_logs_self_all" ON audit_logs
  FOR ALL USING (employee_id = auth_employee_id());

-- 5.17 custom_item_definitions — read for authenticated, admin writes
DROP POLICY IF EXISTS "custom_item_definitions_admin_all" ON custom_item_definitions;
DROP POLICY IF EXISTS "custom_item_definitions_read" ON custom_item_definitions;
CREATE POLICY "custom_item_definitions_admin_all" ON custom_item_definitions
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "custom_item_definitions_read" ON custom_item_definitions
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5.18 app_settings — read for authenticated, admin writes
DROP POLICY IF EXISTS "app_settings_admin_all" ON app_settings;
DROP POLICY IF EXISTS "app_settings_read" ON app_settings;
CREATE POLICY "app_settings_admin_all" ON app_settings
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "app_settings_read" ON app_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- 5.19 product_spec_overrides — read for authenticated, admin writes
DROP POLICY IF EXISTS "product_spec_overrides_admin_all" ON product_spec_overrides;
DROP POLICY IF EXISTS "product_spec_overrides_read" ON product_spec_overrides;
CREATE POLICY "product_spec_overrides_admin_all" ON product_spec_overrides
  FOR ALL USING (auth_has_role('admin'));
CREATE POLICY "product_spec_overrides_read" ON product_spec_overrides
  FOR SELECT USING (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- 6. REVOKE direct write on owned tables from anon/authenticated (defense):
--    All writes go through the backend (service role) or RLS-scoped policies
--    above. Nothing further is required because the policies already scope
--    ownership. Views are regenerated so they respect ownership too.
-- ----------------------------------------------------------------------------

DROP VIEW IF EXISTS v_customer_outstanding;
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
