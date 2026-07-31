# Nexfra ERP — Project Roadmap

## Phase Legend

| Phase | Status | Description |
|---|---|---|
| ✅ Complete | Shipped | Fully implemented and tested |
| 🔧 In Progress | Active | Currently being worked on |
| 📋 Planned | Documented | Spec written, not started |
| 🔮 Future | Backlog | Concept only |

---

## Phase 1: Frontend Foundation ✅

**Objective:** Build complete ERP frontend with all business functionality.

### Deliverables

- [x] Public landing website (`index.html` + `app.js`)
- [x] ERP control panel (`erp.html` + `erp.js`)
- [x] Product configurator wizard with 5 product templates
- [x] Quotation builder with PDF generation (html2pdf.js)
- [x] Work order management with production tracking
- [x] Finance ledger with payment tracking
- [x] Employee management with role-based access
- [x] Customer directory with history
- [x] Approval workflow (Pending → Approved/Denied)
- [x] Chassis record management
- [x] Dashboard overview with metrics
- [x] Search, filters, and date presets across modules
- [x] Responsive design with dark theme
- [x] GSAP animations and scroll-triggered reveals

### Architecture Decisions

- [x] Vanilla JavaScript (no framework)
- [x] Vite bundler with terser minification
- [x] localStorage as persistence layer
- [x] Hardcoded product template definitions
- [x] CSS custom properties design system

---

## Phase 2: Frontend Architecture Cleanup ✅

**Objective:** Refactor the codebase for maintainability and future backend integration.

### Deliverables

- [x] Extract config module (`src/config.js`)
- [x] Create StorageProvider abstraction (`src/storage/`)
- [x] Create service layer (`src/services/`)
- [x] Create utility modules (`src/utils/`)
- [x] Convert `app.js` to ES module with service imports
- [x] Convert `erp.js` to ES module with service imports
- [x] Remove hardcoded credentials (`admin123`, `changeme`)
- [x] Hide development features behind feature flags
- [x] Remove duplicate code (`escHtml`, inline EmployeeService)
- [x] Move state variables from `window.*` to module scope
- [x] Cache session info to reduce localStorage reads
- [x] Create development data module (`src/dev-data.js`)
- [x] Configure terser `drop_console: true` for production
- [x] Write deployment documentation
- [x] Write backend API specification
- [x] Create Vercel deployment configuration
- [x] Run architecture audit and produce report

---

## Phase 3: Database Design & Supabase Setup ✅

**Objective:** Design the production database schema and prepare Supabase infrastructure.

### Deliverables

- [x] ER diagram and relationship documentation
- [x] PostgreSQL schema with 19 tables
- [x] 6 enum types for role/status/stage constraints
- [x] 5 sequential numbering sequences (EMP, CUS, NQ, WO, PAY)
- [x] 33 indexes with partial index optimization
- [x] 14 `updated_at` triggers
- [x] Soft delete strategy (`deleted_at` pattern)
- [x] Audit logging table and functions
- [x] Auth trigger for auto-creating employee records
- [x] 3 storage buckets with RLS policies
- [x] Row-Level Security (77 policies across all tables)
- [x] 3 business views (outstanding, revenue, pipeline)
- [x] Seed data for products, templates, settings
- [x] Versioned Supabase migration files
- [x] Supabase setup guide
- [x] Local development seed file
- [x] Coding standards and contribution guide

---

## Phase 4: Architecture Documentation 📋

**Objective:** Freeze the project architecture with comprehensive documentation.

### Deliverables

- [x] `ARCHITECTURE.md` — System architecture overview
- [x] `ROADMAP.md` — Phase tracking (this document)
- [x] `CODING_STANDARDS.md` — Project-wide standards
- [x] `CONTRIBUTING.md` — Contributor workflow
- [x] `DECISIONS.md` — Architecture Decision Records
- [x] `PROJECT_STRUCTURE.md` — Folder responsibilities
- [x] `SECURITY.md` — Authentication, authorization, secrets
- [x] `DEPLOYMENT_ARCHITECTURE.md` — Infrastructure diagram
- [x] `TECH_STACK.md` — Technology justification
- [x] `BACKLOG.md` — Prioritized task backlog

---

## Phase 5: Backend Implementation 📋

**Objective:** Build the Express.js REST API following the documented architecture.

### Deliverables

- [ ] Initialize Express.js project with ES modules
- [ ] Configure environment-based settings
- [ ] Implement middleware (auth, validation, error handling, CORS, rate limiting)
- [ ] Implement Supabase client SDK integration
- [ ] Implement `ApiProvider` — fulfill the StorageProvider contract
- [ ] Implement Authentication endpoints:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- [ ] Implement Employee endpoints:
  - `GET /api/employees`
  - `GET /api/employees/:id`
  - `POST /api/employees`
  - `PUT /api/employees/:id`
  - `DELETE /api/employees/:id`
  - `PATCH /api/employees/:id/status`
  - `PATCH /api/employees/:id/password`
- [ ] Implement Customer endpoints:
  - `GET /api/customers`
  - `GET /api/customers/:id`
  - `POST /api/customers`
  - `PUT /api/customers/:id`
  - `DELETE /api/customers/:id`
- [ ] Implement Product endpoints:
  - `GET /api/products`
  - `GET /api/products/:key/templates`
  - `GET /api/templates/:key/specs`
- [ ] Implement Quotation endpoints:
  - `GET /api/quotations`
  - `GET /api/quotations/:id`
  - `POST /api/quotations`
  - `PUT /api/quotations/:id`
  - `PATCH /api/quotations/:id/approve`
  - `PATCH /api/quotations/:id/deny`
  - `DELETE /api/quotations/:id`
- [ ] Implement Work Order endpoints:
  - `GET /api/work-orders`
  - `GET /api/work-orders/:id`
  - `POST /api/work-orders`
  - `PUT /api/work-orders/:id`
  - `PATCH /api/work-orders/:id/due-date`
  - `PATCH /api/work-orders/:id/urgent`
- [ ] Implement Production endpoints:
  - `GET /api/production`
  - `PATCH /api/production/:id/stage`
  - `POST /api/production/:id/chassis`
  - `GET /api/production/:id/chassis`
- [ ] Implement Finance endpoints:
  - `GET /api/finance/sales`
  - `GET /api/finance/payments`
  - `POST /api/finance/sales`
  - `POST /api/finance/payments`
  - `GET /api/finance/stats`
- [ ] Implement Admin endpoints:
  - `GET /api/admin/pricing`
  - `PUT /api/admin/pricing`
  - `GET /api/admin/products`
  - `PUT /api/admin/products`
  - `GET /api/admin/logs`
- [ ] Implement Storage endpoints (ApiProvider bridge):
  - `GET /api/storage/:key`
  - `POST /api/storage/:key`
- [ ] Write API integration tests
- [ ] Document API with JSDoc / OpenAPI

---

## Phase 6: Frontend-Backend Integration 📋

**Objective:** Connect the frontend to the Express API via the ApiProvider.

### Deliverables

- [ ] Complete `ApiProvider` implementation in frontend
- [ ] Set `VITE_STORAGE_PROVIDER=api` and `VITE_API_BASE_URL`
- [ ] Update `AuthenticationService` to use Supabase Auth
- [ ] Update `EmployeeService` to use API
- [ ] Update `CustomerService` to use API
- [ ] Update `ProductService` to use API
- [ ] Update `QuotationService` to use API
- [ ] Update `WorkOrderService` to use API
- [ ] Update `FinanceService` to use API
- [ ] Update `AdminService` to use API
- [ ] Remove `loadState`/`saveState` from `BaseService`
- [ ] Migrate product templates from frontend to database
- [ ] Test every module end-to-end
- [ ] Remove localStorage fallback code
- [ ] Update `.env.example` for production
- [ ] Write integration tests

---

## Phase 7: Production Deployment 📋

**Objective:** Deploy the complete system to production.

### Deliverables

- [ ] Set up Supabase production project
- [ ] Run database migrations
- [ ] Deploy Express API to production (Render / Railway / Fly.io)
- [ ] Deploy frontend to Vercel production
- [ ] Configure custom domains:
  - `www.nexfra.in` → Vercel (frontend)
  - `erp.nexfra.in` → Vercel (frontend)
  - `api.nexfra.in` → Express server
- [ ] Configure SSL certificates
- [ ] Set up environment variables
- [ ] Create admin user
- [ ] Test end-to-end flow
- [ ] Configure database backups
- [ ] Set up monitoring and alerting
- [ ] Document runbook

---

## Phase 8: Testing & QA 📋

**Objective:** Comprehensive testing before user rollout.

### Deliverables

- [ ] Unit tests for all services (Jest)
- [ ] Integration tests for all API endpoints
- [ ] End-to-end tests for critical flows:
  - User login → quotation creation → PDF download
  - Quotation approval → work order creation → production tracking
  - Payment recording → outstanding balance recalculation
- [ ] Security audit
- [ ] Performance testing
- [ ] Load testing (k6 or Artillery)
- [ ] Accessibility audit
- [ ] Cross-browser testing
- [ ] Mobile responsiveness testing

---

## Phase 9: User Training & Rollout 🔮

**Objective:** Train users and roll out the system.

### Deliverables

- [ ] Create user manuals
- [ ] Record training videos
- [ ] Conduct training sessions
- [ ] Set up support channels
- [ ] Soft launch with pilot users
- [ ] Gather feedback
- [ ] Bug fixes and iteration
- [ ] Full production rollout
- [ ] Post-launch monitoring period

---

## Phase 14: Data Migration Tools ✅

**Objective:** Migrate legacy `localStorage` ERP data into PostgreSQL via an intermediate JSON file.

### Deliverables

- [x] Browser export tool (`tools/export-localstorage.html`) — dumps all `NEXFRA_*` localStorage keys to JSON
- [x] Migration module (`backend/src/migration/`) — types, zod validator, mapper, service
- [x] Migration CLI (`backend/scripts/migrate.ts`) — dry-run, inspect, import + verify
- [x] Deterministic UUID mapping from legacy string IDs (relationship preservation)
- [x] Entity mapping:
  - Employees → `employees`
  - Customers → `customers`
  - Products → `products` + `product_templates` + `product_template_specs` + `product_spec_options`
  - Quotations → `quotations` + `quotation_spec_values`
  - Work Orders → `work_orders`
  - Production → `production_items`
  - Finance → `sales` + `payments`
  - Audit Logs → `audit_logs`
  - Chassis / Custom Items / Spec Overrides / Admin Pricing / Counters → respective tables + `app_settings`
- [x] Post-import verification report per table
- [x] Unit tests (16 tests) for mapper, validator, and service
- [x] Sample fixture (`backend/tests/fixtures/nexfra-legacy.sample.json`)
- [x] Migration documentation (`backend/src/migration/README.md`)

---

## Future Improvements 🔮

### Q4 2026

- **Inventory Management** — Raw material stock tracking
- **Purchase Orders** — Supplier management and PO generation
- **Invoice Generator** — GST-compliant invoice PDFs
- **Email Integration** — Send quotations and invoices via email
- **WhatsApp Integration** — Share quotations via WhatsApp

### Q1 2027

- **Customer Portal** — Customers can view quotations, track orders, make payments
- **Analytics Dashboard** — Revenue trends, production efficiency, sales performance
- **Mobile App** — React Native / Flutter companion app for factory floor
- **Multi-language Support** — Hindi and other regional languages
- **Offline Mode** — PWA with offline capability for factory floor

### Q2 2027+

- **AI-Powered Quotation Assistant** — Recommend specs based on customer history
- **Predictive Production Planning** — ML-based delivery date estimation
- **Barcode/RFID Integration** — Scan chassis and materials
- **ERP API Public** — Expose API for third-party integration
- **Multi-tenant** — Support for multiple manufacturing companies
