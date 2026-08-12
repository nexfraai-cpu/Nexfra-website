-- Add out_date column to chassis_records to persist the chassis "out date"
-- captured by the Chassis Filtering allocation UI (previously only in-memory).
ALTER TABLE chassis_records
  ADD COLUMN IF NOT EXISTS out_date DATE;