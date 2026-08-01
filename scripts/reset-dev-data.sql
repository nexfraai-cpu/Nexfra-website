-- ============================================================================
-- DEVELOPMENT ONLY: RESET TRANSACTIONAL TEST DATA
-- CAUTION: Deletes all transactional data (quotations, work orders, production, sales, payments, test customers).
-- DO NOT RUN IN PRODUCTION.
-- ============================================================================

BEGIN;

-- 1. Delete production stage records, chassis records, and production items
TRUNCATE TABLE production_stage_records, chassis_records, production_items CASCADE;

-- 2. Delete work orders
TRUNCATE TABLE work_orders CASCADE;

-- 3. Delete finance payments & sales
TRUNCATE TABLE payments, sales CASCADE;

-- 4. Delete quotation details & quotations
TRUNCATE TABLE quotation_spec_values, quotation_custom_items, quotations CASCADE;

-- 5. Delete test / demo customer records
TRUNCATE TABLE customers CASCADE;

-- 6. Reset yearly sequence table and PostgreSQL sequences
TRUNCATE TABLE quotation_yearly_sequences;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'seq_quotations') THEN
    ALTER SEQUENCE seq_quotations RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'seq_work_orders') THEN
    ALTER SEQUENCE seq_work_orders RESTART WITH 1;
  END IF;
END $$;

-- PRESERVED DATA SUMMARY:
-- - employees & auth users (UNTOUCHED)
-- - products, product_templates, product_template_specs, product_spec_options (UNTOUCHED)
-- - app_settings, company settings, pricing configuration (UNTOUCHED)
-- - audit_logs (UNTOUCHED)

COMMIT;
