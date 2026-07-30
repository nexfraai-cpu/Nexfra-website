# Nexfra ERP — Contributing Guide

## How to Contribute

This guide covers contributing to the Nexfra ERP codebase, including the frontend, planned backend API, and database schema.

---

## Development Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **Git** 2.30+
- **(Planned)** Supabase CLI for database migrations
- **(Planned)** Docker for local Supabase

### Clone & Install

```bash
git clone <repo-url> client1
cd client1
npm install
```

### Development Server

```bash
npm run dev
# Vite dev server starts at http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` — the defaults work for local development:

```
VITE_STORAGE_PROVIDER=localStorage
VITE_API_BASE_URL=http://localhost:4000
VITE_APP_NAME=Nexfra ERP
VITE_APP_VERSION=1.0.0
```

### Build

```bash
npm run build
# Output in dist/
# Production bundle with terser (drop_console, drop_debugger)
```

### Preview Production Build

```bash
npm run preview
```

---

## Project Structure

```
/
├── index.html          Public site
├── erp.html            ERP control panel
├── app.js              Public site logic
├── erp.js              ERP logic
├── styles.css          All styles
├── src/                Service layer
│   ├── config.js
│   ├── dev-data.js
│   ├── storage/        Storage abstraction
│   ├── services/       Business logic
│   └── utils/          Logger, ErrorHandler
├── database/           Schema docs
├── supabase/           Migrations + seed
├── .env                Dev environment
└── vercel.json         Vercel config
```

---

## Workflow

### 1. Pick a Task

- Check `BACKLOG.md` for prioritized work items
- Check `ROADMAP.md` to understand the current phase

### 2. Create a Branch

```bash
git checkout -b feat/my-feature
# or fix/..., refactor/..., docs/..., chore/...
```

### 3. Make Changes

- Follow `CODING_STANDARDS.md`
- Run `npm run build` to verify no errors
- The build runs `vite build` with terser — if it succeeds, the bundle is clean

### 4. Run Lint

```bash
npm run lint
```

### 5. Run Tests

When tests are implemented:

```bash
npm test
```

### 6. Commit

```bash
git add <files>
git commit -m "type(scope): description"
```

See `CODING_STANDARDS.md` for commit message format.

### 7. Push & Create PR

```bash
git push -u origin feat/my-feature
```

Then open a PR on GitHub using the PR template.

---

## Pull Request Process

1. **Title**: Must follow commit message format: `type(scope): description`
2. **Description**: Include:
   - What this PR does
   - Why this approach was chosen
   - Screenshots for frontend changes
   - Migration instructions for database changes
3. **Checklist**: Verify against the review checklist in `CODING_STANDARDS.md`
4. **Review**: At least one reviewer must approve
5. **Merge**: Squash merge into `main`

---

## Database Changes

### Adding a migration

1. Create a new file in `supabase/migrations/YYYYMMDDHHMMSS_description.sql`
2. Write `UP` migration (what is being applied)
3. Write `DOWN` migration (what is being reverted) in a comment block
4. Update `database/schema.sql` to reflect the change
5. Update `database/database-schema.md` to reflect the change
6. Test against a local Supabase instance

### Migration naming

```
20260731000001_schema.sql          — Initial schema
20260731000002_seed.sql            — Seed data
20260801093015_add_inventory.sql   — New feature
20260801120000_fix_quotation_rls   — Bug fix
```

---

## API Changes

When adding or modifying API endpoints:

1. Update `backend-api.md` with the new endpoint
2. Add a new route in `server/routes/`
3. Create a controller in `server/controllers/`
4. Add business logic in `server/services/`
5. Add validation in `server/validators/`
6. Write tests

---

## Frontend Changes

When modifying the frontend:

1. Never modify `styles.css` without checking the CSS custom properties design system
2. Never add new `onclick` handlers to HTML — use `data-action` delegation
3. Never access `localStorage` directly — use the StorageProvider
4. Never add `console.log` — use `Logger` from `src/utils`
5. Never assign to `window.*` (with rare exceptions for the HTML onclick bridge)

---

## Roles & Permissions

| Role | Permissions |
|---|---|
| `SuperAdmin` | Everything |
| `Admin` | Everything except: cannot delete employees, cannot modify system settings |
| `Manager` | CRUD quotations, work orders, customers. No employee or finance management |
| `Sales` | Create/view quotations and customers. Read-only work orders |
| `Production` | View work orders, update production stages, manage chassis records |
| `Finance` | View quotations, manage sales ledger and payments |
| `Viewer` | Read-only access to all modules |
