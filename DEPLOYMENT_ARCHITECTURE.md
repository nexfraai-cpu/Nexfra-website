# Nexfra ERP — Deployment Architecture

## Overview

Nexfra ERP deploys across three platforms. The frontend is live, the database is provisioned-ready, and the backend is planned.

```
┌────────────────────────────────────────────────────────────────────┐
│                           Vercel                                   │
│  ┌─────────────────────┐  ┌──────────────────────────────────────┐ │
│  │  www.nexfra.in      │  │  erp.nexfra.in                       │ │
│  │                     │  │                                       │ │
│  │  index.html         │  │  erp.html                             │ │
│  │  app.js (bundled)   │  │  erp.js (bundled)                    │ │
│  │  styles.css (min)   │  │  styles.css (min)                    │ │
│  │  assets/            │  │  assets/                              │ │
│  │                     │  │                                       │ │
│  │  Vite SPA Rewrite   │  │  Vite SPA Rewrite                    │ │
│  └─────────────────────┘  └───────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                     Express API (Planned)                          │
│                                                                   │
│  api.nexfra.in                                                    │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │  Server (Render / Railway / Fly.io)                          │ │
│  │  ├── Node.js 20+                                             │ │
│  │  ├── Express.js                                              │ │
│  │  ├── @supabase/supabase-js (server)                         │ │
│  │  ├── jsonwebtoken                                            │ │
│  │  ├── helmet, cors, express-rate-limit                       │ │
│  │  └── morgan (request logging)                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌────────────────────────────────────────────────────────────────────┐
│                      Supabase                                      │
│                                                                   │
│  ┌─────────────────────┐  ┌──────────────┐  ┌───────────────────┐ │
│  │  PostgreSQL 15       │  │  Auth         │  │  Storage          │ │
│  │                     │  │              │  │                   │ │
│  │  19 tables          │  │  Supabase     │  │  3 buckets        │ │
│  │  6 enums            │  │  Auth UI      │  │  - quotation-pdfs │ │
│  │  33 indexes         │  │  JWT tokens   │  │  - attachments    │ │
│  │  77 RLS policies    │  │  Row-level    │  │  - company-assets │ │
│  │  3 views            │  │  Security     │  │                   │ │
│  |  audit_log          │  |              │  │                   │ │
│  └─────────────────────┘  └──────────────┘  └───────────────────┘ │
└────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

### `.env` File

```
# Storage provider: 'localStorage' (dev) or 'api' (production)
VITE_STORAGE_PROVIDER=localStorage

# Backend API URL (defaults to http://localhost:4000)
VITE_API_URL=http://localhost:4000

# Application environment: development | test | production
VITE_APP_ENV=development
```

### Production `.env` (Vercel Environment Variables)

```
VITE_APP_ENV=production
VITE_STORAGE_PROVIDER=api
VITE_API_URL=https://api.nexfra.in
```

Supabase is only ever reached by the backend (via `SUPABASE_URL` +
`SUPABASE_SERVICE_KEY` in the Railway env). The frontend talks to the backend
API and never holds Supabase keys.

---

## Vercel Configuration

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ],
  "cleanUrls": true
}
```

### Vercel Domains

| Domain | Target | Type |
|---|---|---|
| `www.nexfra.in` | Vercel project (production) | Main domain |
| `erp.nexfra.in` | Vercel project (production) | Custom domain |
| `api.nexfra.in` | Express server (planned) | CNAME → Render/Railway |

Both `www.nexfra.in` and `erp.nexfra.in` serve the same Vercel project. The SPA rewrite ensures `/erp` → `erp.html` and all other paths → `index.html`.

---

## Custom Domain Setup

### Vercel (Frontend)

```
1. Vercel Dashboard → Project → Domains
2. Add www.nexfra.in
3. Add erp.nexfra.in
4. Configure DNS:
   www.nexfra.in  CNAME → cname.vercel-dns.com
   erp.nexfra.in  CNAME → cname.vercel-dns.com
5. Vercel auto-provisions SSL certificates
6. Both domains serve the same deployment
```

### Express API (Future)

```
1. Add api.nexfra.in CNAME → your-server.example.com
2. Configure reverse proxy (Nginx/Caddy) for SSL termination
3. Set environment variables on the server
```

---

## Deployment Workflow

### Frontend (Vercel — Automatic)

```
GitHub Push (main branch)
    │
    ▼
Vercel Auto-Deploy
    │
    ├── Install dependencies (npm ci)
    ├── Build (npm run build)
    ├── Deploy to Vercel edge network
    │
    ▼
www.nexfra.in + erp.nexfra.in updated
```

### Frontend (Vercel — Preview)

```
GitHub Push (feature branch)
    │
    ▼
Vercel Preview Deployment
    │
    ├── Install dependencies (npm ci)
    ├── Build (npm run build)
    ├── Deploy to preview URL
    │
    ▼
https://project-name-git-feature.vercel.app
```

### Database (Supabase — Manual)

```
Developer
    │
    ├── 1. Write migration in supabase/migrations/
    ├── 2. Test locally with Supabase CLI
    ├── 3. Push to GitHub
    ├── 4. Run migration on Supabase Dashboard
    │
    ▼
Supabase Production Database
```

### Backend (Planned — Automatic)

```
GitHub Push (main branch — server/ directory)
    │
    ▼
Render / Railway Auto-Deploy
    │
    ├── Install dependencies (npm ci)
    ├── Start server (node index.js)
    │
    ▼
api.nexfra.in updated
```

---

## Build Output

```
dist/
├── index.html                     # Public website (minified)
├── erp.html                       # ERP page (minified)
├── assets/
│   ├── index-abc123.js           ── app.js bundle (terser minified)
│   ├── erp-def456.js             ── erp.js bundle (terser minified)
│   └── index-ghi789.css          ── styles.css (minified)
└── assets/ (copied from assets/)
    ├── logo.svg                  
    ├── hero-bg.webp              
    ├── fabrication.webp         
    ├── trolley.webp             
    ├── aluminum.webp            
    ├── oven.webp                
    └── freezer.webp             
```

### Scripts

```bash
# Development
npm run dev        # Vite dev server at localhost:3000

# Production build
npm run build      # Output to dist/

# Preview production build locally
npm run preview    # Preview server for dist/
```

---

## Resource Allocation (Planned)

### Vercel (Pro Plan)

- 1 project (nexfra-erp)
- 2 custom domains (www.nexfra.in, erp.nexfra.in)
- 100 GB bandwidth
- 6000 build minutes/month
- 3 team members
- Preview deployments for every branch

### Supabase (Pro Plan — $25/month)

- 8 GB PostgreSQL database
- 50,000 monthly active users
- 250 GB egress bandwidth
- 100 GB storage (for file uploads)
- Point-in-time recovery
- SOC 2 compliance
- Daily backups

### Express Server (Planned)

- Render Web Service ($7/month)
- OR Railway Starter Plan ($5/month)
- OR Fly.io ($5-10/month)
- 512 MB RAM, 1 vCPU
- Auto-scaling disabled (low traffic expected)
- 1 GB SSD

---

## Monitoring & Observability (Planned)

- **Errors**: Sentry (free tier) for frontend + backend error tracking
- **Performance**: Vercel Analytics (free tier) for frontend
- **Database**: Supabase Dashboard for database metrics
- **Server uptime**: Render/Railway built-in health checks
- **Alerting**: Slack webhook on error threshold exceeded
- **Backups**: Supabase automated daily backups + 7-day retention

---

## Rollback Strategy

### Frontend (Vercel)

```
Vercel Dashboard → Deployments → Select previous deployment
    → "Promote to Production"
    → Done (instant rollback)
```

### Database (Supabase)

```
Supabase Dashboard → Database → Backups
    → Select backup → Restore
    → Point-in-time recovery available
```

### Backend (Planned)

```
Render / Railway → Deployments → Rollback to previous
    → Done (instant rollback)
```

---

## Runbook (Future)

- [ ] How to restart the API server
- [ ] How to check database health
- [ ] How to view application logs
- [ ] How to clear application cache
- [ ] How to force database migration
- [ ] How to revoke user access
- [ ] How to restore from backup
- [ ] Emergency contact list
- [ ] Escalation procedure
