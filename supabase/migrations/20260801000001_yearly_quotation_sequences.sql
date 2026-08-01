-- ----------------------------------------------------------------------------
-- ATOMIC YEARLY QUOTATION SEQUENCES
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS quotation_yearly_sequences (
  year        INTEGER PRIMARY KEY,
  current_val INTEGER NOT NULL DEFAULT 0
);

CREATE OR REPLACE FUNCTION get_next_quotation_sequence(p_year INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_next_val INTEGER;
BEGIN
  INSERT INTO quotation_yearly_sequences (year, current_val)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE
  SET current_val = quotation_yearly_sequences.current_val + 1
  RETURNING current_val INTO v_next_val;

  RETURN v_next_val;
END;
$$ LANGUAGE plpgsql;
