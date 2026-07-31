import { config } from './config/index.js';

async function tryExec() {
  const ref = 'zktvgbhpboftljmswzvw';
  const sql = `
    ALTER TABLE quotations
      ADD COLUMN IF NOT EXISTS payment_due_date DATE,
      ADD COLUMN IF NOT EXISTS finance_owner UUID REFERENCES employees(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_quotations_finance_owner
      ON quotations (finance_owner);

    CREATE INDEX IF NOT EXISTS idx_quotations_status_finance_owner
      ON quotations (status, finance_owner);
  `;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': config.supabaseServiceKey,
    'Authorization': `Bearer ${config.supabaseServiceKey}`,
  };

  // Try 1: /rest/v1/rpc
  console.log('Testing RPCs...');
  const rpcNames = ['exec_sql', 'exec', 'execute_sql', 'query', 'run_sql', 'sql'];
  for (const name of rpcNames) {
    try {
      const res = await fetch(`${config.supabaseUrl}/rest/v1/rpc/${name}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: sql, sql: sql, sql_query: sql }),
      });
      console.log(`RPC /${name}: status=${res.status}`, await res.text());
    } catch (e: any) {
      console.log(`RPC /${name} err:`, e.message);
    }
  }

  // Try 2: Management API endpoints
  const apiUrls = [
    `https://api.supabase.com/v1/projects/${ref}/db/query`,
    `https://api.supabase.com/v1/projects/${ref}/sql`,
    `https://api.supabase.com/v1/projects/${ref}/query`,
    `${config.supabaseUrl}/db/query`,
    `${config.supabaseUrl}/sql`,
  ];

  for (const url of apiUrls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ query: sql }),
      });
      console.log(`API ${url}: status=${res.status}`, await res.text());
    } catch (e: any) {
      console.log(`API ${url} err:`, e.message);
    }
  }
}

tryExec();
