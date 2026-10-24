# Production Readiness Runbook

Operational guidance for deploying and running the Restaurant POS SaaS. Companion to
[ARCHITECTURE.md](./ARCHITECTURE.md), [SECURITY.md](./SECURITY.md) and [PHASES.md](./PHASES.md).

---

## 1. Environment

Set at minimum:

```
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-host
APP_KEY=            # php artisan key:generate

DB_CONNECTION=mysql
DB_HOST=... DB_PORT=3306 DB_DATABASE=... DB_USERNAME=... DB_PASSWORD=...

CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis        # or database
REDIS_HOST=... REDIS_PORT=6379

MAIL_MAILER=smtp
MAIL_FROM_ADDRESS=noreply@your-host
LOG_CHANNEL=stack           # structured logs
```

- **Never** commit `.env`. Keep secrets in the platform secret store.
- `APP_DEBUG=false` in production (prevents stack-trace leakage).

## 2. Deploy procedure

### One-command deploy (recommended)

```
./scripts/release.sh patch        # on develop: checks, bump VERSION, merge to main, tag, push
./scripts/deploy.sh v0.1.1        # on the server: deploy a tag (also the rollback command)
./scripts/deploy.sh               # on the server: deploy latest main
```

`scripts/deploy.sh` runs composer, `npm ci && npm run build`, then `php artisan app:deploy`
(maintenance mode, migrate, config/route/view/event cache, `queue:restart`) and probes `/health`.
GitLab CI (`.gitlab-ci.yml`) tests every branch and, on a `vX.Y.Z` tag, offers a manual
`deploy:production` job that SSHes in and runs the same script. Each release changes `VERSION`,
so installed PWAs fetch the new service worker and show the update prompt.

### Manual steps (what the script does)

```
composer install --no-dev --optimize-autoloader
npm ci && npm run build
php artisan migrate --force          # review migrations first; see §7
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan queue:restart            # tell workers to pick up new code
```

Health check after deploy: `GET /health` must return `200 {"status":"ok"}`.

### Progressive Web App

- `npm run build` emits the web manifest (`public/build/manifest.webmanifest`) and the
  service worker (`public/build/sw.js`). Both are build artifacts — deploy them with the
  assets, or the app is not installable and has no offline shell.
- A service worker only registers in a **secure context**: serve over HTTPS (or `localhost`
  during development). Over plain HTTP on a LAN address the app works, but is not
  installable and does not work offline — this is browser policy, not configuration.
- Installed clients update through an in-app prompt. The precache is revisioned by content
  hash, so a deploy is picked up automatically; the revision for `/offline.html` is the
  build commit.
- The version reported by `GET /health` and the sidebar comes from the committed `VERSION`
  file. A deploy may set `APP_VERSION` (and `APP_COMMIT`) to override it — recommended when
  releasing from a tag.

## 3. Required long-running processes

| Process | Command | Notes |
|---------|---------|-------|
| Web | PHP-FPM / Octane behind nginx | Serve `public/` only |
| Queue worker | `php artisan queue:work --tries=3 --timeout=120` | Supervise with systemd/Supervisor; restart on deploy |
| Scheduler | `* * * * * php artisan schedule:run` | Runs the recurring tasks below |

### Scheduled tasks

| Task | Schedule | Purpose |
|------|----------|---------|
| `subscriptions:process` | daily 01:00 | Expire trials → past due; suspend after grace |
| `usage:record` | daily 02:00 | Per-tenant usage snapshot |
| `alerts:low-stock` | hourly | Low-stock notifications |
| `notifications:daily-sales` | daily 23:30 | Daily sales summaries |
| `billing:warn-expiring` | daily 09:00 | Trial/period expiry warnings |
| `db:backup` | daily 03:00 | Portable snapshot |
| `db:verify-backup` | daily 04:00 | Restore verification |
| `app:health` | every 5 min | Probe DB/cache/storage/queue |
| `queue:prune-failed` | weekly | Housekeeping |

## 4. Monitoring

- **Health:** poll `GET /health` (also `GET /up`). The endpoint reports database, cache,
  storage and queue (queued/failed job counts) and returns `503` when a critical check fails.
- **Errors:** centralized error tracking (e.g. Sentry) via the log channel.
- **Logs:** structured with a correlation id — every request gets `X-Request-ID`, echoed in
  the response and attached to the log context (`request_id`, `tenant_id`, `user_id`).
  Use it to trace a request through logs and jobs.
- **Queues:** watch `failed_jobs` (surfaced on the platform dashboard); alert on growth.
- **Database:** watch slow-query logs and connection counts.

## 5. Backups & restore

- `php artisan db:backup` writes a gzipped logical snapshot to `storage/app/private/backups`
  and prunes to the last 14. **Also** use native snapshots (managed DB backups / `mysqldump`)
  — the in-app backup is a portable safety net, not a substitute.
- `php artisan db:verify-backup` re-reads the latest snapshot and confirms the core tables
  are present and parseable. **A backup is not real until a restore has been tested** —
  periodically restore into a scratch database and run the app against it.

## 6. Performance

- Caching: tenant plan/entitlements are cached for 5 minutes and invalidated on subscription
  or plan change. Use Redis in production.
- Indexes: composite indexes lead with `tenant_id`; hot paths (orders, order_items,
  stock_balances, payments) are indexed. Profile with real queries before adding more.
- POS sale is a single transaction; kitchen tickets and notifications run off the request
  path (queued / scheduled).
- For load testing, drive `/health` (baseline) and the POS sale endpoint with k6/ab against
  a staging copy seeded with representative data; watch query counts and p95 latency.

## 7. Migrations & rollback

- Migrations are additive and reversible (`down()` implemented) — but **data migrations**
  that rewrite financial/stock rows need an explicit reconciliation + rollback plan.
- Always back up before `migrate` (in-app backup or native snapshot).
- Application rollback: redeploy previous release + `php artisan migrate:rollback` only if
  the migration was additive; never roll back a migration that dropped/rewrote data without
  restoring the backup.

## 8. Security checklist

- [ ] `APP_DEBUG=false`, strong `APP_KEY`, HTTPS enforced.
- [ ] Session/cookies `Secure` + `HttpOnly`; `SESSION_ENCRYPT` considered.
- [ ] Login throttling active (Laravel rate limiter on the login request).
- [ ] Security headers set (the app adds `X-Content-Type-Options`, `X-Frame-Options`,
      `Referrer-Policy`).
- [ ] Tenant isolation covered by tests (`php artisan test`).
- [ ] Platform workspace reachable only by platform admins; impersonation audited.
- [ ] Private file storage for tenant documents; uploads size-limited.
- [ ] Secrets not logged; PII minimized in logs.
- [ ] Dependency vulnerability scan (e.g. `composer audit`, `npm audit`) in CI.

## 9. Go-live checklist

- [ ] `php artisan test` green.
- [ ] `GET /health` returns ok; scheduler + worker running.
- [ ] `GET /health` reports the expected `version` for this release.
- [ ] Manifest and service worker reachable over HTTPS; the app installs and the offline
      page shows when the network is cut.
- [ ] Backups configured and a restore has been tested.
- [ ] Error tracking + log aggregation wired.
- [ ] Seeds/plans reviewed (`PlanSeeder`), platform admin created.
- [ ] Mail deliverability verified (SPF/DKIM) and queue worker draining.
- [ ] Timezone/currency per tenant verified (reports depend on it).
