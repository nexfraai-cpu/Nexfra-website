# Nexfra ERP — Project Structure

## Root Directory

```
/
├── index.html                  # Public website (landing page)
│   Uses: app.js               ── Marketing content, login modal, team showcase
│   Contains: <script type="module" src="app.js">
│
├── erp.html                    # ERP control panel
│   Uses: erp.js               ── All internal ERP functionality
│   Contains: <script type="module" src="erp.js">
│   Legacy: 124 inline onclick handlers (data-action migration WIP)
│
├── app.js                      # Public website logic (~600 lines)
│   Imports: config, services (Auth, Emp, Customer, Product, Quotation)
│   Responsibilities:
│   ├── Hero section with GSAP animation
│   ├── Employee login modal & form submission
│   ├── Product showcase section rendering
│   ├── Customer display section
│   ├── Quotation display section
│   ├── Stats counter animation
│   └── Footer
│
├── erp.js                      # ERP control panel logic (~5900 lines)
│   Imports: config, all 9 services, storage, utils
│   Responsibilities:
│   ├── Session management (auth check, role caching)
│   ├── Module switching & sidebar rendering
│   ├── Dashboard module (KPI cards, charts, activity feed)
│   ├── Quotation module (CRUD, wizard, PDF, approvals)
│   ├── Work Order module (CRUD, production tracking, chassis)
│   ├── Customer module (CRUD, search, outstanding)
│   ├── Employee module (CRUD, role management)
│   ├── Finance module (sales ledger, payments, monthly stats)
│   ├── Admin module (settings, pricing, system reset)
│   └── Utilities (modal, notification, date helpers, escHtml)
│   State: 4 module-scope vars (_editingChassisId, _editState, _moduleFilters, _approvalsFilter)
│
├── styles.css                  # All CSS (~6800 lines)
│   Sections:
│   ├── CSS Custom Properties (color, spacing, typography tokens)
│   ├── Reset & base styles
│   ├── Layout (sidebar, main, header)
│   ├── Dashboard module
│   ├── Tables (shared)
│   ├── Forms & inputs
│   ├── Buttons & actions
│   ├── Modal & notification
│   ├── Quotation module (wizard, spec cards, PDF preview)
│   ├── Work Order module (production items, chassis timeline)
│   ├── Customer module
│   ├── Employee module
│   ├── Finance module
│   ├── Admin module
│   ├── Filters & search
│   ├── Responsive breakpoints
│   └── GSAP-specific animation styles
│
├── vite.config.js              # Vite build configuration
│   ├── Input: index.html, erp.html (multi-page app)
│   ├── Plugin: terser with drop_console, drop_debugger
│   └── Dev server port: 3000
│
├── package.json                # Project metadata & scripts
│   Scripts:
│   ├── dev   → vite (dev server)
│   ├── build → vite build (production)
│   └── preview → vite preview (preview built assets)
│   Dependencies: html2canvas, jspdf, html2pdf.js, gsap
│   DevDependencies: vite, terser
│
├── .env                        # Environment variables (gitignored)
│   VITE_STORAGE_PROVIDER=localStorage
│   VITE_API_URL=http://localhost:4000
│
├── .env.example                # Environment template (tracked)
│
├── vercel.json                 # Vercel deployment configuration
│   ├── SPA rewrites (/* → /index.html)
│   ├── JS module headers
│   └── Directory listings disabled
│
├── .gitignore                  # Git ignore rules
│   Ignores: node_modules/, dist/, .env, *.local
│
├── about.md                    # Original project specification & brand identity
│
├── README.md                   # Project overview & quick start
│
├── ARCHITECTURE.md             # System architecture (this guide)
├── ROADMAP.md                  # Phase-based project plan
├── CODING_STANDARDS.md         # Coding conventions
├── CONTRIBUTING.md             # Contributor workflow
├── DECISIONS.md                # Architecture Decision Records
├── PROJECT_STRUCTURE.md        # This file
├── SECURITY.md                 # Security model
├── DEPLOYMENT_ARCHITECTURE.md  # Deployment infrastructure
├── TECH_STACK.md               # Technology rationale
├── BACKLOG.md                  # Prioritized task list
│
├── backend-api.md              # REST API endpoint specification
├── deployment.md               # Deployment guide (Vercel)
├── SUPABASE_SETUP.md           # Supabase setup guide
│
└── assets/                     # Static assets (7 files)
    ├── logo.svg               ── Company logo
    ├── hero-bg.webp           ── Hero section background
    ├── fabrication.webp       ── Product photo: Fabrication
    ├── trolley.webp           ── Product photo: Trolley
    ├── aluminum.webp          ── Product photo: Aluminum
    ├── oven.webp              ── Product photo: Industrial Oven
    └── freezer.webp           ── Product photo: Deep Freezer
```

---

## Source Directory (`src/`)

```
src/
├── config.js                   # Central configuration module
│   Contains:
│   ├── CONFIG object:
│   │   ├── STORAGE_KEYS       ── LocalStorage key constants
│   │   ├── STORAGE_PROVIDER   ── 'localStorage' | 'api'
│   │   ├── API_BASE_URL       ── Backend API base URL
│   │   ├── MODULES            ── Module definitions with permissions
│   │   ├── PRODUCT_TEMPLATES  ── 5 product family definitions
│   │   └── FEATURE_FLAGS      ── Feature gates for dev features
│   ├── isDevelopment()        ── Returns true in dev mode
│   └── isResetDataEnabled()   ── Feature flag for admin reset
│
├── dev-data.js                 # Development data factory
│   Exports: getDefaultEmployee(), getDefaultSettings()
│   └── Creates initial employee for fresh localStorage state
│
├── storage/
│   ├── index.js               ── StorageProvider factory
│   │   Exports:
│   │   ├── getStorageProvider() ── Returns LocalStorageProvider | ApiProvider
│   │   └── instance           ── Singleton provider instance
│   │
│   ├── StorageProvider.js     ── Abstract base class
│   │   Interface:
│   │   ├── get(key)           ── Returns string | null
│   │   ├── set(key, value)    ── Stores string
│   │   ├── getJSON(key)       ── Returns parsed object | null
│   │   └── setJSON(k, val)    ── JSON.stringify + store
│   │
│   ├── LocalStorageProvider.js ── Browser localStorage implementation
│   │   └── Wraps localStorage.getItem/setItem with JSON helpers
│   │
│   └── ApiProvider.js         ── REST API implementation (stub)
│       └── Calls CONFIG.API_BASE_URL REST endpoints
│
├── services/
│   ├── index.js               ── Service exports (not used yet)
│   │   Future: barrel exports for all services
│   │
│   ├── BaseService.js         ── Abstract base for all services
│   │   Methods:
│   │   ├── loadState()        ── Loads app state via StorageProvider
│   │   ├── saveState(state)   ── Saves app state via StorageProvider
│   │   └── logActivity(msg)   ── Appends to audit log
│   │
│   ├── AuthenticationService.js ── Singleton auth manager
│   │   Methods:
│   │   ├── login(email, password) ── Authenticate & persist session
│   │   ├── logout()            ── Clear session & redirect
│   │   └── getCurrentUser()    ── Return cached session user
│   │
│   ├── EmployeeService.js     ── Employee CRUD + authentication
│   │   Methods: getAll, getById, getByEmail, create, update, delete, updatePassword, authenticate
│   │
│   ├── CustomerService.js     ── Customer CRUD + outstanding balance
│   │   Methods: getAll, getById, create, update, delete, recalculateOutstanding
│   │
│   ├── ProductService.js      ── Product template & spec access
│   │   Methods: getAll, getTemplates, getTemplate
│   │
│   ├── QuotationService.js    ── Quotation CRUD + workflow
│   │   Methods: getAll, getById, create, update, delete, approve, deny
│   │
│   ├── WorkOrderService.js    ── Work order CRUD + production
│   │   Methods: getAll, getById, create, update, delete, updateDueDate, updateUrgent
│   │
│   ├── FinanceService.js      ── Sales ledger & payments
│   │   Methods: getSales, getPayments, createSale, createPayment, getMonthlyStats
│   │
│   └── AdminService.js        ── Admin operations
│       Methods: getPricingCoefficients, setPricingCoefficients, getProducts, updateProducts, getAuditLogs, resetAllData
│
└── utils/
    ├── index.js               ── Utility exports (not used yet)
    ├── Logger.js              ── Logging utility (info, warn, error)
    └── ErrorHandler.js        ── Error types (AppError, ValidationError, NotFoundError, AuthError)
```

---

## Database Directory (`database/`)

```
database/
├── database-schema.md          # Documentation: ER diagram, 19 table specs
├── schema.sql                  # Full PostgreSQL schema (can run standalone)
```

---

## Supabase Directory (`supabase/`)

```
supabase/
├── migrations/
│   ├── 20260731000001_schema.sql   ── Full schema (19 tables, enums, RLS, views, trigers)
│   └── 20260731000002_seed.sql     ── Seed data + storage bucket creation
├── seed.sql                        ── Local development seed data
└── SUPABASE_SETUP.md               ── Step-by-step Supabase setup guide
```

---

## Build Output (`dist/`)

```
dist/
├── index.html                  # Built public website
├── erp.html                    # Built ERP page
├── assets/                     # Bundled JS + CSS
│   ├── index-xxxx.js          ── app.js bundle (minified)
│   ├── erp-xxxx.js            ── erp.js bundle (minified)
│   └── index-xxxx.css         ── styles.css bundle (minified)
└── assets/                     # Static image files
```

---

## Planned Backend (`server/`)

```
server/                         # Not yet created
├── index.js                   ── Entry point
├── config/                    ── Environment configuration
├── routes/                    ── Express route definitions
├── controllers/               ── Request handlers
├── services/                  ── Business logic
├── middleware/                ── Auth, validation, errors
├── validators/               ── Request validation schemas
├── utils/                    ── Shared utilities
└── db/                       ── Database client & queries
```
