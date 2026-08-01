# Nexfra ERP — Deployment Guide

## Architecture

| Component | Platform | Production URL |
|---|---|---|
| Frontend (SPA) | Vercel | `https://www.nexfra.in` + `https://erp.nexfra.in` |
| Backend (Express API) | Railway | `https://api.nexfra.in` |
| Database (PostgreSQL) | Supabase | managed |
| Auth (JWT) | Supabase Auth | managed |
| File storage | Supabase Storage | 3 buckets (`quotation-pdfs`, `attachments`, `company-assets`) |

```
Vercel (www.nexfra.in, erp.nexfra.in)          Railway (api.nexfra.in)
┌───────────────────────────┐                  ┌───────────────────────────┐
│ index.html / erp.html      │    HTTPS CORS   │ Express (Node 20)         │
│ vite bundles (dist/)       │ ───────────────►│ helmet, cors, ratelimit,  │
│ vercel.json headers        │                  │ compression, morgan       │
└───────────────────────────┘                  └───────────┬───────────────┘
                                                           │ supabase-js (service key)
                                                           ▼
                                              ┌───────────────────────────┐
                                              │ Supabase: Postgres + Auth  │
                                              │ + Storage (RLS enforced)   │
                                              └───────────────────────────┘
```

## Prerequisites

- Accounts: Vercel, Railway, Supabase (GitHub login)
- Git repo: `github.com/zunzunn/AUD0001.git`
- Domains: `nexfra.in`, `www.nexfra.in`, `erp.nexfra.in`, `api.nexfra.in`
- Supabase project with migrations from `supabase/migrations/` applied

---

## 1. Backend → Railway

### 1.1 Create the service

```
1. Railway Dashboard → New Project → Deploy from GitHub → repo AUD0001
2. Railway detects backend/Dockerfile + railway.json (DOCKERFILE builder)
3. Root directory = backend (set via Project Settings → Root Directory → backend)
4. Create a domain:
   Railway → Settings → Networking → Generate Domain → set CNAME api.nexfra.in
5. DNS: api.nexfra.in CNAME → <railway-generated-host> (e.g. *.up.railway.app)
```

### 1.2 Environment variables (production)

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `HOST` | `0.0.0.0` |
| `TRUST_PROXY` | `1` |
| `SUPABASE_URL` | `https://<project>.supabase.co` |
| `SUPABASE_SERVICE_KEY` | service role key (secret) |
| `CORS_ORIGINS` | `https://www.nexfra.in,https://erp.nexfra.in` |
| `LOG_LEVEL` | `info` |
| `RATE_LIMIT_WINDOW_MS` | `60000` |
| `RATE_LIMIT_MAX` | `100` |
| `UPLOAD_MAX_SIZE` | `10485760` |
| `ALLOWED_MIME_TYPES` | `image/jpeg,image/png,application/pdf` |
| `STORAGE_BUCKET_QUOTATIONS` | `quotation-pdfs` |
| `STORAGE_BUCKET_ATTACHMENTS` | `attachments` |
| `STORAGE_BUCKET_ASSETS` | `company-assets` |

The service role key is used server-side only. It is never shipped to the browser.

### 1.3 Health check

Railway reads `healthcheckPath: /api/health` from `backend/railway.json`.
The Dockerfile also exposes a container HEALTHCHECK against `/api/health`.

---

## 2. Frontend → Vercel

### 2.1 Import project

```
1. Vercel Dashboard → Add New → Project → Import AUD0001
2. Build command:  npm run build
3. Output directory: dist
4. `vercel.json` at repo root controls headers, rewrites, caching.
```

### 2.2 Domains

Add both domains to the same Vercel project:

| Domain | DNS | Type |
|---|---|---|
| `www.nexfra.in` | `CNAME cname.vercel-dns.com` | main |
| `erp.nexfra.in` | `CNAME cname.vercel-dns.com` | alias |

The SPA rewrite in `vercel.json` maps every route to `index.html`. The ERP app
lives at `erp.html` (linked from the landing page). Both domains serve the same
deployment.

### 2.3 Environment variables (production)

| Variable | Value |
|---|---|
| `VITE_APP_ENV` | `production` |
| `VITE_API_BASE_URL` | `https://api.nexfra.in` |
| `VITE_STORAGE_PROVIDER` | `api` |
| `VITE_ENABLE_QUICK_LOGIN` | `false` |
| `VITE_ENABLE_RESET_DATA` | `false` |
| `VITE_ENABLE_DEMO_ACCOUNTS` | `false` |

> `VITE_*` variables are baked into the bundle at build time. Changing them
> requires a redeploy. Store them in Vercel → Project → Settings → Env Vars.

---

## 3. Database → Supabase

Schema is managed as SQL migrations in `supabase/migrations/`. Apply with the
Supabase CLI (or the dashboard SQL editor):

```bash
supabase link --project-ref <ref>
supabase db push
```

Migrations cover: 19 tables, 6 enums, indexes, 77 RLS policies, views,
trigger functions, and storage buckets. RLS blocks direct public access;
all table access goes through the backend using the service role.

## 4. CI/CD

GitHub Actions runs on every push to `main`:

- `.github/workflows/ci.yml` — backend typecheck + tests, frontend production build
- `.github/workflows/deploy.yml` — deploy backend to Railway, frontend to Vercel (production)

Required repo secrets:

| Secret | Used by |
|---|---|
| `RAILWAY_TOKEN` | deploy-backend |
| `VERCEL_TOKEN` | deploy-frontend |
| `VERCEL_ORG_ID` | deploy-frontend |
| `VERCEL_PROJECT_ID` | deploy-frontend |

## 5. Data migration (existing users)

Existing browser data is migrated with the Phase 14 toolchain:

1. `tools/export-localstorage.html` → download `nexfra-legacy.json`
2. `npx tsx scripts/migrate.ts --file nexfra-legacy.json --dry-run`
3. `npx tsx scripts/migrate.ts --file nexfra-legacy.json`

Full runbook: `MIGRATION-GUIDE.md`. Passwords are NOT migrated — users sign in
through Supabase Auth.

## 6. Local production smoke test

```bash
# Backend
cd backend && npm ci && npm run build && NODE_ENV=production node dist/index.js

# Frontend
npm ci && npm run build && npm run preview
```

## Scripts

```bash
# Frontend
npm run dev      # Vite dev server :3000
npm run build    # Production build → dist/
npm run preview  # Preview dist/

# Backend
cd backend
npm run dev      # tsx watch (hot reload, pino-pretty logs)
npm run build    # tsc → dist/
npm test         # jest
```

## Runbook

- **Backend restart**: Railway → Service → Restart
- **Health**: `GET https://api.nexfra.in/api/health` → `{"status":"ok"}`
- **Logs**: Railway → Deployments → View Logs (pino JSON)
- **Frontend deploy**: push to `main`, or Vercel → Deployments → Redeploy
- **DB migration**: `supabase db push` after adding a file in `supabase/migrations/`
- **Rollback**: see `rollback.md`
- **Backups**: see `backup.md`
- **Monitoring**: see `monitoring.md`
- **Go-live gate**: see `production-checklist.md`
