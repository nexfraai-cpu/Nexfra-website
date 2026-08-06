-- ============================================================================
-- Nexfra ERP — Migration 006: production_stage_records.updated_by
--
-- Fixes SQLSTATE 42703 ("record \"new\" has no field \"updated_by\"") raised by
-- the ownership write trigger trg_production_stage_records_ownership on every
-- UPDATE of production_stage_records.
--
-- trigger_set_ownership() (created in migration 003) sets NEW.updated_by on the
-- UPDATE branch. Unlike every other ownership-enabled table, production_stage_records
-- was granted only created_by in migration 003 and never gained updated_by, so the
-- UPDATE branch of the trigger dereferenced a non-existent column and threw 42703.
--
-- This adds the missing column to bring production_stage_records into line with the
-- shared ownership architecture (created_by + updated_by), matching exactly how every
-- other table in migration 003 receives its updated_by column. It does NOT rewrite or
-- bypass the ownership system and does NOT change any API.
-- ============================================================================

ALTER TABLE production_stage_records
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES employees(id) ON DELETE SET NULL;