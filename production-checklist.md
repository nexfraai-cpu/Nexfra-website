# Nexfra ERP — Production Launch Checklist

Check everything below before going live. Reference the linked docs for how-to.

## 1. Infrastructure

- [ ] Vercel project exists, builds from `main`, outputs `dist/`
- [ ] Railway service deploys `backend/` Dockerfile (node:20-alpine, non-root user)
- [ ] Supabase project linked, all migrations applied (`supabase db push`)
- [ ] Storage buckets created: `quotation-pdfs`, `attachments`, `company-assets`

## 2. Domains & HTTPS

- [ ] `www.nexfra.in` CNAME → `cname.vercel-dns.com` (Apex/redirect handled)
- [ ] `erp.nexfra.in` CNAME → `cname.vercel-dns.com`
- [ ] `api.nexfra.in` CNAME → Railway generated domain
- [ ] SSL auto-provisioned on all three (Vercel + Railway)
- [ ] `GET https://api.nexfra.in/api/health` → `{"status":"ok"}` over HTTPS

## 3. Environment variables

- [ ] **Vercel**: `VITE_APP_ENV=production`, `VITE_API_BASE_URL=https://api.nexfra.in`,
      `VITE_STORAGE_PROVIDER=api`, all `VITE_ENABLE_*` = `false`
- [ ] **Railway**: `NODE_ENV=production`, `TRUST_PROXY=1`, `PORT=4000`, `HOST=0.0.0.0`
- [ ] **Railway**: Supabase URL + service key + anon key set (service key never in browser)
- [ ] **Railway**: `CORS_ORIGINS` = `https://www.nexfra.in,https://erp.nexfra.in`
- [ ] **Railway**: storage bucket vars match Supabase bucket names
- [ ] No `.env` with real keys committed to Git (`.gitignore` covers `.env`)

## 4. Security

- [ ] Helmet active with HSTS (prod) — verified via `curl -I https://api.nexfra.in`
- [ ] CORS only allows the two frontend origins + `credentials: true`
- [ ] Rate limiting enabled (`RATE_LIMIT_MAX=100` per min per IP)
- [ ] Trust proxy set so rate limiter sees real client IPs (behind Railway proxy)
- [ ] JWT auth middleware on all `/api/*` routes except `/api/auth` + `/api/health` + `/api/storage`
- [ ] Vercel headers: HSTS, `X-Content-Type-Options`, `X-Frame-Options` present
- [ ] RLS enforced on all tables (verify `SELECT` from anon role returns nothing)
- [ ] Service role key restricted to backend use only (no anon exposure)

## 5. Data & migration

- [ ] Run Phase 14 migration dry-run on a real export: `--dry-run` clean
- [ ] Verify expected row counts in each table after import (verification plan)
- [ ] Test login via Supabase Auth (created a user in dashboard or via signup)
- [ ] Test one quotation PDF upload → appears in `quotation-pdfs` bucket

## 6. Functionality smoke test (on prod URLs)

- [ ] Landing page `www.nexfra.in` loads, links to `/erp.html`
- [ ] ERP `erp.nexfra.in` loads, login works
- [ ] Create customer → appears in list (API round-trip)
- [ ] Create product → appears
- [ ] Create quotation → PDF generated + stored
- [ ] Create work order + production item
- [ ] Record sale + payment
- [ ] Upload attachment on a record
- [ ] Refresh mid-edit → data persists (API storage provider)

## 7. Performance & caching

- [ ] Hashed assets cached `immutable` 1y on Vercel
- [ ] `index.html`/`erp.html` no-cache
- [ ] Backend compression active (check `Content-Encoding: gzip` on JSON response)
- [ ] Frontend bundle sizes reasonable (see build output); images optimized

## 8. CI/CD & operations

- [ ] `ci.yml` green on latest `main` (backend tsc + jest, frontend build)
- [ ] `deploy.yml` secrets set: `RAILWAY_TOKEN`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] Deploy job actually deployed both services
- [ ] Rollback verified (see rollback.md)
- [ ] Supabase daily backup confirmed fresh (see backup.md)
- [ ] Monitoring/alerts configured (see monitoring.md)

## 9. People

- [ ] Admin account created in Supabase Auth with `admin` role
- [ ] Team members provisioned with correct roles
- [ ] On-call owner identified; escalation path documented

---

Run the checks, fix any failures, then sign off:

| Role | Name | Date |
|---|---|---|
| Backend owner | | |
| Frontend owner | | |
| Admin | | |
