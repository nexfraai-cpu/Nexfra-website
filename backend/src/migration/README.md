# Migration — Legacy localStorage → PostgreSQL

Converts the Nexfra ERP frontend's legacy `localStorage` data into PostgreSQL
(PostgREST / Supabase). Data flows through an intermediate JSON file:

```
localStorage ──(browser export tool)──▶ JSON ──(migration CLI)──▶ PostgreSQL
```

## Flow

1. **Export** — open `tools/export-localstorage.html` in the browser that holds
   the legacy data and download `nexfra-legacy.json`. The file contains every
   `NEXFRA_*` key from `localStorage` wrapped as:
   ```json
   { "storage": { "NEXFRA_ERP_STATE": { ... }, "NEXFRA_AUTH_TOKEN": "true", ... } }
   ```
2. **Validate + map (dry run)** — confirm the JSON parses and see what would be
   imported without touching the database.
3. **Import** — write the mapped rows to PostgreSQL and verify each entity.

## CLI

```bash
# From backend/
tsx scripts/migrate.ts nexfra-legacy.json --dry-run   # validate + report only
tsx scripts/migrate.ts nexfra-legacy.json --inspect   # print the full mapped bundle
tsx scripts/migrate.ts nexfra-legacy.json             # import into PostgreSQL
```

Requires `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in `backend/.env`.

The service also accepts the *raw* state blob (just the `NEXFRA_ERP_STATE`
value) in addition to the wrapped export.

## What gets migrated

| Entity              | Source (`localStorage`)            | PostgreSQL table(s)                                  |
|---------------------|------------------------------------|------------------------------------------------------|
| Employees           | `state.employees`                  | `employees`                                          |
| Customers           | `state.customers`                  | `customers`                                          |
| Products            | `state.products`                   | `products`, `product_templates`, `product_template_specs`, `product_spec_options` |
| Quotations          | `state.quotations`                 | `quotations`, `quotation_spec_values`                |
| Work Orders         | `state.workOrders`                 | `work_orders`                                        |
| Production          | `state.productionItems`            | `production_items`                                   |
| Finance (Sales)     | `state.sales`                      | `sales`                                              |
| Finance (Payments)  | `state.payments`                   | `payments`                                           |
| Audit Logs          | `state.logs`                       | `audit_logs`                                         |
| Chassis Records     | `state.chassisRecords`             | `chassis_records`                                    |
| Custom Item Defs    | `state.customItemDefinitions`      | `custom_item_definitions`                            |
| Spec Overrides      | `state.productSpecOverrides`       | `product_spec_overrides`                             |
| Admin Pricing       | `state.adminPricing`               | `app_settings` (`pricing_coefficients`)              |
| Counters            | `state.quotationCounter`/`employeeCounter` | `app_settings` (`legacy_counters`)            |

## ID mapping

Legacy entities use human-readable string IDs (`CUST-001`, `EMP-000001`,
`WO-2026-001`, `TL/001/2026`, `INV-000001`). PostgreSQL uses UUIDs. The mapper
derives **deterministic UUIDs** from legacy IDs (UUID v5 with a fixed
namespace), so:

- Referential links survive (quotation → customer, payment → sale,
  production item → work order via `quoteId`).
- Re-running the migration produces identical IDs (safe to retry).

## Data normalization

| Legacy value                      | Normalized to                                  |
|-----------------------------------|------------------------------------------------|
| Quotation status `Pending Approval` | `Pending`                                    |
| Customer GST `Pending` / empty     | `null` (GST column is UNIQUE)                 |
| Work order stage `Pending`         | `Open` (DB default)                           |
| Production stage `Not Started`     | `Pending`                                     |
| Employee role (any case)           | lowercase; invalid → `sales`                  |
| Payment mode (unknown)             | `Cash`                                        |
| Sale status (unknown)              | `Pending`                                     |

Employees' plaintext `password` is **not** migrated (no password column;
authentication is handled by Supabase Auth).

## Verification

After import, the service verifies each table in
`VERIFICATION_PLAN` by counting rows and comparing against the expected source
count. A `MISMATCH` status (or exit code `2`) means the source count exceeds
what ended up in the database — investigate per-table errors in the report.

## Tests

```bash
npx jest src/migration
```

Covers: deterministic ID generation, per-entity mapping (employees, customers,
products hierarchy, quotations + spec values, work orders, production items,
sales, payments, audit logs, app settings), relationship linking, validation,
dry-run behaviour, and insert execution.
