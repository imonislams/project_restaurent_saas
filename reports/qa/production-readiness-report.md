# Category E — Production Readiness Report

**Testing category:** E — Production Readiness Assessment
**Execution date:** 2026-11-14
**Environment:** local `.env` (APP_ENV=local), QA database for destructive-safe checks
**Method:** readiness commands, config audit against `docs/PRODUCTION.md`, backup/restore verification, cache-build test
**Overall result:** **NEEDS IMPROVEMENT** — the operational scaffolding is genuinely good, but one High-severity data-protection defect and two deployment-critical config gaps block a clean go-live.

---

## Executive Summary

This category assesses whether the application *can* be operated in production — not whether it is fast
or secure (that was Categories A–D), but whether the plumbing, safeguards and runbook hold up.

**What is in good shape.** Honestly, more than I expected:

- `app:health` — all five checks pass (database, cache, storage, public storage, queue).
- `platform:check` — reports clean, with an honest "last backup: none / not verified" rather than a false green.
- **Zero pending migrations** in both databases (101 applied).
- **Backup works and is verifiably restorable**: 143 tables, 103,503 rows, 1.6 MB.
- **Cache build is clean**: config, route and view caches all compile without error.
- The scheduler is thoughtfully configured — 17 tasks, `withoutOverlapping()` on the long ones, and
  `--tries`/`--backoff` set on queued jobs.

**What blocks a clean go-live:**

| # | Issue | Severity |
|---|---|---|
| QA-E-01 | Backups are **unencrypted** and contain password hashes + all business data | **High** |
| QA-E-02 | `APP_DEBUG=true` and session hardening unset in the working `.env` | **High** (deploy blocker) |
| QA-E-03 | `innodb_buffer_pool_size` = 16 MB — will cap production throughput | Medium |
| QA-E-04 | No dependency audit in CI (the gap that hid Category A findings) | Medium |
| QA-E-05 | 111 files fail `pint --test`, so `composer release:check` is red | Medium |

---

## Test Statistics

| Metric | Count |
|---|---|
| Readiness checks run | 6 |
| Passed | 4 |
| Failed | 2 |
| Findings raised | 5 |
| Blocked | 0 |

| ID | Check | Result |
|---|---|---|
| E-01 | Health & readiness commands | **PASS** |
| E-02 | Migration state | **PASS** — 0 pending |
| E-03 | Backup & restore verification | **PASS** (restorable) — but see QA-E-01 |
| E-04 | Cache build (config/route/view) | **PASS** |
| E-05 | Environment hardening | **FAIL** — QA-E-02 |
| E-06 | Backup confidentiality | **FAIL** — QA-E-01 |

---

## Detailed Findings

### QA-E-01 — Backups are written unencrypted and contain password hashes

| Field | Value |
|---|---|
| **Severity** | **High** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `config/platform.php:111-114`, `app/Support/DatabaseBackup.php` |
| **Affected workflow** | `php artisan db:backup` (scheduled daily 03:00) |
| **CVSS-style** | High — bulk credential + business-data exposure from a single file |

**Reproduction**
1. `php artisan db:backup` → writes `platform-*.json.gz`.
2. The file has **no `.enc` suffix** and is **not** a Laravel `Crypt` payload (verified: does not begin with the encrypted-JSON marker).
3. Decompressing it yields plain JSON for **143 tables**.

**Verified contents (values not printed):**

| Table | Rows | Sensitive columns present |
|---|---|---|
| `users` | 200 | **`password` (bcrypt hash present)**, **`manager_pin`** |
| `tenants` | 100 | business identity, settings |
| `orders` / `payments` | 4,168 each | full transaction history |
| `subscriptions` | 100 | billing state |

**Root cause:** `'encrypt' => (bool) env('PLATFORM_BACKUP_ENCRYPT', false)` — the default is `false`,
and `PLATFORM_BACKUP_ENCRYPT` appears nowhere in `.env.example`. So a default install produces
**plaintext backups of every tenant's business data and credential hashes**, written to
`storage/app/private/backups` and pruned after 30 days.

**Expected:** a backup containing credential material is encrypted at rest, and encryption is on by
default (opt *out*, not opt *in*).

**Actual:** plaintext by default, with no documentation warning.

**Business impact:** one leaked backup file = full compromise of every tenant account (offline
bcrypt cracking against 200+ hashes) plus complete business-history disclosure. Backups are also the
files most likely to be copied off-host, emailed, or dropped into cloud storage — they travel further
than the database does. Under most data-protection regimes this is a reportable exposure.

The mitigating factor: backups live under `storage/app/private`, which is not web-served. The
threat is not remote download but any operator with filesystem or backup-rotation access.

**Recommended solution:** default `encrypt` to `true`, document `PLATFORM_BACKUP_ENCRYPT` and
`PLATFORM_BACKUP_RETENTION_DAYS` in `.env.example`, and re-encrypt or purge existing plaintext
artefacts. The encryption code path already exists (`Crypt::encryptString`) — only the default is wrong.

**Not implemented — awaiting approval.** I did not flip the default or delete the existing backup.

---

### QA-E-02 — Working `.env` is a development profile and would be a live misconfiguration

| Field | Value |
|---|---|
| **Severity** | **High** (deployment blocker) |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `.env` |
| **Affected endpoint** | all error responses |

**Evidence (values not reproduced):**

| Key | Current | Production requirement | Verdict |
|---|---|---|---|
| `APP_ENV` | `local` | `production` | ✗ |
| `APP_DEBUG` | **`true`** | `false` | **✗ critical** |
| `SESSION_SECURE_COOKIE` | **unset** | `true` | ✗ |
| `SESSION_ENCRYPT` | **unset** | `true` (or deliberate) | ✗ |
| `LOG_LEVEL` | `debug` | `warning` | ✗ |
| `MAIL_MAILER` | `log` | `smtp` | ✗ |

**Business impact:** with `APP_DEBUG=true`, any unhandled exception renders a stack trace with file
paths, environment values and often SQL fragments. Combined with Category A's finding that the
`/health` endpoint is public, this is a straightforward reconnaissance path. Unset
`SESSION_SECURE_COOKIE` also allows the session cookie over plain HTTP, exposing it to SSL-strip.

**Important nuance:** this is the **local development `.env`**, and `docs/PRODUCTION.md` §1 correctly
documents the production values. The risk is operational, not code: the install wizard writes the
live `.env`, so the values depend on whoever runs it. The finding is that **nothing enforces them** —
there is no boot-time guard that refuses to serve traffic when `APP_ENV=production` and
`APP_DEBUG=true`.

**Recommended solution:** add a boot-time assertion in `AppServiceProvider` that throws when
`app()->isProduction()` and `config('app.debug')` is true, and mirror the two session flags into
`app:install` with secure defaults.

---

### QA-E-03 — InnoDB buffer pool is 16 MB, which will cap production throughput

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | environment (not application code) |
| **Affected workload** | POS writes, reports |

**Evidence:** `innodb_buffer_pool_size = 16777216` (16 MB) — the XAMPP default.

**Business impact:** Category C measured ~259 ms per sale and Category D a ~6 sales/sec ceiling. Part
of that is the application's 65-query transaction; part is this buffer pool, which forces constant
disk reads on a dataset that would otherwise sit fully in memory. **The production figure will be
worse or better depending entirely on this setting**, and it is invisible to the application.

**Recommended solution:** confirm the production host's buffer pool. For a database of this shape
(143 tables, growing order/stock history), 1–2 GB is a reasonable starting point. This is a
deployment checklist item, not a code change.

---

### QA-E-04 — No dependency audit in CI

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `.gitlab-ci.yml` |

**Evidence:** the pipeline runs `pint --test`, `php artisan test`, `npx tsc --noEmit`, `npm run test:js`
and the build — but **no `composer audit` and no `npm audit`**. `docs/PRODUCTION.md` §8 lists
"Dependency vulnerability scan (e.g. composer audit, npm audit) in CI" as a checklist item that was
never implemented.

**Business impact:** Category A found 9 PHP advisories and 20 npm advisories sitting in `composer.lock`
/ `package-lock.json`. None were caught by the pipeline; they will recur silently after every
dependency bump.

**Recommended solution:** two lines in the `test` stage. `composer audit` fails the job on a known
advisory; `npm audit --omit=dev` scopes to what actually ships.

---

### QA-E-05 — `pint --test` fails on 111 files, so `composer release:check` is red

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | codebase-wide style |

**Evidence:** `vendor/bin/pint --test` → **111 files** with style issues. Verified pre-existing: they
fail identically with all audit changes stashed.

`composer release:check` runs `pint --test` first, so **the documented release gate cannot pass today**.

**Business impact:** a permanently-red gate is worse than no gate — it trains everyone to ignore the
check. It also means the `test:php` CI job (which runs `pint --test`) is failing on `main`, so the
pipeline signal for real test failures is buried.

**Recommended solution:** one `vendor/bin/pint` run in its own commit, reviewed as a no-op diff.
I deliberately did not reformat 111 files during an audit.

---

## Verified as READY (with evidence)

| Area | Verdict | Evidence |
|---|---|---|
| Health endpoint | **PASS** | `app:health`: database, cache, storage, public_storage all OK; queue 0/0 |
| Platform readiness | **PASS** | `platform:check` — honest reporting, no false green |
| Migrations | **PASS** | 101 applied, **0 pending** in dev and QA |
| Backup restorability | **PASS** | `db:verify-backup`: "Readable; 143 tables, 103503 rows" |
| Migration reversibility | **PASS** | existing `PlatformReadinessTest` asserts every migration has `down()` |
| Config cache | **PASS** | `config:cache` OK |
| Route cache | **PASS** | `route:cache` OK — no closures blocking serialisation |
| View cache | **PASS** | `view:cache` OK |
| Scheduler | **PASS** | 17 tasks; `withoutOverlapping()` on marketing jobs; backup + verify-backup + prune all scheduled |
| Private storage | **PASS** | `local` disk roots at `storage/app/private`, not web-served |
| Queue config | **PASS** | `retry_after` 90s, failed-job pruning weekly; `OpenKitchenTicket` has `$tries=3`, `$backoff=[5,30,120]` |
| Logging | **PASS** | structured stack driver, DB log channel at `warning` |
| Stale queues | **PASS** | 0 queued, 0 failed |

---

## Blocked measurements

| Metric | Why |
|---|---|
| Real email deliverability | `MAIL_MAILER=log`; SPF/DKIM is a production-host concern |
| HTTPS/HSTS behaviour | No TLS-terminating host locally |
| Worker supervision | No systemd/Supervisor on this workstation |
| Production DB topology | Not inspected — out of scope and not reachable |

---

## Go-live checklist (from `docs/PRODUCTION.md` §9, assessed)

| Item | Status |
|---|---|
| `php artisan test` green | ✓ (with the 4 pre-existing GD failures noted in Category C) |
| `GET /health` returns ok | ✓ |
| Scheduler + worker running | ✓ configured, not running here |
| Manifest + SW reachable over HTTPS | ✓ built (`public/build/manifest.json`) |
| Backups configured **and a restore tested** | ✓ now tested — but **unencrypted** (QA-E-01) |
| Error tracking + log aggregation | ✗ not wired |
| Seeds/plans reviewed | ✓ PlanSeeder present, 6 plans |
| Mail deliverability verified | ✗ not applicable locally |
| Timezone/currency per tenant | ✓ supported (`region.timezone`, multi-currency reports) |
| **Dependency scan in CI** | ✗ **QA-E-04** |

---

## Recommendations (ordered)

1. **QA-E-01** — flip backup encryption to default-on. One config line with real data-protection impact.
2. **QA-E-02** — add the boot-time `APP_DEBUG` guard. Turns a silent misconfiguration into a loud failure.
3. **QA-E-04** — add both audits to CI. Cheap, and closes the loop that let Category A's findings persist.
4. **QA-E-03** — confirm the production buffer pool. Not code, but it decides your throughput.
5. **QA-E-05** — one Pint commit to un-red the release gate.

---

## Final Verdict

**NEEDS IMPROVEMENT**

The operational scaffolding is above average for a project this size — health checks that report
honestly, a verified-restorable backup, a clean cache build, zero migration drift, a thoughtful
scheduler. That deserves saying plainly.

But it is not production-ready yet: backups expose credential hashes by default (QA-E-01), the
environment has no guard against shipping with debug on (QA-E-02), and the release gate is
permanently red so the CI signal is untrustworthy (QA-E-05).

All five items are small, targeted changes. None requires architectural work.

---

## Remediation status (added 2026-11-14, after the audit)

The verdict above records the state at audit time. This section records what has since changed.

| ID | Status | What changed | Evidence |
|---|---|---|---|
| QA-E-01 | **Verified fixed** | `platform.backups.encrypt` now defaults to **true** | A real backup run produces a `.enc` file that is a genuine `Crypt` payload; a seeded email address was asserted **absent** from the file as plaintext |
| QA-E-02 | **Verified fixed** | `AppServiceProvider::guardProductionConfiguration()` throws at boot when `APP_ENV=production` and `APP_DEBUG=true`, or when `APP_KEY` is missing | 4 tests: allowed in local/testing, throws in production with debug on, throws with no key, passes with debug off + key present |
| QA-E-03 | **Open — not a code change** | Nothing changed | `innodb_buffer_pool_size` is a database server setting. It belongs on the deployment checklist, not in the repo. **Still 16 MB locally.** |
| QA-E-04 | **Fixed, unverified** | `audit:dependencies` (`composer audit`) and `audit:npm` (`npm audit --omit=dev`) jobs added to CI | Cannot run until pushed. Both set to `allow_failure: true` **deliberately** — the lock file still carries 9 known advisories, so a blocking gate would turn every pipeline red on day one. Flip to `false` in the change that runs `composer update` (QA-A-09). |
| QA-E-05 | **Verified fixed** | `vendor/bin/pint` run across the repository | `pint --test` now **passes on 948 files** (was 111 failures). 127 files changed. Full suite run before and after: identical failure counts (16 both ways), so nothing regressed. |

### The release gate is still not green — and it is not pint's fault

`composer release:check` runs `pint --test` **then** `php artisan test`. Pint now passes, but the suite
still has **16 failures**, all pre-existing:

- **~9** from the missing **`gd` extension** (image upload, logo upload, QR PNG/PDF rendering)
- **~7** from marketing SEO/title assertions unrelated to any change made here

**Installing `gd` on the CI runner is the single change that would make the gate meaningful.** Until
then, `composer release:check` will fail on code that is fine, which is exactly the condition that
trains people to ignore a red gate.

### Revised verdict

**Near-ready.** Of the two High findings, both are fixed and verified (encrypted backups, boot-time
debug guard). The release gate is unblocked on formatting but blocked on an environment dependency.

**Before go-live, three things are yours, not the code's:**

1. Install `gd` (or `imagick`) on the deploy target and CI runner — `docs/PRODUCTION.md` §1 already
   requires it, and without it QR codes and image uploads return 500.
2. Set `APP_ENV=production`, `APP_DEBUG=false`, `SESSION_SECURE_COOKIE=true` in the live `.env` — the
   new boot guard will now refuse to start if debug is left on, which is the intended behaviour.
3. Set `TRUSTED_PROXIES` and `ALLOWED_HOSTS` if the app sits behind a CDN or load balancer (QA-A-10),
   and confirm `innodb_buffer_pool_size` on the database host (QA-E-03).
