# Nexfra ERP — Data Migration Guide (Phase 14)

Runbook for migrating the legacy frontend `localStorage` ERP data into
PostgreSQL (Supabase). The migration is a two-step pipeline:

```
localStorage ──(browser)──▶ JSON ──(backend CLI)──▶ PostgreSQL
```

## Prerequisites

1. The Supabase schema migration has been applied
   (`supabase/migrations/20260731000001_schema.sql`).
2. `backend/.env` contains `SUPABASE_URL` and `SUPABASE_SERVICE_KEY`
   (the service role key bypasses RLS so inserts succeed).
3. Node 20+ with `tsx` available (`npm install` in `backend/`).

## Step 1 — Export localStorage → JSON

Open **`tools/export-localstorage.html`** in the same browser/domain that holds
the legacy data (i.e. before the frontend switched to `VITE_STORAGE_PROVIDER=api`).

- The page lists every detected `NEXFRA_*` key with its size.
- Click **Download nexfra-legacy.json** (or **Copy to clipboard**).
- You may also export manually from the DevTools console:

```js
// DevTools console — copy the output into a file
JSON.stringify({ storage: { NEXFRA_ERP_STATE: JSON.parse(localStorage.getItem('NEXFRA_ERP_STATE') || '{}') } }, null, 2)
```

> The wrapper object `{ storage: { NEXFRA_ERP_STATE: {...}, ... } }` is what the
> CLI expects. Passing the bare state blob also works.

## Step 2 — Validate & preview (dry run)

```bash
cd backend
npm run migrate -- ../nexfra-legacy.json --dry-run
# or: tsx scripts/migrate.ts ../nexfra-legacy.json --dry-run
```

Produces a per-table report (expected / inserted / verified) **without writing
anything**. Inspect the exact rows with:

```bash
npm run migrate -- ../nexfra-legacy.json --dry-run --inspect
```

## Step 3 — Import into PostgreSQL

```bash
cd backend
npm run migrate -- ../nexfra-legacy.json
```

The CLI:

- Inserts rows in dependency order (employees → customers → products
  hierarchy → quotations → work orders → production → sales → payments →
  audit logs → settings).
- Re-verifies each table by counting rows against the source.
- Exits `2` on insert errors or mismatched counts, `3` on validation failure.

## Step 4 — Verify

After import, check the report — every entity should show `OK`:

- Employees, Customers, Products, Quotations, Work Orders, Finance (Sales +
  Payments), Audit Logs, plus production/chassis/settings.

Spot-check relationships in the DB:

```sql
-- A migrated quotation must link to its customer
SELECT q.quotation_number, q.customer_name, c.customer_number
FROM quotations q LEFT JOIN customers c ON c.id = q.customer_id
WHERE q.deleted_at IS NULL;

-- A migrated payment must link to its sale
SELECT p.payment_number, s.invoice_number, p.amount
FROM payments p LEFT JOIN sales s ON s.id = p.sale_id
WHERE p.deleted_at IS NULL;
```

## What is migrated (mapping)

| Legacy state key             | Target tables                                                        |
|------------------------------|----------------------------------------------------------------------|
| `employees`                  | `employees`                                                          |
| `customers`                  | `customers`                                                          |
| `products`                   | `products`, `product_templates`, `product_template_specs`, `product_spec_options` |
| `quotations`                 | `quotations`, `quotation_spec_values`                                |
| `workOrders`                 | `work_orders`                                                        |
| `productionItems`            | `production_items`                                                   |
| `sales`                      | `sales`                                                              |
| `payments`                   | `payments`                                                           |
| `logs`                       | `audit_logs`                                                         |
| `chassisRecords`             | `chassis_records`                                                    |
| `customItemDefinitions`      | `custom_item_definitions`                                            |
| `productSpecOverrides`       | `product_spec_overrides`                                             |
| `adminPricing`               | `app_settings` (`pricing_coefficients`)                              |
| `quotationCounter`/`employeeCounter` | `app_settings` (`legacy_counters`)                           |

### Notable normalizations

- **Quotation status** `Pending Approval` → `Pending`.
- **Customer GST** `Pending`/empty → `NULL` (GST is UNIQUE).
- **Work order stage** `Pending` → `Open`.
- **Production stage** `Not Started` → `Pending`.
- **Employee passwords are NOT migrated** — authentication is handled by
  Supabase Auth; create auth users separately after import.

## Rollback / re-run

IDs are deterministic (UUID v5 derived from legacy IDs), so re-running the
import is safe: the same legacy ID always maps to the same UUID. To fully roll
back a prior import, delete the migrated rows first, then re-run.

## Troubleshooting

| Symptom                    | Cause                                          | Fix                                        |
|----------------------------|------------------------------------------------|--------------------------------------------|
| `Missing required environment variable: SUPABASE_URL` | `backend/.env` not configured | Set Supabase URL + service key and re-run  |
| Exit code `2` / `MISMATCH` | Source count exceeds rows landed in the DB     | Read per-table errors; check unique conflicts (e.g. duplicate GST) |
| `Invalid legacy state: ...` | Export is not a valid state blob               | Re-export with `tools/export-localstorage.html` |

## References

- Module docs: `backend/src/migration/README.md`
- Sample fixture: `backend/tests/fixtures/nexfra-legacy.sample.json`
- Tests: `npx jest src/migration` (in `backend/`)
