# Nexfra ERP — Monitoring & Observability

## Health endpoint

```
GET https://api.nexfra.in/api/health
→ {"status":"ok","uptime":<s>,"timestamp":"<iso>"}
```

Railway pings this every 30s (Docker HEALTHCHECK + `railway.json`
`healthcheckPath`). Non-200 for ~3 consecutive probes → container restarted.

Uptime monitor: UptimeRobot / Better Stack — check every 1 min from 2 regions,
alert on `status != ok`.

## Logs

- **Backend**: Railway → Deployments → View Logs. pino JSON lines:
  - `level=30` info (requests via morgan→pino, migrations)
  - `level=40` warn (4xx, rate-limit hits)
  - `level=50` error (5xx, unhandled)
  - Secrets are redacted by pino (`authorization`, `password`, `token`).
- **Frontend**: Vercel → Project → Logs (build logs). Runtime console logs are
  stripped in production builds (`drop_console`).
- **DB**: Supabase Dashboard → Database → Logs (SQL query / auth events).

## Metrics to watch

| Signal | Where | Alert threshold |
|---|---|---|
| Uptime | health endpoint | 3 consecutive failures |
| HTTP 5xx rate | Railway logs / Sentry | > 5 in 15 min |
| HTTP 429 rate | rate-limit log lines | sustained spike |
| p95 response time | Railway → Metrics | > 500 ms |
| DB connections | Supabase → Database → Monitoring | near max (default 60) |
| Storage usage | Supabase → Storage | > 80% plan limit |
| Failed logins | Supabase → Auth → Logs | > 10 / 15 min |
| Build failures | GitHub Actions / Vercel | any on `main` |

## Error tracking (recommended)

- **Sentry** (free tier): attach `@sentry/node` to the backend and `@sentry/browser`
  to the ERP. Capture unhandled errors + `errorHandler` cases server-side.
- **Vercel Analytics** (free): frontend traffic + Core Web Vitals.

## Alerting channels

1. **Email** — primary (critical).
2. **Slack webhook** — Railway deploys, GitHub Actions failures, uptime alerts.
3. **PagerDuty** (only if on-call rotation exists) — downtime > 5 min.

Set alert routing in UptimeRobot + Sentry + Slack integrations.

## Runbook — "API is down"

```
1. Check health:  curl https://api.nexfra.in/api/health
2. Railway → Service → Metrics — CPU/mem spikes?
3. Railway → Deployments → View Logs — 5xx errors or crash loop?
4. Supabase → Database → Monitoring — connection exhaustion?
5. If crash loop: deploy previous Railway deployment (see rollback.md)
6. If DB issue: check Supabase status page + backups (see backup.md)
7. Confirm recovery, then post to Slack #alerts
```

## Runbook — "ERP is slow / broken"

```
1. Vercel → Analytics — LCP / INP regression?
2. Vercel → Deployments — was a new build just promoted? (roll back if yes)
3. Railway → Metrics — p95 latency, DB latency
4. Check Sentry for new error spike
```

## Scheduled reviews

| Review | Cadence |
|---|---|
| Log scan for anomalies | Weekly |
| Dependency audit (`npm audit`) | Monthly |
| Restore drill (restore backup to scratch project) | Quarterly |
| Permission review (Supabase users, Railway/Vercel members) | Quarterly |
