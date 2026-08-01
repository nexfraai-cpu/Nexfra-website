-- Finance ownership workflow.
-- A finance employee claims an approved quotation (first ownership action =
-- setting the payment due date). Once claimed, finance_owner locks the record
-- to that employee; other finance employees no longer see it in the inbox.

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS finance_owner UUID REFERENCES employees(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotations_finance_owner
  ON quotations (finance_owner);

CREATE INDEX IF NOT EXISTS idx_quotations_status_finance_owner
  ON quotations (status, finance_owner);

-- RLS policies for finance role
DROP POLICY IF EXISTS "quotations_finance_select" ON quotations;
CREATE POLICY "quotations_finance_select" ON quotations
  FOR SELECT USING (
    auth_has_role('finance')
    AND (
      finance_owner = auth_employee_id()
      OR (status = 'Approved' AND finance_owner IS NULL)
    )
  );

DROP POLICY IF EXISTS "quotations_finance_update_claim" ON quotations;
CREATE POLICY "quotations_finance_update_claim" ON quotations
  FOR UPDATE USING (
    auth_has_role('finance')
    AND status = 'Approved'
    AND (finance_owner IS NULL OR finance_owner = auth_employee_id())
  )
  WITH CHECK (
    auth_has_role('finance')
  );
