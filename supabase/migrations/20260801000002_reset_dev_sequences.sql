-- Function to reset development sequences
CREATE OR REPLACE FUNCTION reset_dev_sequences()
RETURNS VOID AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'seq_quotations') THEN
    ALTER SEQUENCE seq_quotations RESTART WITH 1;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_sequences WHERE sequencename = 'seq_work_orders') THEN
    ALTER SEQUENCE seq_work_orders RESTART WITH 1;
  END IF;
END;
$$ LANGUAGE plpgsql;
