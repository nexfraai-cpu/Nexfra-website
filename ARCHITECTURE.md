# Nexfra ERP — System Architecture

## Overview

Nexfra ERP is a two-tier web application comprising a **public-facing company website** and an **internal ERP control panel**. The frontend is a vanilla JavaScript single-page application (SPA) built with Vite. The backend is planned as an Express.js REST API backed by PostgreSQL (Supabase).

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐  │
│  │   index.html        │  │   erp.html                   │  │
│  │   (Public Website)  │  │   (ERP Control Panel)        │  │
│  │                     │  │                              │  │
│  │   app.js (module)   │  │   erp.js (module)            │  │
│  └─────────┬───────────┘  └──────────────┬───────────────┘  │
│            │                              │                  │
└────────────┼──────────────────────────────┼──────────────────┘
             │                              │
             ▼                              ▼
      ┌───────────┐                 ┌──────────────┐
      │  Vite     │                 │  Vite Build  │
      │  Dev Server│                 │  (Static)    │
      └───────────┘                 └──────┬───────┘
                                           │
                              ┌────────────┴────────────┐
                              │                         │
                              ▼                         ▼
                     ┌──────────────┐          ┌──────────────┐
                     │  Vercel     │          │  Express API │
                     │  (Static)   │          │  (Planned)   │
                     └──────────────┘          └──────┬───────┘
                                                      │
                                                      ▼
                                             ┌────────────────┐
                                             │   Supabase     │
                                             │  (PostgreSQL)  │
                                             │  + Auth        │
                                             │  + Storage     │
                                             └────────────────┘
```

## Frontend Architecture

### Entry Points

| Page | File | Purpose |
|---|---|---|
| `/` | `index.html` + `app.js` | Public landing website |
| `/erp` | `erp.html` + `erp.js` | Internal ERP control panel |

Both are ES modules loaded via `<script type="module">`.

### Core Pattern

```
DOM Event
    │
    ▼
Event Handler (in app.js / erp.js)
    │
    ▼
Service Class (src/services/*.js)
    │
    ▼
StorageProvider (src/storage/*.js)
    │
    ▼
localStorage (current) / Supabase API (future)
```

### Module Dependency Graph

```
app.js / erp.js
    │
    ├── src/config.js
    ├── src/dev-data.js
    ├── src/storage/index.js
    │       ├── StorageProvider.js (abstract)
    │       ├── LocalStorageProvider.js
    │       └── ApiProvider.js (stub)
    ├── src/services/
    │       ├── BaseService.js
    │       ├── AuthenticationService.js
    │       ├── EmployeeService.js
    │       ├── CustomerService.js
    │       ├── ProductService.js
    │       ├── QuotationService.js
    │       ├── WorkOrderService.js
    │       ├── FinanceService.js
    │       └── AdminService.js
    └── src/utils/
            ├── Logger.js
            └── ErrorHandler.js
```

### Service Layer Responsibilities

| Service | Responsibility |
|---|---|
| `BaseService` | Shared `loadState`/`saveState`/`logActivity` via StorageProvider |
| `AuthenticationService` | Login, logout, session, role checks (singleton) |
| `EmployeeService` | Employee CRUD, authenticate by email/password |
| `CustomerService` | Customer CRUD, outstanding balance recalculation |
| `ProductService` | Product template definitions, spec overrides, price diffs |
| `QuotationService` | Quotation CRUD, approval/denial workflow |
| `WorkOrderService` | Work order CRUD, production items, chassis records |
| `FinanceService` | Sales ledger, payments, monthly stats |
| `AdminService` | Pricing coefficients, system reset |

### StorageProvider Flow

```
getStorageProvider()
    │
    ├── CONFIG.STORAGE_PROVIDER === 'localStorage'
    │       └── LocalStorageProvider
    │           ├── get(key)       → localStorage.getItem(key)
    │           ├── set(key, val)  → localStorage.setItem(key, val)
    │           ├── getJSON(key)   → JSON.parse(localStorage.getItem(key))
    │           └── setJSON(k, v)  → localStorage.setItem(k, JSON.stringify(v))
    │
    └── CONFIG.STORAGE_PROVIDER === 'api'
            └── ApiProvider (stub)
                ├── get(key)       → fetch(GET /api/storage/:key)
                ├── set(key, val)  → fetch(POST /api/storage/:key)
                ├── getJSON(key)   → fetch(GET /api/storage/:key) + JSON.parse
                └── setJSON(k, v)  → fetch(POST /api/storage/:key, JSON.stringify(v))
```

Switching from `localStorage` to `api` requires only changing `VITE_STORAGE_PROVIDER`. No UI code changes.

## Backend Architecture (Planned)

```
Express.js Server
    │
    ├── /api/auth/*           → AuthenticationController
    ├── /api/employees/*      → EmployeeController
    ├── /api/customers/*      → CustomerController
    ├── /api/quotations/*     → QuotationController
    ├── /api/work-orders/*    → WorkOrderController
    ├── /api/production/*     → ProductionController
    ├── /api/finance/*        → FinanceController
    ├── /api/admin/*          → AdminController
    └── /api/storage/*        → StorageController (for ApiProvider bridge)

Each Controller → Service → Supabase SDK → PostgreSQL
```

### Planned Folder Structure

```
server/
├── index.js                 # Entry point
├── config/                  # Environment-based configuration
├── routes/                  # Express route definitions
├── controllers/             # Request handlers
├── services/                # Business logic
├── middleware/               # Auth, validation, error handling
├── validators/              # Request validation schemas
├── utils/                   # Shared utilities
└── db/                      # Database client & queries
```

## Database Architecture

PostgreSQL 15+ via Supabase. Full schema documented in `database/schema.sql` and `supabase/migrations/`.

### Entity Relationships

```
employees ──1:N──→ quotations ──1:N──→ quotation_spec_values
               │                 │──1:N──→ quotation_custom_items
               │                 │──1:1──→ work_orders ──1:N──→ production_items
               │                                              │──1:N──→ chassis_records
               │                 │──1:1──→ sales ──1:N──→ payments
               │──1:N──→ audit_logs
               │──1:N──→ chassis_records
customers ──1:N──→ quotations
products ──1:N──→ product_templates ──1:N──→ product_template_specs ──1:N──→ product_spec_options
```

## Storage Architecture

Three Supabase Storage buckets:

| Bucket | Public | Max Size | Purpose |
|---|---|---|---|
| `quotation-pdfs` | Yes | 10 MB | Generated quotation PDFs |
| `attachments` | No | 50 MB | Private file uploads (user-scoped) |
| `company-assets` | Yes | 20 MB | Brand assets, logos, templates |

## Authentication Flow

```
1. User visits / → index.html
2. Clicks "Employee Login" → modal opens
3. Enters email + password
4. app.js calls AuthenticationService.login(email, password)
5.   → EmployeeService.authenticate(email, password)
6.     → StorageProvider.getJSON('NEXFRA_ERP_STATE')
7.       → finds employee with matching email + password
8. Returns employee record
9. AuthenticationService._currentUser = employee
10. persistSession() writes to StorageProvider:
      - NEXFRA_AUTH_TOKEN = 'true'
      - NEXFRA_USER_ROLE = employee.role
      - NEXFRA_USER_NAME = employee.fullName
11. Redirect to erp.html

Future (Supabase Auth):
1. User enters email + password
2. supabase.auth.signInWithPassword({ email, password })
3. Returns JWT session
4. JWT stored in HttpOnly cookie
5. All subsequent API calls include Authorization: Bearer <jwt>
6. Auth trigger creates/links employee record
```

## Authorization Flow

```
erp.js load:
    localStorage.getItem(NEXFRA_AUTH_TOKEN) === 'true'
        ? allow access
        : redirect to index.html

Role-based access in sidebar:
    ROLE_PERMISSIONS[moduleName].includes(currentRole)
        ? show sidebar link
        : hide sidebar link

Role-based access in switchModule():
    userCanAccess(moduleName)
        ? render module
        : redirect to default module

Future (Supabase RLS):
    PostgreSQL Row-Level Security
    auth.jwt() ->> 'role' decides row access
    Table-level policies per role
```

## Deployment Architecture

### Development
```
Developer → Vite Dev Server (localhost:3000)
              → localStorage (no backend needed)
```

### Staging
```
Developer → GitHub → Vercel Preview Deploy
                       → Supabase Preview Branch
                         → PostgreSQL + Auth
```

### Production
```
Developer → GitHub → Vercel Production Deploy (Static)
                       ├── www.nexfra.in   → index.html (Vercel)
                       ├── erp.nexfra.in   → erp.html (Vercel)
                       └── api.nexfra.in   → Express (planned)
                                              → Supabase
                                                → PostgreSQL
                                                → Auth
                                                → Storage
```

## Current Folder Structure

```
/
├── index.html                Public website entry
├── erp.html                  ERP control panel entry
├── app.js                    Public website logic (ES module)
├── erp.js                    ERP control panel logic (ES module)
├── styles.css                3460 lines of CSS
├── vite.config.js            Vite build configuration
├── package.json              NPM dependencies
├── vercel.json               Vercel deployment config
├── .env                      Environment variables (dev)
├── .env.example              Environment template (production)
├── .gitignore
├── about.md                  Original project specification
├── README.md                 Project readme
├── ARCHITECTURE.md           This file
├── ROADMAP.md
├── CODING_STANDARDS.md
├── CONTRIBUTING.md
├── DECISIONS.md
├── PROJECT_STRUCTURE.md
├── SECURITY.md
├── DEPLOYMENT_ARCHITECTURE.md
├── TECH_STACK.md
├── BACKLOG.md
├── backend-api.md            API specification
├── deployment.md             Deployment guide
├── SUPABASE_SETUP.md         Supabase setup guide
├── assets/                   7 product/company images
├── src/
│   ├── config.js             Central configuration
│   ├── dev-data.js           Default/demo data factory
│   ├── services/             9 service classes
│   ├── storage/              StorageProvider + 2 implementations
│   └── utils/                Logger + ErrorHandler
├── database/
│   ├── database-schema.md    ER diagram + table docs
│   └── schema.sql            Full PostgreSQL schema
├── supabase/
│   ├── migrations/           Versioned Supabase migrations
│   └── seed.sql              Local development seed data
└── dist/                     Build output (gitignored)
```
