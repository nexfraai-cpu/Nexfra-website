# Nexfra ERP & Public Website — Project About

> **Project Name:** Nexfra ERP
>
> **Company:** Nexfra Manufacturing India Pvt. Ltd.
>
> **Project Type:** Company Website + Internal ERP System
>
> **Status:** Live / Production
>
> **Tagline:** *Strength. Reliability. Precision.*

---

## 1. Overview

Nexfra Manufacturing India Pvt. Ltd. is a heavy-engineering fabricator that designs and builds **commercial trailers, tippers, and rigid load bodies**. The company custom-builds load bodies to fit any truck chassis brand — Tata, Ashok Leyland, BharatBenz, Volvo, Scania, Eicher, and Mahindra — and serves logistics companies, mining operators, and infrastructure developers.

This repository contains a single project with **two parts**:

1. A **premium public company website** (marketing, product showcase, enquiries).
2. A complete **internal ERP** that automates the entire workflow — from customer enquiry → quotation → approval → work order → production → payment tracking → delivery — eliminating manual paperwork, Excel sheets, and Word documents.

**Mission:** *"Our mission is to build infrastructure support systems that outlast the roads they traverse."*

---

## 2. Architecture at a Glance

```
Browser (Website + ERP)
   │   Vanilla JS + Vite build → dist/
   ▼
Vercel  ────────────────  www.nexfra.in , erp.nexfra.in (same deployment)
   │
   ▼
Railway  ──────────────  api.nexfra.in (in use: aud0001-production.up.railway.app)
   │   Express + TypeScript modular backend (Dockerfile)
   │   Service-role Supabase key held server-side ONLY
   ▼
Supabase  (PostgreSQL 15 + Auth + Storage), Row-Level Security enforced
```

Key architectural decisions:

| Decision | Rationale |
|---|---|
| **No JS framework** (vanilla ES2022 + Vite) | Small bundle (~40 KB vs 200 KB+), full control for PDF rendering, accessible to any JS dev |
| **Storage abstraction** (`StorageProvider`) | Swap `localStorage` → API without UI changes |
| **Service layer** (`src/services/*`) | All data access async via services; UI never touches storage directly |
| **Feature flags** | Dev features gated by `VITE_APP_ENV` |
| **Production safety** | Terser drops `console.*` and `debugger` in production builds |

---

## 3. Public Website

The landing page is public, designed to build trust, showcase the company and products, generate enquiries, and route employees to the ERP.

### Sections

| Section | Contents |
|---|---|
| **Header / Nav** | Logo `NEX/FRA`, nav (Home, About, Products, Videos, Manufacturing, Gallery, Industries, Contact), sales line, Employee Login |
| **Hero** | "Engineering Heavy Duty Trailers & Tippers", feature cards (Premium Materials, Welding Integrity, IS Standard Compliant), CTAs (Explore Range, Request a Quote) |
| **About** | Company intro, capability checklist, animated stats |
| **Products** | Category filter tabs + 7 product cards |
| **Video Showcase** | 2 embedded fleet videos (MP4) |
| **Manufacturing Process** | 6-step zero-compromise quality timeline |
| **Gallery** | 5 photo gallery items |
| **Industries** | 4 industry cards |
| **Testimonials** | 3 customer testimonials |
| **Contact** | Contact info + Fleet Enquiry form |
| **Footer** | Company blurb, Products & Services, Company links, Employee Login, copyright |

### Product Range (7)

| Product | Key Specs |
|---|---|
| **Flat Bed Trailer** | 40ft, Submerged Arc Welded main beam, 3×13T axles, leaf spring, anti-skid floor |
| **Side Wall Trailer** | 40ft × 4.5ft, high-tensile drop-side panels, headboard |
| **Tip Trailer (Tipping Semi-Trailer)** | 30–40 CBM, multi-stage hydraulic hoist, tandem/tridem suspension |
| **Box Body Tipper** | 14–25 CBM, 8mm MS floor, hydraulic hoist |
| **Rock Body Tipper (Hardox 450)** | Severe-duty mining, 10mm wear steel, rock breakers |
| **28 Feet Rigid Load Body** | 28ft × 4.0ft × 98in, drop side panels |
| **30 Feet Rigid Load Body** | 30ft × 4.0ft × 98in, max cubic volume |

### Custom Engineering Services

- Steel grade & thickness tailoring (ST52 / Hardox 450, 4–10mm floors)
- Hydraulics & axle suspension engineering
- Custom accessories & fitment (GPS, cameras, ramps)
- Automated fabrication quality assurance (ARAI/BIS, CNC <0.5mm, ultrasonic testing)

### Key Statistics

- **15+** years of experience
- **5000+** trailers delivered
- **45k+** tons steel processed
- **100%** QC inspections passed
- 12-month standard warranty
- 24/7 operations

### Contact Details

- **Manufacturing Unit:** No 835/1C Kalamangalam Road, Near Aggonchar, Hosur, Krishnagiri, Tamil Nadu - 636110, India
- **Sales Helpline:** +91 99059 48359 / +91 79790 74540
- **Email:** nexfra.india@gmail.com
- **Enquiry form:** name, email, phone, company, product interest, details → `POST /api/public/leads`

### Animations

All via **GSAP 3.12 + ScrollTrigger** (CDN): hero staggered intro, scroll-triggered reveals, animated stat counters (IntersectionObserver), product filter transitions, modal fades, header `.scrolled` state.

---

## 4. Authentication & User Roles

Backed by **Supabase Auth** (email/password, JWT). Tokens auto-refresh; passwords hashed by Supabase, never stored in app tables.

**App role enum** — 4 roles, each with per-module access:

| Role | Dashboard | Quotations | Approvals | Production | Work Orders | Sales (Chassis) | Accounts | Admin |
|---|---|---|---|---|---|---|---|---|
| **Admin** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Sales** | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **Finance** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| **Manager** | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |

Default landing module per role: sales → quotations, finance → accounts, manager → work orders, admin → dashboard.

- Role titles: Sales Representative, Finance Officer, Production Manager, Administrator
- Login flow: `POST /api/auth/login` → session token → persist + redirect to `erp.html?module=<first-access-module>`
- Dev-only quick-login role buttons gated by the `VITE_ENABLE_QUICK_LOGIN` flag

---

## 5. ERP Modules

### Overview (Admin Dashboard)
- **KPI cards:** Active Work Orders (in shop floor), Quotations Pending (estimation drafts), Monthly Billing (vs last month trend), Accounts Receivable (₹ in lakhs)
- **Chassis Work-Order Flow** widget (production progress per stage)
- **Recent Operations Log** (audit activity feed, capped at 50)
- Quick-operation shortcuts, live DB connection indicator

### Quotation Builder (`quotations`)
The heart of the ERP. Workers never type complete quotations manually — everything is template-based.

**5-step wizard:**
1. **Customer** — company, GST, phone, email, salesperson, target model, chassis, qty, address
2. **Category** — Commercial Trailer / Tipper Dumper Body / Rigid Load Body
3. **Model/Sub-product** — subtype cards; tipper types show a CBM **Capacity selector**
4. **Configure** — 8 collapsible spec sections + Edit Components modal
5. **Review** — A4 two-page quotation PDF preview + lifecycle status + Save / Download PDF / Print plus Convert-to-Work-Order

**Pricing with GST:** `unitPrice = basePrice + Σ spec price-diffs`; `basic = unit × qty`; `GST = 18%`; `grandTotal = basic + GST`. Live values recompute in the sticky **Live Estimate panel**. Base price can be manually overridden and saved as default.

**Quotation numbering:** `<INITIALS>/<YEAR>/<SEQ6>` e.g. `JP/2026/000001`.

### All Quotations (`allquotations` / Approval)
- Full registry of quotation revisions; admin can **inline re-edit** specs, GST, totals, and custom items before deciding
- **Approval workflow** (admin): Approve → auto-syncs backend → **automatically creates a Work Order**; Deny → removes production items/orders. Reasons/logged.

### Production Board (`status`)
A **kanban** with 3 columns (Not Started / Work in Progress / Finished). Each card shows a %-complete progress bar.

**Pipeline Settings** modal customizes the 10-stage progression (Design → Procurement → Cutting & Bending → Fabrication → Cubing & Welding → Grinding → BIW & Painting → Trimming → Hydraulics → Quality Check & Dispatch).

**Dispatch form:** vehicle number, chassis number, driver name/number, dispatch date-time.

### Work Orders (`workorders`)
Authorizations dispatched to shop-floor welding & assembly teams.
- Created **automatically on quotation approval** (`createFromQuotation`)
- Fields: WO number, linked quotation, customer, product, stage, progress %, factory notes, due date, urgent flag
- **URGENT** badge when flagged or ≤3 days; filter by urgency, date presets, category
- Print / download-A4 work-order document

`STAGES` pipeline: Pending → Material Ordered → Cutting → Fabrication → Welding → Painting → Assembly → QC → Ready → Delivered.

### Chassis & Filtering (`sales`)
Tracks chassis Inventory tied to work orders: brand, model, linked work order (with typeahead), arrival/out date, one or multiple **VIN numbers**.

### Finance Ledger (`accounts`)
- Two tabs: **All Quotations** (inbox) and **My Quotations** (finance-claimed / owner)
- Filters & sort (status, date presets, urgent-collection toggle, amount / outstanding)
- KPIs: Total Amount, Amount Collected, To Be Collected, Total Orders
- **Payments** logged per quote with modes — `RTGS`, `NEFT`, `Cheque`, `Cash` — plus date, amount, ref, notes
- **Receipt** modal with Print / Download PDF

### Administration (`admin`) — 6 tabs
1. **Employees** — CRUD (ID, name, email, phone, code, role, status, created, last login), password management, reset
2. **Products & Templates** — product types and custom-item/spec-override definitions
3. **Pricing Configuration** — pricing coefficients & metal price per kg (e.g. Hardox upgrade ₹150,000, metal ₹100/kg)
4. **Roles & Permissions** — reference matrix
5. **Audit Logs** — admin/system session audit trail
6. **System Settings** — **Reset Test Data** (wipes work orders, production, sales, payments; preserves employees, customers, pricing, settings)

---

## 6. Product Configurator

Product templates are defined as `WIZARD_PRODUCT_TEMPLATES` in `erp.js`. **3 categories → 7 subtypes**, each with base price and configurable spec options carrying price differences:

| Category | Subtype | Display Name | Base Price (₹) |
|---|---|---|---|
| Trailer | `flatbed` | Flat Bed Trailer | 5,200,000 |
| Trailer | `sidewall` | Side Wall Trailer | 580,000 |
| Trailer | `tiptrailer` | Tip Trailer | 720,000 |
| Tipper | `boxbody` | Box Body Tipper | 480,000 |
| Tipper | `rockbody` | Rock Body Tipper | 1,150,000 |
| Rigid | `rigid28` | 28 Feet Load Body | 380,000 |
| Rigid | `rigid30` | 30 Feet Load Body | 420,000 |

Each template defines `dimensions`, a `specs` array (dropdown / radio options with default values and `priceDiffs`), grouped into sections such as material, hydraulics, chassis, painting, and accessories. `rigid28` and `rigid30` share a group so spec changes propagate.

Changing an option (e.g. ST52 → Hardox) automatically updates the quotation total. Quotations also support **custom items** (GPS, cameras, extra toolbox, hydraulic ramp, winch, branding, lighting), which automatically appear in the quotation, work order, and invoice.

---

## 7. Database

Canonical schema: `database/schema.sql` + versioned Supabase migrations (`supabase/migrations/`).

| Item | Details |
|---|---|
| **Tables** | 20 — employees, customers, products, product_templates, product_template_specs, product_spec_options, quotations, quotation_spec_values, quotation_custom_items, work_orders, production_items, production_stage_records, chassis_records, sales, payments, audit_logs, custom_item_definitions, app_settings, product_spec_overrides, quotation_yearly_sequences |
| **Enums** | 6 — `user_role`, `employee_status`, `quotation_status`, `payment_mode`, `production_stage`, `order_status` |
| **Views** | 3 — customer outstanding, monthly revenue, production pipeline |
| **RLS** | Enabled on all business tables; ~77+ ownership-based policies (defense-in-depth; all writes go through the backend service role) |
| **Sequences** | `seq_employees`, `seq_customers`, `seq_quotations`, `seq_work_orders`, `seq_payments`; quotation numbers use **yearly** sequences |
| **Storage buckets** | 3 — `quotation-pdfs` (public), `attachments` (private), `company-assets` (public) |

**Design conventions:** UUID v7 primary keys, soft-delete (`deleted_at`), audit columns on every table, optimistic-locking `version`, snapshot columns for documents, `ON DELETE SET NULL` / `ON UPDATE CASCADE` referential rules.

**Numbering formats:** Customers `CUS-000001`, Work Orders `WO-000001`, Payments `PAY-000001`, Invoices `INV-000001`, Quotations `<INITIALS>/<YEAR>/<SEQ6>`.

---

## 9. Technology Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS (ES2022), Vite 5, Terser, GSAP 3.12, html2pdf.js |
| Backend | Node.js 22, Express 4, TypeScript, zod, helmet, compression, express-rate-limit, pino |
| Database | PostgreSQL 15 (Supabase), @supabase/supabase-js |
| Auth | Supabase Auth (JWT RS256, refresh rotation) |
| Storage | Supabase Storage (S3-compatible) through Multer |
| CI/CD | GitHub Actions (CI + deploy) |
| Hosting | Vercel (frontend), Railway (backend), Supabase (DB + storage) |

---

## 10. Deployment

- **Frontend → Vercel**: `npm run build` → `dist/`; `vercel.json` sets SPA rewrites, immutable asset caching, and security headers.
- **Backend → Railway**: GitHub-connected, `backend/Dockerfile` (multi-stage, Node 22 alpine, non-root), healthcheck `/api/health`.
- **Database → Supabase**: migrations via Supabase CLI; frontend never holds Supabase keys, only the backend service role does.
- **Domains:** `www.nexfra.in` + `erp.nexfra.in` (Vercel) and `api.nexfra.in` (Railway). The live backend currently runs at `https://aud0001-production.up.railway.app`.

---

## 11. CI/CD

- **CI**: on push/PR to `main` — backend `tsc --noEmit` + Jest; frontend production build.
- **Deploy**: on push to `main` — Railway deploy backend + Vercel deploy frontend.
- **Required secrets:** `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

---

## 12. Roadmap / Planned Features

**Q4 2026**
- Inventory & raw-material stock tracking
- Purchase orders & supplier management
- GST-compliant invoice generator
- Email quotation/invoice delivery
- WhatsApp quotation sharing

**Q1 2027**
- Customer portal (view quotations, track orders, pay online)
- Analytics dashboard (revenue, production efficiency, sales performance)
- Mobile companion app (factory floor)
- Multi-language support (Hindi + regional)
- Offline mode (PWA)

**Q2 2027+**
- AI-powered quotation assistant (spec recommendations from history)
- Predictive production planning (ML delivery estimates)
- Barcode / RFID integration (chassis + material scanning)
- Public ERP REST API for partners
- Multi-tenancy

---

*This document describes the current implemented state of the Nexfra ERP & website. For tech justification, deployment runbooks, and code conventions, see `README.md`, `TECH_STACK.md`, `DEPLOYMENT_ARCHITECTURE.md`, `deployment.md`, and `CODING_STANDARDS.md`.*