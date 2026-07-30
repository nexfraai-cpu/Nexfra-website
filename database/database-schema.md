# Nexfra ERP — Database Architecture

## ER Diagram (Text)

```
┌─────────────────┐       ┌──────────────────────┐
│    employees    │──1:N──│     quotations       │
│                 │       │                      │
│                 │──1:N──│     work_orders      │
│                 │       │                      │
│                 │──1:N──│    audit_logs        │
└─────────────────┘       └──────────────────────┘
                                 │
      ┌──────────────────────────┤
      │           │              │
      ▼           ▼              ▼
┌──────────┐ ┌─────────┐ ┌──────────────┐
│quotation │ │quotation│ │    sales     │
│_spec_    │ │_custom_ │ │              │
│values    │ │_items   │ │──1:N──payments│
└──────────┘ └─────────┘ └──────────────┘
                                 │
                                 ▼
                          ┌──────────────┐
                          │ work_orders  │──1:N──production_items
                          │              │──1:N──chassis_records
                          └──────────────┘

┌──────────────────┐
│    products      │──1:N──product_templates──1:N──product_template_specs
│                  │                                      │
│──1:N──custom_item│                               product_spec_options
│_definitions      │
│                  │
│──1:N──app_settings
└──────────────────┘

┌──────────────────┐
│   customers      │──1:N──quotations
│                  │──1:N──chassis_records
└──────────────────┘
```

## Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Tables | snake_case, plural | `quotations`, `work_orders` |
| Columns | snake_case | `full_name`, `created_at` |
| Primary keys | `id` (UUID v7) | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| Foreign keys | `{referenced_table}_id` | `customer_id`, `approved_by` |
| Indexes | `idx_{table}_{column}` | `idx_quotations_status` |
| Unique constraints | `uq_{table}_{columns}` | `uq_employees_email` |
| Sequences | `seq_{table}` | `seq_employees` |
| Enums | UPPER_SNAKE_CASE | `user_role`, `quotation_status` |

## Key Design Decisions

### 1. UUID v7 Primary Keys
All tables use UUID v7 as primary keys. UUID v7 is time-ordered, cluster-safe, and Supabase-compatible. Business-facing identifiers (EMP-000001, NQ-000001) are stored as separate sequential columns.

### 2. Soft Delete Strategy
Every entity table has `deleted_at TIMESTAMPTZ`. When deleted, only `deleted_at` is set. No data is ever physically removed. Queries include `WHERE deleted_at IS NULL` by default.

### 3. Audit Strategy
Every entity table has:
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `created_by UUID REFERENCES employees(id)`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `deleted_at TIMESTAMPTZ`

Plus a dedicated `audit_logs` table for high-level system activity (quotation approved, work order created, etc.).

### 4. Versioning Strategy
Quotations and work orders use a `version INTEGER NOT NULL DEFAULT 1` column. When updated, version increments. This enables optimistic locking and change tracking.

### 5. Sequential Numbering Strategy
Separate sequences for each business entity:

| Prefix | Sequence | Example | Table |
|---|---|---|---|
| EMP | `seq_employees` | EMP-000001 | employees |
| CUS | `seq_customers` | CUS-000001 | customers |
| NQ | `seq_quotations` | NQ-000001 | quotations |
| WO | `seq_work_orders` | WO-000001 | work_orders |
| PAY | `seq_payments` | PAY-000001 | payments |

Generated via:
```sql
'EMP-' || LPAD(NEXTVAL('seq_employees')::TEXT, 6, '0')
```

### 6. Soft Delete + Referential Integrity
Foreign keys use `ON DELETE SET NULL` or `ON UPDATE CASCADE`. Soft-deleted records are never hard-deleted. Cascade rules:

| Action | Rule |
|---|---|
| Parent deleted (soft) | Children retain FK reference |
| Parent updated | `ON UPDATE CASCADE` for business keys |
| Parent hard-deleted | `ON DELETE SET NULL` for audit references |

## Enum Types

```sql
CREATE TYPE user_role AS ENUM ('admin', 'sales', 'finance', 'manager');
CREATE TYPE employee_status AS ENUM ('Active', 'Disabled');
CREATE TYPE quotation_status AS ENUM ('Draft', 'Pending', 'Approved', 'Denied');
CREATE TYPE payment_mode AS ENUM ('Cash', 'RTGS', 'Cheque', 'UPI', 'Card', 'Other');
CREATE TYPE production_stage AS ENUM (
  'Pending', 'Material Ordered', 'Cutting', 'Fabrication', 'Welding',
  'Painting', 'Assembly', 'QC', 'Ready', 'Delivered'
);
CREATE TYPE order_status AS ENUM ('Pending', 'Partial', 'Paid');
```

## Index Strategy

| Table | Index | Type | Purpose |
|---|---|---|---|
| employees | `idx_employees_email` | UNIQUE | Login lookup |
| employees | `idx_employees_role` | B-tree | Role filtering |
| employees | `idx_employees_status` | B-tree | Active/disabled filter |
| customers | `idx_customers_email` | B-tree | Lookup |
| customers | `idx_customers_company` | B-tree | Company search |
| customers | `idx_customers_gst` | UNIQUE | GST lookup |
| quotations | `idx_quotations_status` | B-tree | Status filtering |
| quotations | `idx_quotations_customer` | B-tree | Customer lookups |
| quotations | `idx_quotations_created_by` | B-tree | Creator lookups |
| quotations | `idx_quotations_created_at` | B-tree (DESC) | Date range queries |
| work_orders | `idx_work_orders_quotation` | B-tree | Quotation lookup |
| work_orders | `idx_work_orders_status` | B-tree | Status filtering |
| work_orders | `idx_work_orders_due_date` | B-tree | Due date sorting |
| production_items | `idx_production_stage` | B-tree | Stage filtering |
| sales | `idx_sales_customer` | B-tree | Customer lookups |
| sales | `idx_sales_status` | B-tree | Payment status |
| payments | `idx_payments_sale` | B-tree | Sale lookups |
| payments | `idx_payments_date` | B-tree | Date range |
| audit_logs | `idx_audit_logs_employee` | B-tree | Per-employee audit |
| audit_logs | `idx_audit_logs_created_at` | B-tree (DESC) | Reverse chronological |

## Table Definitions

### employees

Stores all user accounts. Authentication is handled via Supabase Auth; this table links to `auth.users` via `auth_id`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| auth_id | UUID | UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL | Supabase Auth link |
| employee_number | TEXT | UNIQUE NOT NULL | EMP-000001 |
| full_name | TEXT | NOT NULL | |
| email | TEXT | UNIQUE NOT NULL | |
| phone | TEXT | | |
| employee_code | TEXT | | Optional internal code |
| role | user_role | NOT NULL DEFAULT 'sales' | |
| status | employee_status | NOT NULL DEFAULT 'Active' | |
| password_hash | TEXT | | Supabase Auth handles this |
| last_login_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | Soft delete |

Indexes: UNIQUE on `email`, UNIQUE on `employee_number`, B-tree on `role`, `status`.

### customers

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| customer_number | TEXT | UNIQUE NOT NULL | CUS-000001 |
| name | TEXT | NOT NULL | Contact person name |
| company | TEXT | NOT NULL | Company name |
| gst | TEXT | UNIQUE | GSTIN |
| phone | TEXT | | |
| email | TEXT | | |
| address | TEXT | | |
| vehicles | JSONB | DEFAULT '[]'::jsonb | Array of vehicle numbers |
| outstanding | NUMERIC(12,2) | DEFAULT 0 | Computed from sales-payments |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

### products

Product categories (e.g., Trailer, Tipper, Rigid Load Body).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| key | TEXT | UNIQUE NOT NULL | Code: 'trailer', 'tipper', 'rigid' |
| name | TEXT | NOT NULL | Display name |
| description | TEXT | | |
| sort_order | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### product_templates

Product subtypes (e.g., Flat Bed Trailer, Side Wall Trailer, Box Body Tipper).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| product_id | UUID | NOT NULL REFERENCES products(id) ON DELETE CASCADE | Parent product |
| key | TEXT | NOT NULL | Code: 'flatbed', 'boxbody' |
| name | TEXT | NOT NULL | Display name |
| base_price | NUMERIC(12,2) | NOT NULL DEFAULT 0 | Base price before options |
| dimensions | JSONB | DEFAULT '{}'::jsonb | {length, width, height} defaults |
| sort_order | INTEGER | DEFAULT 0 | |
| is_active | BOOLEAN | DEFAULT true | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

UNIQUE: `(product_id, key)`.

### product_template_specs

Specifications that make up a product template (e.g., Floor Sheet Type, Axle Brand).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| template_id | UUID | NOT NULL REFERENCES product_templates(id) ON DELETE CASCADE | |
| spec_key | TEXT | NOT NULL | Code: 'beam', 'floor', 'axles' |
| name | TEXT | NOT NULL | Display name |
| section | TEXT | NOT NULL | 'material', 'chassis', 'hydraulic', etc. |
| spec_type | TEXT | NOT NULL DEFAULT 'dropdown' | 'dropdown', 'radio', 'text', 'number' |
| default_value | TEXT | | |
| sort_order | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

UNIQUE: `(template_id, spec_key)`.

### product_spec_options

Available options within a spec dropdown/radio, including pricing deltas.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| spec_id | UUID | NOT NULL REFERENCES product_template_specs(id) ON DELETE CASCADE | |
| option_name | TEXT | NOT NULL | Display label |
| price_diff | NUMERIC(10,2) | NOT NULL DEFAULT 0 | Price delta from base |
| is_default | BOOLEAN | DEFAULT false | |
| sort_order | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

UNIQUE: `(spec_id, option_name)`.

### quotations

Quotation headers. The core business document.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| quotation_number | TEXT | UNIQUE NOT NULL | NQ-000001 |
| version | INTEGER | NOT NULL DEFAULT 1 | Optimistic locking |
| customer_id | UUID | REFERENCES customers(id) ON DELETE SET NULL | |
| customer_name | TEXT | NOT NULL | Snapshot at creation |
| customer_details | JSONB | DEFAULT '{}'::jsonb | Contact snapshot |
| product_key | TEXT | | 'trailer', 'tipper', 'rigid' |
| template_key | TEXT | | 'flatbed', 'boxbody', etc. |
| capacity | TEXT | | '25 CBM', '40 Feet' |
| dimensions | JSONB | DEFAULT '{}'::jsonb | {length, width, height} |
| total | NUMERIC(12,2) | NOT NULL DEFAULT 0 | Computed total |
| manual_total | NUMERIC(12,2) | | Override total |
| gst_rate | NUMERIC(5,2) | NOT NULL DEFAULT 18 | GST percentage |
| order_qty | INTEGER | NOT NULL DEFAULT 1 | |
| status | quotation_status | NOT NULL DEFAULT 'Draft' | |
| terms | JSONB | DEFAULT '[]'::jsonb | Array of term strings |
| scope_of_work | TEXT | | |
| bank_details | JSONB | DEFAULT '{}'::jsonb | {companyName, bankName, ...} |
| notes | TEXT | Internal notes | |
| approved_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| approved_at | TIMESTAMPTZ | | |
| denied_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| denied_at | TIMESTAMPTZ | | |
| denied_reason | TEXT | | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

Indexes: B-tree on `status`, `customer_id`, `created_by`, `created_at`.

### quotation_spec_values

Selected specification values for each quotation. This is the core configurator data.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| quotation_id | UUID | NOT NULL REFERENCES quotations(id) ON DELETE CASCADE | |
| spec_key | TEXT | NOT NULL | Reference to product_template_specs.spec_key |
| spec_name | TEXT | NOT NULL | Snapshot of spec name |
| section | TEXT | NOT NULL | Snapshot of section |
| selected_value | TEXT | | The chosen option |
| custom_description | TEXT | | For 'Custom' option type |
| custom_price | NUMERIC(10,2) | | For 'Custom' option type |
| is_not_required | BOOLEAN | DEFAULT false | Marked as N/R |
| effective_price_diff | NUMERIC(10,2) | NOT NULL DEFAULT 0 | Resolved price delta |

UNIQUE: `(quotation_id, spec_key)`.

### quotation_custom_items

User-added custom line items on a quotation (GPS, Camera, Extra Toolbox, etc.).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| quotation_id | UUID | NOT NULL REFERENCES quotations(id) ON DELETE CASCADE | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| quantity | INTEGER | NOT NULL DEFAULT 1 | |
| price | NUMERIC(10,2) | NOT NULL DEFAULT 0 | Unit price |
| sort_order | INTEGER | DEFAULT 0 | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### work_orders

Generated from approved quotations.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| work_order_number | TEXT | UNIQUE NOT NULL | WO-000001 |
| version | INTEGER | NOT NULL DEFAULT 1 | |
| quotation_id | UUID | REFERENCES quotations(id) ON DELETE SET NULL | |
| customer_name | TEXT | NOT NULL | Snapshot |
| product_name | TEXT | NOT NULL | Snapshot |
| specifications | JSONB | DEFAULT '{}'::jsonb | Full spec snapshot |
| dimensions | JSONB | DEFAULT '{}'::jsonb | |
| colour | TEXT | | |
| quantity | INTEGER | NOT NULL DEFAULT 1 | |
| factory_notes | TEXT | | |
| due_date | DATE | | |
| is_urgent | BOOLEAN | DEFAULT false | |
| status | TEXT | NOT NULL DEFAULT 'Open' | 'Open', 'In Production', 'Completed' |
| booked_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| approved_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

Indexes: B-tree on `quotation_id`, `status`, `due_date`, `is_urgent`.

### production_items

Production tracking record linked to a work order.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| work_order_id | UUID | NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE | |
| quotation_id | UUID | REFERENCES quotations(id) ON DELETE SET NULL | Redundant but convenient |
| current_stage | production_stage | NOT NULL DEFAULT 'Pending' | |
| stage_progress | JSONB | DEFAULT '{}'::jsonb | {stageKey: done/timestamp} |
| dispatch_fields | JSONB | DEFAULT '{}'::jsonb | Custom dispatch data |
| started_at | TIMESTAMPTZ | | |
| completed_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

### production_stage_records

Individual stage completions within a production item, enabling granular tracking.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| production_item_id | UUID | NOT NULL REFERENCES production_items(id) ON DELETE CASCADE | |
| stage_key | TEXT | NOT NULL | |
| stage_name | TEXT | NOT NULL | |
| is_completed | BOOLEAN | DEFAULT false | |
| completed_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| completed_at | TIMESTAMPTZ | | |
| remark | TEXT | | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

UNIQUE: `(production_item_id, stage_key)`.

### chassis_records

Vehicle chassis tracking linked to work orders.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| work_order_id | UUID | REFERENCES work_orders(id) ON DELETE SET NULL | |
| customer_id | UUID | REFERENCES customers(id) ON DELETE SET NULL | |
| field | TEXT | | Operational field |
| brand | TEXT | | Chassis brand |
| model | TEXT | | Chassis model |
| chassis_number | TEXT | | VIN / chassis number |
| arrival_date | DATE | | Date chassis arrived |
| customer_name | TEXT | | Snapshot |
| product_name | TEXT | | Snapshot |
| notes | TEXT | | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

### sales

Sales ledger records (one per completed quotation).

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| invoice_number | TEXT | UNIQUE NOT NULL | Derived from quotation |
| quotation_id | UUID | REFERENCES quotations(id) ON DELETE SET NULL | |
| customer_name | TEXT | NOT NULL | Snapshot |
| product_name | TEXT | NOT NULL | Snapshot |
| amount | NUMERIC(12,2) | NOT NULL | Total sale amount |
| status | order_status | NOT NULL DEFAULT 'Pending' | |
| delivery_date | DATE | | |
| notes | TEXT | | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

Indexes: B-tree on `customer_name`, `status`.

### payments

Payment records against sales invoices.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| payment_number | TEXT | UNIQUE NOT NULL | PAY-000001 |
| sale_id | UUID | NOT NULL REFERENCES sales(id) ON DELETE CASCADE | |
| amount | NUMERIC(12,2) | NOT NULL | |
| mode | payment_mode | NOT NULL DEFAULT 'Cash' | |
| reference | TEXT | | Cheque/transaction number |
| payment_date | DATE | NOT NULL DEFAULT CURRENT_DATE | |
| notes | TEXT | | |
| received_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| deleted_at | TIMESTAMPTZ | | |

Indexes: B-tree on `sale_id`, `payment_date`.

### audit_logs

System activity trail.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| employee_id | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| action | TEXT | NOT NULL | 'created', 'approved', 'denied', etc. |
| entity_type | TEXT | NOT NULL | 'quotation', 'work_order', 'employee' |
| entity_id | TEXT | | Business identifier |
| description | TEXT | NOT NULL | Human-readable message |
| metadata | JSONB | DEFAULT '{}'::jsonb | Additional context |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

Indexes: B-tree on `employee_id`, `created_at`, `(entity_type, entity_id)`.

### custom_item_definitions

Reusable custom item templates that can be added to quotations.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| name | TEXT | NOT NULL | |
| description | TEXT | | |
| default_price | NUMERIC(10,2) | NOT NULL DEFAULT 0 | |
| is_active | BOOLEAN | DEFAULT true | |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### app_settings

Key-value store for application configuration.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| key | TEXT | UNIQUE NOT NULL | Setting key |
| value | JSONB | NOT NULL | Arbitrary JSON value |
| description | TEXT | | |
| updated_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

### product_spec_overrides

Admin overrides for product specification defaults and pricing.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| id | UUID | PK DEFAULT gen_random_uuid() | |
| template_key | TEXT | NOT NULL | e.g. 'flatbed' |
| spec_key | TEXT | NOT NULL | e.g. 'beam' |
| override_data | JSONB | NOT NULL | {defaultValue, priceDiffs, etc.} |
| created_by | UUID | REFERENCES employees(id) ON DELETE SET NULL | |
| created_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |
| updated_at | TIMESTAMPTZ | NOT NULL DEFAULT now() | |

UNIQUE: `(template_key, spec_key)`.

## Sequences

```sql
CREATE SEQUENCE seq_employees START 1 INCREMENT 1;
CREATE SEQUENCE seq_customers START 1 INCREMENT 1;
CREATE SEQUENCE seq_quotations START 1 INCREMENT 1;
CREATE SEQUENCE seq_work_orders START 1 INCREMENT 1;
CREATE SEQUENCE seq_payments START 1 INCREMENT 1;
```

## Trigger: Auto-update updated_at

```sql
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
```

## Row-Level Security (Future Supabase)

Each table should have RLS enabled with policies scoping access by `user_role`. The `created_by` column enables per-user filtering. Admin bypasses all policies.

## Seed Data

### Employees
One initial admin employee is created via Supabase Auth trigger. The employee record is auto-created when the first admin user signs up.

### Products & Templates
Seeded from the frontend's `WIZARD_PRODUCT_TEMPLATES` and `dev-data.js` product definitions. This seed data populates `products`, `product_templates`, `product_template_specs`, and `product_spec_options`.

### App Settings
Default pricing coefficients seeded from frontend's `adminPricing` defaults.
