-- ============================================================================
-- Nexfra ERP — Supabase Migration 008: Component Catalog Schema
-- Date: 2026-08-08
-- ============================================================================
--
-- PHASE 1 — DATABASE FOUNDATION ONLY.
--
-- Purpose: Prepare normalized tables so future phases can store and retrieve
-- the quotation builder's component definitions (sections, specs, options)
-- from the database instead of the hardcoded WIZARD_PRODUCT_TEMPLATES in erp.js.
--
-- This migration ONLY creates new tables. It does not modify or drop any
-- existing quotation table, and it does not alter any existing quotation data.
-- The application continues to read its definitions from the hardcoded JS
-- after this phase; nothing in the frontend reads from these tables yet.
--
-- Design notes:
--   * Sections are global (shared across all product templates).
--   * Specs reference an existing product_templates row (the template dimension)
--     because each product template defines its own set of specs/options/prices.
--   * Options belong to a spec and carry the price differential.
--   * Conventions follow the existing schema: UUID PKs via gen_random_uuid(),
--     created_at/updated_at timestamps, updated_at trigger, and RLS enabled.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. sections
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sections (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key           TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2. specs (per product template + global section)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS specs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id   UUID NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE,
  section_id    UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  spec_key      TEXT NOT NULL,
  name          TEXT NOT NULL,
  control_type  TEXT NOT NULL DEFAULT 'text',
  default_value TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  enabled       BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_template_spec_key UNIQUE (template_id, spec_key)
);

-- ----------------------------------------------------------------------------
-- 3. options (per spec)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS options (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spec_id          UUID NOT NULL REFERENCES specs(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  price_difference NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_default       BOOLEAN NOT NULL DEFAULT false,
  display_order    INTEGER NOT NULL DEFAULT 0,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_options_spec_name UNIQUE (spec_id, name)
);

-- ----------------------------------------------------------------------------
-- 4. INDEXES
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sections_display_order ON sections(display_order) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_specs_template ON specs(template_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_specs_section ON specs(section_id) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_options_spec ON options(spec_id) WHERE enabled = true;

-- ----------------------------------------------------------------------------
-- 5. updated_at triggers
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TRIGGER trg_sections_updated_at
    BEFORE UPDATE ON sections
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_specs_updated_at
    BEFORE UPDATE ON specs
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (mirrors product_templates read/admin model)
-- ----------------------------------------------------------------------------
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE specs ENABLE ROW LEVEL SECURITY;
ALTER TABLE options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sections_read_all" ON sections;
CREATE POLICY "sections_read_all" ON sections
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "sections_admin_all" ON sections;
CREATE POLICY "sections_admin_all" ON sections
  FOR ALL USING (auth_has_role('admin'));

DROP POLICY IF EXISTS "specs_read_all" ON specs;
CREATE POLICY "specs_read_all" ON specs
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "specs_admin_all" ON specs;
CREATE POLICY "specs_admin_all" ON specs
  FOR ALL USING (auth_has_role('admin'));

DROP POLICY IF EXISTS "options_read_all" ON options;
CREATE POLICY "options_read_all" ON options
  FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "options_admin_all" ON options;
CREATE POLICY "options_admin_all" ON options
  FOR ALL USING (auth_has_role('admin'));