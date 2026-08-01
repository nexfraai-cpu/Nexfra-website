# Nexfra ERP — Backlog

## Priority Legend

| Tag | Meaning | Action Required |
|---|---|---|
| P0 | Critical | Must be done before next phase |
| P1 | High | Important, do next |
| P2 | Medium | Should do when possible |
| P3 | Low | Nice to have |
| P4 | Future | Deferred to later release |

---

## Phase 5: Backend Implementation (P0)

### P0 — Initialize Express Project

- [ ] `npm init` in `server/` directory
- [ ] Set `"type": "module"` in package.json for ES module support
- [ ] Install: express, @supabase/supabase-js, jsonwebtoken, helmet, cors, express-rate-limit, morgan
- [ ] Install dev: nodemon, dotenv
- [ ] Create `server/index.js` entry point
- [ ] Create `server/config/` with environment-aware configuration
- [ ] Create `.env.example` for server
- [ ] Configure CORS for whitelisted origins
- [ ] Configure helmet security headers
- [ ] Configure rate limiting
- [ ] Configure morgan request logging
- [ ] Verify server starts and responds to health check

### P0 — Auth Middleware

- [ ] JWT verification middleware
- [ ] Role-based access middleware
- [ ] Extract user_id and role from JWT for downstream use
- [ ] Return 401 for invalid/expired tokens
- [ ] Return 403 for insufficient permissions

### P0 — Error Handling Middleware

- [ ] Global error handler (catches unhandled errors)
- [ ] Async error wrapper (catches async rejections)
- [ ] Validation error formatter
- [ ] Supabase error mapper

### P0 — Employee Auth Endpoints

- [ ] `POST /api/auth/login` — Validate credentials, return JWT
- [ ] `POST /api/auth/logout` — Invalidate session
- [ ] `GET /api/auth/me` — Return current user

### P0 — Quotation CRUD Endpoints

- [ ] `GET /api/quotations` — List (with role-based filtering)
- [ ] `GET /api/quotations/:id` — Detail (with spec values + custom items)
- [ ] `POST /api/quotations` — Create
- [ ] `PUT /api/quotations/:id` — Update
- [ ] `DELETE /api/quotations/:id` — Soft delete
- [ ] `PATCH /api/quotations/:id/approve` — Approve
- [ ] `PATCH /api/quotations/:id/deny` — Deny
- [ ] Auto-generate quotation number (<INITIALS>/<YEAR>/<SEQ>)

### P0 — Work Order CRUD Endpoints

- [ ] `GET /api/work-orders` — List
- [ ] `GET /api/work-orders/:id` — Detail (with production + chassis)
- [ ] `POST /api/work-orders` — Create (auto-created from approved quotation)
- [ ] `PUT /api/work-orders/:id` — Update
- [ ] `PATCH /api/work-orders/:id/due-date` — Update due date
- [ ] `PATCH /api/work-orders/:id/urgent` — Toggle urgent flag
- [ ] Auto-generate work order number (WO-YYYY-SEQ)

### P0 — Production Endpoints

- [ ] `GET /api/production` — List production items
- [ ] `PATCH /api/production/:id/stage` — Update production stage
- [ ] `POST /api/production/:id/chassis` — Add chassis record
- [ ] `GET /api/production/:id/chassis` — Get chassis timeline

### P0 — Finance Endpoints

- [ ] `GET /api/finance/sales` — List sales ledger
- [ ] `GET /api/finance/payments` — List payments
- [ ] `POST /api/finance/sales` — Create sale record
- [ ] `POST /api/finance/payments` — Create payment
- [ ] `GET /api/finance/stats` — Monthly statistics
- [ ] Auto-generate payment receipt number (PAY-SEQ)

### P0 — Admin Endpoints

- [ ] `GET /api/admin/pricing` — Get pricing coefficients
- [ ] `PUT /api/admin/pricing` — Update pricing coefficients
- [ ] `GET /api/admin/products` — Custom product configurations
- [ ] `PUT /api/admin/products` — Update product configurations
- [ ] `GET /api/admin/logs` — Get audit logs

### P0 — Storage Endpoints (ApiProvider Bridge)

- [ ] `GET /api/storage/:key` — Read stored value
- [ ] `POST /api/storage/:key` — Write stored value

---

## Phase 5: Backend Implementation — Medium Priority (P1)

### P1 — Employee Endpoints

- [ ] `GET /api/employees` — List all employees
- [ ] `GET /api/employees/:id` — Detail
- [ ] `POST /api/employees` — Create
- [ ] `PUT /api/employees/:id` — Update
- [ ] `PATCH /api/employees/:id/password` — Change password (hashed)
- [ ] `PATCH /api/employees/:id/status` — Activate/deactivate
- [ ] `DELETE /api/employees/:id` — Soft delete (SuperAdmin only)

### P1 — Customer Endpoints

- [ ] `GET /api/customers` — List
- [ ] `GET /api/customers/:id` — Detail
- [ ] `POST /api/customers` — Create
- [ ] `PUT /api/customers/:id` — Update
- [ ] `DELETE /api/customers/:id` — Soft delete
- [ ] Auto-generate customer number (CUS-SEQ)

### P1 — Product Endpoints

- [ ] `GET /api/products` — Custom product definitions
- [ ] `GET /api/products/:key/templates` — Get templates for product
- [ ] `GET /api/templates/:key/specs` — Get spec definitions with options

### P1 — Request Validation

- [ ] Request body validation schemas for all POST/PUT endpoints
- [ ] Path parameter validation
- [ ] Query parameter validation (pagination, filters)

---

## Phase 6: Frontend-Backend Integration (P1)

### P1 — ApiProvider Completion

- [ ] Implement `get()` — fetch GET /api/storage/:key
- [ ] Implement `set()` — fetch POST /api/storage/:key
- [ ] Implement `getJSON()` — parse JSON response
- [ ] Implement `setJSON()` — stringify + POST JSON
- [ ] Add error handling (network failure, server error)
- [ ] Add retry logic for transient failures
- [ ] Add loading state to UI during API calls

### P1 — AuthenticationService Migration

- [ ] Add Supabase Auth client import
- [ ] `login()`: Call `supabase.auth.signInWithPassword()` → store JWT
- [ ] `logout()`: Call `supabase.auth.signOut()` → clear JWT
- [ ] `getCurrentUser()`: Decode JWT or call `/auth/me`

### P1 — Service Migration (All Services)

- [ ] EmployeeService: Replace `loadState/saveState` with API calls
- [ ] CustomerService: Replace `loadState/saveState` with API calls
- [ ] ProductService: Replace hardcoded templates with API call
- [ ] QuotationService: Replace `loadState/saveState` with API calls
- [ ] WorkOrderService: Replace `loadState/saveState` with API calls
- [ ] FinanceService: Replace `loadState/saveState` with API calls
- [ ] AdminService: Replace `loadState/saveState` with API calls

### P1 — Config Update

- [ ] Set `VITE_STORAGE_PROVIDER=api` in production `.env`
- [ ] Set `VITE_API_BASE_URL=https://api.nexfra.in` in production `.env`
- [ ] Test every module end-to-end
- [ ] Verify localStorage is no longer accessed in UI code

---

## Phase 7: Production Deployment (P1)

### P1 — Supabase Production Setup

- [ ] Create Supabase production project
- [ ] Run migration: `20260731000001_schema.sql`
- [ ] Run migration: `20260731000002_seed.sql`
- [ ] Configure Auth settings (disable signups, allow password auth)
- [ ] Create initial admin user
- [ ] Configure storage buckets
- [ ] Set up RLS policies
- [ ] Verify database access

### P1 — Vercel Production Setup

- [ ] Connect GitHub repository to Vercel
- [ ] Configure `www.nexfra.in` domain
- [ ] Configure `erp.nexfra.in` domain
- [ ] Set environment variables in Vercel Dashboard
- [ ] Trigger production deployment
- [ ] Verify both domains serve correct content

### P1 — Express Server Production Setup

- [ ] Create Render/Railway account (or chosen provider)
- [ ] Connect GitHub repository
- [ ] Configure environment variables
- [ ] Deploy server
- [ ] Configure `api.nexfra.in` → CNAME → server
- [ ] Verify health check endpoint

### P1 — End-to-End Verification

- [ ] User visits www.nexfra.in → landing page loads
- [ ] User logs in → redirected to erp.nexfra.in
- [ ] User creates quotation → saved to database
- [ ] User approves quotation → work order created
- [ ] User updates production stage → tracked in database
- [ ] User records payment → outstanding balance recalculated

---

## Phase 8: Testing & QA (P2)

### P2 — Unit Tests

- [ ] Set up Jest in frontend project
- [ ] Set up Jest in backend project
- [ ] Test AuthenticationService
- [ ] Test EmployeeService
- [ ] Test CustomerService
- [ ] Test QuotationService
- [ ] Test WorkOrderService
- [ ] Test FinanceService
- [ ] Test AdminService
- [ ] Test StorageProvider + LocalStorageProvider
- [ ] Test ErrorHandler

### P2 — API Integration Tests

- [ ] Test auth flow (login, logout, me)
- [ ] Test quotation CRUD + approval workflow
- [ ] Test work order CRUD + production tracking
- [ ] Test customer CRUD + outstanding balance
- [ ] Test finance CRUD + monthly stats
- [ ] Test admin endpoints
- [ ] Test error responses
- [ ] Test authorization (each role, each endpoint)

### P2 — End-to-End Tests

- [ ] Critical path: Login → Create Quotation → Approve → Work Order → Complete
- [ ] Edge case: Login with invalid credentials
- [ ] Edge case: Access module without permission
- [ ] Edge case: Delete quotation with linked work order
- [ ] Edge case: Payment exceeding outstanding balance

### P2 — Security Testing

- [ ] Attempt SQL injection on all endpoints
- [ ] Attempt XSS on all user-input fields
- [ ] Attempt unauthorized access to all endpoints
- [ ] Attempt IDOR (access other user's data)
- [ ] Verify JWT expiry and refresh flow

---

## Code Improvements (P2)

### P2 — Convert HTML onclick to data-action

- [ ] All 124 onclick handlers in erp.html → `data-action` attributes
- [ ] Module-level delegates in erp.js
- [ ] Remove `window.functionName` exposure for onclick bridge

### P2 — Extract Template Rendering Functions

- [ ] Extract `renderDashboard()`: ~200 lines → separate function
- [ ] Extract `renderQuotations()`: ~150 lines → separate function
- [ ] Extract `renderWorkOrders()`: ~150 lines → separate function
- [ ] Extract `renderCustomers()`: ~80 lines → separate function

### P2 — Move HTML Fragments to Template Strings

- [ ] Extract long template strings from erp.js to template constants
- [ ] Create `templates/` directory or template modules

### P2 — CSS Split

- [ ] Split `styles.css` into module-specific CSS files
- [ ] Import via Vite for automatic code splitting
- [ ] Keep CSS custom properties in master file

### P2 — Service Index Barrel

- [ ] Add barrel exports to `src/services/index.js`
- [ ] Add barrel exports to `src/utils/index.js`

---

## Future Features (P3)

### P3 — Email Integration

- [ ] Set up email service (SendGrid / Resend)
- [ ] Send quotation PDF via email
- [ ] Send approval/denial notification
- [ ] Send payment receipt
- [ ] Email notification preferences per employee

### P3 — WhatsApp Integration

- [ ] WhatsApp Business API integration
- [ ] Share quotation via WhatsApp
- [ ] Send production updates via WhatsApp
- [ ] Payment reminder via WhatsApp

### P3 — PDF Enhancement

- [ ] Professional quotation PDF template
- [ ] GST-compliant invoice PDF
- [ ] Delivery challan PDF
- [ ] Payment receipt PDF

### P3 — Dashboard Enhancement

- [ ] Monthly revenue chart (Chart.js or custom SVG)
- [ ] Production pipeline visualization
- [ ] Top customers by revenue
- [ ] Pending approvals count
- [ ] Export dashboard as PDF report

---

## Future Features (P4)

### P4 — Customer Portal

- [ ] Separate customer login
- [ ] View quotations and history
- [ ] Track work order status
- [ ] Make payments online
- [ ] Download invoices
- [ ] Submit feedback

### P4 — Mobile App

- [ ] React Native or Flutter app
- [ ] Factory floor mode (production tracking)
- [ ] Offline-first with sync
- [ ] Push notifications

### P4 — Inventory Management

- [ ] Raw material stock tracking
- [ ] Purchase order generation
- [ ] Supplier management
- [ ] Stock level alerts
- [ ] Material requisition for production

### P4 — Advanced Analytics

- [ ] Revenue forecasting
- [ ] Production efficiency metrics
- [ ] Customer acquisition trends
- [ ] Product profitability analysis
- [ ] Custom report builder

### P4 — Multi-Tenant

- [ ] Organization concept (separate data per company)
- [ ] Subscription management
- [ ] White-label customization
- [ ] Usage-based billing

### P4 — AI Features

- [ ] AI quotation assistant (recommend specs based on customer history)
- [ ] Smart due-date estimation (ML based on past production times)
- [ ] Anomaly detection (unusual pricing, payment delays)
- [ ] Chatbot for employee support queries
