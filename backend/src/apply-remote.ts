import { config } from './config/index.js';
import { supabase } from './database/client.js';

async function main() {
  const sql = `
    ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS payment_due_date DATE,
      ADD COLUMN IF NOT EXISTS finance_owner UUID REFERENCES employees(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_quotations_finance_owner
      ON quotations (finance_owner);

    CREATE INDEX IF NOT EXISTS idx_quotations_status_finance_owner
      ON quotations (status, finance_owner);
  `;

  console.log('Checking information_schema.columns via Supabase client...');
  const { data: colsBefore, error: errBefore } = await supabase
    .from('quotations')
    .select('id, quotation_number, status, finance_owner, payment_due_date')
    .limit(1);

  console.log('Query result before migration:', { data: colsBefore, error: errBefore });
}

main();
