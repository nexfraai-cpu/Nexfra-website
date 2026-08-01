# Nexfra ERP — Architecture Decision Records (ADR)

This file records significant architectural decisions, their context, and their consequences.

---

## ADR-001: Use Vanilla JavaScript (No Framework)

### Status

Accepted ✅

### Context

The Nexfra ERP frontend needs to serve two roles: a public landing site and an internal control panel. The team has deep JavaScript knowledge and wants to avoid framework churn. The application is a single-page ERP, not a complex state machine requiring virtual DOM diffing.

### Decision

Use vanilla JavaScript with ES modules, Vite bundler, and a lightweight service layer pattern. No React, Vue, or Angular.

### Consequences

- **Positive**: Zero framework churn, no breaking dependency upgrades, smaller bundle, full control over performance
- **Positive**: The codebase remains accessible to any JavaScript developer
- **Positive**: Faster development iteration without framework boilerplate
- **Negative**: More manual DOM manipulation
- **Negative**: No built-in state management, reactivity, or component lifecycle
- **Negative**: Must build our own service layer, storage abstraction, and error handling

### Mitigation

- Service layer with `BaseService` provides consistent CRUD patterns
- StorageProvider abstraction enables future backend migration without UI changes
- All DOM manipulation is centralized in event handlers, not scattered

---

## ADR-002: localStorage as Initial Persistence Layer

### Status

Accepted ✅

### Context

A fully functional ERP needs to work immediately without a backend. The project is being built incrementally — first the frontend with full business logic, then the backend. The persistence layer must be trivially swappable.

### Decision

Use `localStorage` for all application state on the frontend, accessed exclusively through a `StorageProvider` abstraction. A second `ApiProvider` implements the same interface for future backend use.

### Consequences

- **Positive**: Zero backend required for development and demonstration
- **Positive**: Full offline capability
- **Positive**: Switching to API requires changing one config variable (`VITE_STORAGE_PROVIDER`)
- **Negative**: localStorage has 5-10 MB limit per origin
- **Negative**: No data sharing across browsers or devices
- **Negative**: No durability guarantees (user can clear browser data)

### Mitigation

- The database schema is already designed for PostgreSQL
- The `ApiProvider` stub is written and ready for implementation
- StorageProvider.getJSON/setJSON provide transparent JSON serialization
- localStorage is only used for application state (not images or files)

---

## ADR-003: Flat Filter/Search Architecture (No Server-Side Pagination)

### Status

Accepted ✅

### Context

The ERP works with relatively small datasets (hundreds, not millions). Manufacturing companies typically have hundreds to low thousands of customers, quotations, and work orders. The frontend needs fast, filterable access to all data.

### Decision

Load all records into memory on module load, then apply filters, search, and sorting entirely in the browser.

### Consequences

- **Positive**: Instant filtering and search with zero network latency
- **Positive**: Simple implementation without pagination state management
- **Positive**: Can re-sort and re-filter without server round trips
- **Negative**: Does not scale to millions of records
- **Negative**: All data is loaded on first access (slower initial load for large datasets)
- **Negative**: Browser memory usage grows with dataset size

### Mitigation

- Manufacturing ERP datasets are inherently bounded (years of quotations, not millions per month)
- If scale becomes a concern, server-side pagination can be added to ApiProvider without UI changes
- The flat architecture is kept in the frontend; the API will support pagination for the backend

---

## ADR-004: Hardcoded Product Templates (Not Database-Driven)

### Status

Accepted ✅

### Context

Nexfra manufactures 5 product families: Fabrication, Trolley, Aluminum, Industrial Oven, and Deep Freezer. Each has unique specifications. Defining these in the database adds complexity to both the schema and the frontend code.

### Decision

Define product templates and their specifications as JavaScript constants in `config.js`. The database schema includes a `product_templates` table for the migration path, but it is not used until Phase 6.

### Consequences

- **Positive**: Templates are immediately usable without database seeding
- **Positive**: Template changes are version-controlled with the frontend
- **Positive**: No API call needed to load the product configuration wizard
- **Negative**: Changing a template requires a frontend deployment
- **Negative**: Non-technical users cannot modify product specs without developer help
- **Negative**: The database `product_templates` table is defined but unused

### Mitigation

- The database schema includes full `product_templates` / `product_template_specs` / `product_spec_options` tables
- When Phase 6 begins, templates will migrate from `config.js` to the database
- The frontend `ProductService` already has the `getTemplates()` method returning from state, ready for the database call

---

## ADR-005: Postgres Enum Types (Not Lookup Tables)

### Status

Accepted ✅

### Context

The database needs to constrain columns like `role`, `status`, and `stage` to fixed sets of values. The choice is between PostgreSQL `CREATE TYPE` enums and lookup/reference tables.

### Decision

Use PostgreSQL `CREATE TYPE enums` for all constrained value sets.

### Consequences

- **Positive**: Native database enforcement, no JOINs needed for validation
- **Positive**: Better performance than lookup tables for fixed sets
- **Positive**: Type safety in the database
- **Negative**: Adding a new value requires `ALTER TYPE ... ADD VALUE` (cannot be done in a transaction)
- **Negative**: Cannot add descriptive metadata to enum values

### Mitigation

- Six enums are defined: `user_role`, `employee_status`, `quotation_status`, `wo_stage`, `approval_status`, `payment_method`
- Enum values were chosen to be comprehensive and stable
- The risk of needing new values exists but is low for these specific domains
- The migration guide includes the `ALTER TYPE` syntax for future changes

---

## ADR-006: Sequential Business Identifiers (Not UUIDs for Display)

### Status

Accepted ✅

### Context

Users need readable identifiers: Employee #EMP001, Customer #CUS042, Quotation #JP/2026/000001. Using full UUIDs for these display identifiers is impractical.

### Decision

Use PostgreSQL sequences for human-readable business identifiers (`emp_id_seq`, `cus_id_seq`, `nq_num_seq`, `wo_num_seq`, `pay_seq`), while `UUID` remains as the primary key for internal use.

### Consequences

- **Positive**: Human-readable identifiers for everyday use
- **Positive**: Sequential numbering makes it easy to reference records
- **Positive**: UUID primary keys avoid sequential number security concerns (no guessing IDs)
- **Negative**: More complex schema (sequences + triggers for auto-numbering)
- **Negative**: Slightly more storage per row (UUID + VARCHAR display ID)

### Mitigation

- The trigger `before insert` pattern auto-generates display IDs without application involvement
- Sequences reset annually where appropriate (quotation numbers)
- Display IDs are `VARCHAR` and indexed for fast lookups

---

## ADR-007: Vite with SPA Fallback for Routing

### Status

Accepted ✅

### Context

The application has two HTML pages (`index.html` for the public site, `erp.html` for the ERP) and multiple virtual modules within the ERP. Vite handles the build, but routing between the two pages and deep-linking within the ERP must work.

### Decision

- Use Vite's SPA fallback (`vercel.json` rewrites all paths to `index.html`)
- The ERP uses a client-side `switchModule()` function for internal navigation (no URL routing)
- Two distinct HTML entry points are served as separate Vite inputs

### Consequences

- **Positive**: Simple implementation with no router library
- **Positive**: URL hash / query params can be used for deep linking if needed later
- **Positive**: Vercel handles SPA rewrites gracefully
- **Negative**: No browser back/forward navigation within ERP modules
- **Negative**: `/erp` path must be explicitly handled in Vite + Vercel config

### Mitigation

- Vite config specifies `input: ['index.html', 'erp.html']`
- `vercel.json` rewrites are configured for both paths
- A simple hash-based router can be added to erp.js if needed

---

## ADR-008: Single CSS File (No CSS Modules)

### Status

Accepted ✅

### Context

The project has approximately 6800 lines of CSS. The initial approach was to keep all styles in one file for simplicity.

### Decision

Keep all CSS in `styles.css` with CSS custom properties for the design system. No CSS modules, CSS-in-JS, or preprocessors.

### Consequences

- **Positive**: Single file is easy to find and read
- **Positive**: CSS custom properties provide consistent theming
- **Positive**: No build step required for CSS
- **Negative**: No scoping — selector collisions are possible
- **Negative**: Very large file (6800 lines) is harder to maintain
- **Negative**: No code-splitting — all styles load on every page

### Mitigation

- CSS has clear section comments separating modules (Dashboard, Quotations, Work Orders, etc.)
- Class naming follows BEM-like conventions (`.module__element--modifier`)
- CSS is loaded globally — the `section.active` pattern ensures only the visible module has display:block
- If the file grows further, it will be split into multiple files and imported via Vite
