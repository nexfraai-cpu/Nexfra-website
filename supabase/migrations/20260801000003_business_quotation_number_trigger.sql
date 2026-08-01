-- ----------------------------------------------------------------------------
-- BUSINESS QUOTATION NUMBER SAFETY NET
-- ----------------------------------------------------------------------------
-- Application code generates <INITIALS>/<YEAR>/<SEQUENCE>. This trigger protects
-- direct database inserts and prevents retired placeholder prefixes reappearing.

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

CREATE OR REPLACE FUNCTION customer_initials_for_quotation(p_customer_name TEXT)
RETURNS TEXT AS $$
DECLARE
  clean_name TEXT;
  words TEXT[];
BEGIN
  clean_name := trim(regexp_replace(coalesce(p_customer_name, ''), '[^a-zA-Z0-9\s]', '', 'g'));
  words := regexp_split_to_array(clean_name, '\s+');
  IF array_length(words, 1) >= 2 THEN
    RETURN upper(left(words[1], 1) || left(words[2], 1));
  ELSIF array_length(words, 1) = 1 AND length(words[1]) > 0 THEN
    RETURN upper(left(words[1], 1) || 'X');
  END IF;
  RETURN 'XX';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION trigger_set_business_quotation_number()
RETURNS TRIGGER AS $$
DECLARE
  v_year INTEGER;
  v_seq INTEGER;
  v_legacy_prefix TEXT := chr(78) || chr(81) || '-';
BEGIN
  IF NEW.quotation_number IS NULL OR NEW.quotation_number LIKE v_legacy_prefix || '%' THEN
    v_year := EXTRACT(YEAR FROM now())::INTEGER;
    v_seq := get_next_quotation_sequence(v_year);
    NEW.quotation_number := customer_initials_for_quotation(NEW.customer_name) || '/' || v_year || '/' || LPAD(v_seq::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE quotations ALTER COLUMN quotation_number DROP DEFAULT;

DROP TRIGGER IF EXISTS trg_business_quotation_number ON quotations;
CREATE TRIGGER trg_business_quotation_number
  BEFORE INSERT ON quotations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_business_quotation_number();
