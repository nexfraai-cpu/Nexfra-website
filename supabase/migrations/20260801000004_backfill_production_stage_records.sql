-- ----------------------------------------------------------------------------
-- BACKFILL production_stage_records FROM stale stage_progress JSON
-- ----------------------------------------------------------------------------
-- Before this migration, production progress was persisted as a JSONB map on
-- production_items.stage_progress (e.g. {"sec_design_sub_design_items_scopeClear": true}).
-- production_stage_records is now the single source of truth, so we normalise any
-- surviving stage_progress maps into stage records. This fixes refresh
-- inconsistencies where the board computed progress from stage_progress while the
-- stage/column state derived from current_stage.
--
-- Idempotent: re-running is safe (upsert on production_item_id + stage_key).
-- Completed keys become is_completed = true records; other recorded keys become
-- incomplete records so un-completing a stage round-trips correctly.

INSERT INTO production_stage_records (
  production_item_id,
  stage_key,
  stage_name,
  is_completed,
  completed_by,
  completed_at,
  remark,
  created_at
)
SELECT
  pi.id,
  key_value.key,
  key_value.key,
  (key_value.value <> 'false') AS is_completed,
  NULL AS completed_by,
  CASE
    WHEN key_value.value <> 'false' AND key_value.value ~ '^\d{4}-\d{2}-\d{2}' THEN key_value.value::timestamptz
    WHEN key_value.value <> 'false' THEN pi.updated_at
    ELSE NULL
  END AS completed_at,
  NULL AS remark,
  COALESCE(pi.updated_at, now()) AS created_at
FROM production_items pi
CROSS JOIN LATERAL jsonb_each_text(COALESCE(pi.stage_progress, '{}'::jsonb)) AS key_value(key, value)
WHERE pi.deleted_at IS NULL
  AND pi.stage_progress IS NOT NULL
  AND pi.stage_progress <> '{}'::jsonb
ON CONFLICT (production_item_id, stage_key) DO NOTHING;

-- Deprecate the stale duplicate columns so reads no longer drift.
-- Values remain in place for rollback, but the schema now treats
-- stage_records as authoritative.
COMMENT ON COLUMN production_items.stage_progress IS
  'DEPRECATED: legacy JSONB mirror of production_stage_records. Kept for rollback only.';
COMMENT ON COLUMN production_items.current_stage IS
  'DEPRECATED (except linear Pending->Delivered flow): progress/board column is derived from production_stage_records.';
