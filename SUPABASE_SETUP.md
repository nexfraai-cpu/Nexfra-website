# Nexfra ERP — Supabase Setup Guide

## Prerequisites

- Supabase account (https://supabase.com)
- Supabase CLI (optional, for local development)
- Node.js 18+

---

## Option A: Supabase Dashboard (Recommended for First Setup)

### Step 1: Create a Supabase Project

1. Go to https://supabase.com/dashboard
2. Click **New project**
3. Fill in:
   - **Name:** `nexfra-erp`
   - **Database Password:** Generate a strong password and save it
   - **Region:** Choose the closest to your users (e.g., `Singapore` for India)
4. Click **Create new project**
5. Wait 2–3 minutes for provisioning

### Step 2: Run the Schema Migration

1. In the Supabase Dashboard, go to **SQL Editor**
2. Click **New query**
3. Open `supabase/migrations/20260731000001_schema.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or `CMD+Enter`)

This creates:
- 6 enum types
- 5 sequences
- 19 tables
- 33 indexes
- 14 `updated_at` triggers
- Auth trigger (auto-creates employee on signup)
- Full Row-Level Security (77 policies)
- 3 helper functions
- 3 views

### Step 3: Apply Seed Data

1. Open a **New query** in SQL Editor
2. Open `supabase/migrations/20260731000002_seed.sql`
3. Copy the entire contents
4. Paste and click **Run**

This seeds:
- 3 product categories (Trailer, Tipper, Rigid)
- 5 product templates (Flat Bed, Side Wall, Tip Trailer, Box Body, Rock Body)
- 4 app settings (pricing coefficients, system defaults, bank details, terms)
- 3 storage buckets (quotation-pdfs, attachments, company-assets)
- Storage RLS policies

### Step 4: Configure Authentication

1. Go to **Authentication → Settings**
2. Under **User signups**:
   - Enable **Allow new users to sign up**
   - (Optional) Restrict to specific email domains: `@nexframfg.com`
3. Under **Security**:
   - Session duration: `3600` seconds (1 hour) or adjust as needed

### Step 5: Enable Email/Password Auth

1. Go to **Authentication → Providers**
2. Ensure **Email** is enabled
3. Under **Email Auth Settings**:
   - **Confirm email:** `OFF` (for internal ERP, skip email confirmation)
   - **Secure email change:** `ON`

### Step 6: Create the Admin User

1. Go to **Authentication → Users**
2. Click **Invite** or **Add user**
3. Enter: `admin@nexframfg.com`
4. Set a strong password
5. In **User Meta Data**, add:
   ```json
   {
     "full_name": "Administrator",
     "role": "admin"
   }
   ```
6. Click **Save**

The `on_auth_user_created` trigger automatically creates a matching row in the `employees` table with employee number `EMP-000001`.

### Step 7: Create Additional Users

For each employee, invite them via **Authentication → Users → Invite**.

Set their `role` in **User Meta Data** to one of:
- `admin` — Full system access
- `sales` — Quotations and customers
- `finance` — Accounts and payments
- `manager` — Work orders and production

---

## Option B: Supabase CLI (Local Development)

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
# or
brew install supabase/tap/supabase
```

### Step 2: Link to Remote Project

```bash
supabase link --project-ref <your-project-ref>
```

Your project ref is found in Supabase Dashboard → Project Settings → General → Reference ID.

### Step 3: Push Migrations

```bash
supabase db push
```

This applies all migrations from `supabase/migrations/` in order.

### Step 4: Start Local Development

```bash
supabase start
```

This runs a full Supabase stack locally (PostgreSQL, Auth, Storage, etc.).

---

## Environment Variables

The frontend talks to the backend API and never needs Supabase keys. Only the
backend connects to Supabase directly.

**Backend** (`backend/.env` — required):

```bash
# backend/.env
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
```

**Frontend** (`.env` — no Supabase values):

```bash
# .env
VITE_APP_ENV=development
VITE_STORAGE_PROVIDER=api
VITE_API_URL=http://localhost:4000
```

Find `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` in Supabase Dashboard →
**Project Settings → API**:
- **Project URL** → `SUPABASE_URL`
- **service_role** → `SUPABASE_SERVICE_KEY` (secret — server-side only, never in the browser)

---

## Table Reference

| # | Table | Purpose | Key Columns |
|---|-------|---------|-------------|
| 1 | `employees` | User accounts linked to Supabase Auth | `auth_id`, `employee_number`, `role`, `status` |
| 2 | `customers` | Client companies and contacts | `customer_number`, `company`, `gst`, `outstanding` |
| 3 | `products` | Product categories (Trailer, Tipper, Rigid) | `key`, `name` |
| 4 | `product_templates` | Product variants (Flatbed, Box Body, etc.) | `product_id`, `key`, `base_price` |
| 5 | `product_template_specs` | Spec definitions per template | `template_id`, `spec_key`, `spec_type` |
| 6 | `product_spec_options` | Available options and price diffs per spec | `spec_id`, `option_name`, `price_diff` |
| 7 | `quotations` | Quotation headers — the core business document | `quotation_number`, `customer_id`, `total`, `status` |
| 8 | `quotation_spec_values` | Selected spec values per quotation | `quotation_id`, `spec_key`, `selected_value` |
| 9 | `quotation_custom_items` | Custom line items added to quotations | `quotation_id`, `name`, `price` |
| 10 | `work_orders` | Work order headers from approved quotations | `work_order_number`, `quotation_id`, `status` |
| 11 | `production_items` | Production tracking per work order | `work_order_id`, `current_stage` |
| 12 | `production_stage_records` | Granular stage completions | `production_item_id`, `stage_key` |
| 13 | `chassis_records` | Vehicle chassis tracking | `work_order_id`, `chassis_number` |
| 14 | `sales` | Sales ledger records | `invoice_number`, `quotation_id`, `amount`, `status` |
| 15 | `payments` | Payment records against sales | `payment_number`, `sale_id`, `amount`, `mode` |
| 16 | `audit_logs` | System activity trail | `employee_id`, `action`, `entity_type` |
| 17 | `custom_item_definitions` | Reusable custom item templates | `name`, `default_price` |
| 18 | `app_settings` | Key-value config store | `key`, `value` (JSONB) |
| 19 | `product_spec_overrides` | Admin overrides for spec defaults/pricing | `template_key`, `spec_key` |

---

## Business Numbering Sequences

| Prefix | Table | Column | Example | Sequence |
|--------|-------|--------|---------|----------|
| EMP | `employees` | `employee_number` | EMP-000001 | `seq_employees` |
| CUS | `customers` | `customer_number` | CUS-000001 | `seq_customers` |
| Initials/year | `quotations` | `quotation_number` | JP/2026/000001 | `quotation_yearly_sequences` |
| WO | `work_orders` | `work_order_number` | WO-000001 | `seq_work_orders` |
| PAY | `payments` | `payment_number` | PAY-000001 | `seq_payments` |

All numbers are zero-padded to 6 digits. Generated automatically via `DEFAULT` values; no manual insertion needed.

---

## Row-Level Security Summary

### Role-Based Access Matrix

| Table | Admin | Sales | Finance | Manager |
|-------|-------|-------|---------|---------|
| employees | CRUD | Self-read | Self-read | Self-read |
| customers | CRUD | CRUD | — | — |
| products | CRUD | Read | Read | Read |
| product_templates | CRUD | Read | Read | Read |
| product_template_specs | CRUD | Read | Read | Read |
| product_spec_options | CRUD | Read | Read | Read |
| quotations | CRUD | CRUD | Read | Read |
| quotation_spec_values | CRUD | CRUD | Read | Read |
| quotation_custom_items | CRUD | CRUD | — | — |
| work_orders | CRUD | Read | — | CRUD |
| production_items | CRUD | Read | — | CRUD |
| production_stage_records | CRUD | — | — | CRUD |
| chassis_records | CRUD | Read | — | CRUD |
| sales | CRUD | Read | CRUD | Read |
| payments | CRUD | Read | CRUD | Read |
| audit_logs | CRUD | Read | Read | Read |
| custom_item_definitions | CRUD | Read | Read | Read |
| app_settings | CRUD | Read | Read | Read |
| product_spec_overrides | CRUD | Read | Read | Read |

### Key: CRUD = All operations, Read = SELECT only, — = No access

---

## Storage Buckets

| Bucket | Public | Max Size | Allowed Types | Purpose |
|--------|--------|----------|---------------|---------|
| `quotation-pdfs` | Yes | 10 MB | PDF | Generated quotation PDFs |
| `attachments` | No | 50 MB | PNG, JPEG, WebP, PDF, DOC, DOCX | Private file attachments |
| `company-assets` | Yes | 20 MB | PNG, JPEG, SVG, WebP, PDF | Logos, brand assets, templates |

---

## Troubleshooting

### Auth Trigger Not Firing

If creating a user in Supabase Auth doesn't create an employee record:

```sql
-- Check if the trigger exists
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'users' AND trigger_schema = 'auth';

-- Manually create an employee record for an existing auth user
INSERT INTO employees (auth_id, email, full_name, role)
VALUES (
  '<auth-user-uuid>',
  'user@example.com',
  'User Name',
  'sales'
);
```

### RLS Blocking Queries

If you get "permission denied" errors:

```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'quotations';

-- Temporarily disable RLS for debugging (do not use in production)
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;
```

### Sequence Skipping Numbers

Sequences are not affected by transaction rollbacks. Gaps in numbering are normal and expected in PostgreSQL.
