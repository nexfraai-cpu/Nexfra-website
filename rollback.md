# Nexfra ERP — Rollback Plan

## 1. Frontend (Vercel)

Instant, no code changes.

```
Vercel Dashboard → Project → Deployments
  → find previous known-good deployment → ⋮ → Promote to Production
```

- Every push to `main` creates a permanent production deployment you can restore.
- Environment variables (`VITE_*`) are baked into the build. If a rollback is
  needed because env values changed, update the vars AND redeploy — a build from
  old code with new env vars may not match the state you want.

## 2. Backend (Railway)

```
Railway → Project → Deployments
  → select previous deployment → ⋮ → Deploy
```

- Also supported via CLI: `railway rollback <deployment-id>`.
- The Docker image for each deployment is retained; rolling back restores the
  previous container and its env vars.
- Migrations are additive. The backend does NOT run schema migrations itself —
  that keeps old code + new schema mostly compatible. If a breaking schema
  change was deployed, apply a compensating migration or restore the DB (below).

## 3. Database (Supabase)

```
Supabase Dashboard → Database → Backups
  → choose a backup or enable Point-in-Time Recovery (PITR)
  → Restore (creates a new instance, then point DNS/project to it)
```

- **Daily backups**: automatic; 7-day retention on free/pro.
- **PITR**: paid feature; recommended before any risky migration or bulk data change.
- Restores create a *new* database. Update `SUPABASE_URL`/keys in Railway and
  redeploy after a restore.
- Migration rollback: `supabase migration list` → `supabase migration repair` can
  mark a migration as reverted. There is no automatic `down` for SQL migrations;
  write a manual compensating migration in `supabase/migrations/` if needed.

## 4. Storage (Supabase Storage)

- Object-level restore via dashboard (retention depends on plan).
- Bucket config (RLS policies, MIME limits) is versioned in migrations — restore
  by re-applying the bucket migration file.

## 5. Order of operations for a full rollback

| Severity | Action |
|---|---|
| Bad frontend UI | Promote previous Vercel deployment |
| Bad API behavior | Roll back Railway deployment |
| Bad data / schema | Restore Supabase DB (PITR first if available), then redeploy API with new URLs |
| Data migration gone wrong | Re-run Phase 14 `migrate.ts` with `--dry-run` first; IDs are deterministic (UUID v5) so re-imports are safe |

## 6. Who can roll back

| Role | Access |
|---|---|
| Admin | All three platforms |
| Backend owner | Railway + Supabase |
| Frontend owner | Vercel |

Keep 2-person approval for any database restore in production.
