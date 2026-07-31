# Nexfra ERP — Backup & Restore

## What needs backing up

| Data | Where | Backups |
|---|---|---|
| PostgreSQL (19 tables, all business data) | Supabase | Automatic daily + PITR (optional) |
| Files (quotation PDFs, attachments, company assets) | Supabase Storage | Dashboard retention |
| Auth users | Supabase Auth | Part of DB backup |
| Backend code + config | GitHub (`AUD0001`) | Git history |
| Env vars | Vercel / Railway / Supabase dashboards | Manual export |
| Legacy browser data | each user's localStorage | `tools/export-localstorage.html` |

## Supabase

### Automatic backups (built-in)

1. Dashboard → Database → Backups.
2. Daily backups run automatically; 7-day retention on the Pro plan.
3. Check "Last backup" timestamp is fresh (< 24 h) on every deploy day.

### Point-in-Time Recovery (recommended)

Enable PITR in the Supabase dashboard for granular restores (minute-level).

### Manual backup (extra safety before big changes)

```bash
supabase db dump --db-url "$DATABASE_URL" -f backup.sql
# restore:
supabase db restore --db-url "$NEW_DATABASE_URL" -f backup.sql
```

Or from the dashboard: Backups → Download backup.

### Storage

- Bucket config (RLS policies, MIME limits, size caps) lives in
  `supabase/migrations/` — version-controlled.
- Objects: retained per plan. For critical files, periodically download
  `quotation-pdfs` + `attachments` to cold storage.

## Backend

- Source of truth is Git. Back up nothing else — the container is immutable.
- Record the current Railway environment variables in a private password
  manager (or a `.env` committed to a **private** repo) so you can rebuild.

## Frontend

- Fully reproducible from `main` + Vercel env vars. Nothing to back up.

## Restore runbook

1. **DB**: Dashboard → Backups → Restore → confirm → new project URL.
2. **Point Railway** to the new DB: update `SUPABASE_URL` + keys → redeploy.
3. **Verify**: `GET /api/health`, then log in and check a table count
   (`SELECT count(*) FROM customers;`) in the SQL editor.
4. **Storage**: re-point bucket env vars if project changed.

## Backup schedule

| Task | Cadence | Owner |
|---|---|---|
| Verify Supabase daily backup ran | Daily | Admin |
| Export env vars to password manager | On any change | Backend owner |
| Download storage objects to cold storage | Weekly | Admin |
| Full DB dump before risky migration | On demand | Backend owner |
| Legacy localStorage export | Once per user (migration) | User / Admin |
