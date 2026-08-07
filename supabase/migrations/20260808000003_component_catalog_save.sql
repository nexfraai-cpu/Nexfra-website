-- ============================================================================
-- Nexfra ERP — Supabase Migration 009: Component Catalog Save Support
-- Date: 2026-08-08
-- ============================================================================
--
-- PHASE 3 — PERSISTING EDITS TO THE COMPONENT CATALOG.
--
-- Purpose: Extend the component catalog so that edits made in the "Edit
-- Components" modal (add/rename/reorder/enable-disable sections, specs and
-- options; required/optional flags; price differentials; defaults) can be
-- durably written to the database.
--
-- It does NOT modify or drop any existing quotation table, and it does NOT
-- alter any existing quotation data. Historical quotations store their own
-- spec-value snapshots and are therefore unaffected by catalog changes.
--
-- Change in this migration:
--   * Add `specs.required`  (TEXT or BOOLEAN) so a spec can be marked
--     required vs optional. The quotation builder's "optional" toggle was
--     previously kept only in frontend runtime state; persisting it here
--     makes the catalogue the source of truth.
--
-- The reconcile logic itself lives in the API service (backend-orchestrated
-- upserts with snapshots + compensation for rollback), NOT in a DB function.
-- ============================================================================

ALTER TABLE specs
  ADD COLUMN IF NOT EXISTS required BOOLEAN NOT NULL DEFAULT true;