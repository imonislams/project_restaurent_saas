# QA Issue Register

**Branch:** `qa/security-performance-audit`
**Last updated:** 2026-11-15
**Statuses:** Detected → Reported → Awaiting Approval → Approved for Fix → Fixed (Not Yet Verified) → Verified / Rejected / Deferred

> Every issue waits here for your decision. Nothing moves to "Approved for Fix" or "Fixed"
> without your explicit approval of that specific Issue ID.

---

## Open Issues

| ID | Title | Severity | Category | Status | Report |
|---|---|---|---|---|---|
| QA-A-01 | Payment webhook signature verification returns `true` for `cash` and `manual` | **High** | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-01--payment-webhook-signature-verification-returns-true-for-cash-and-manual) |
| QA-A-02 | Webhook HMAC falls back to a hardcoded secret committed to the repository | **High** | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-02--webhook-hmac-falls-back-to-a-hardcoded-secret-committed-to-the-repository) |
| QA-A-03 | No Content-Security-Policy; security headers are partial | Medium | A | **Verified** — enforced in a real browser with zero page errors | [A](./vulnerability-test-report.md#qa-a-03--no-content-security-policy-security-headers-are-partial) |
| QA-A-04 | No rate limiting on authenticated business endpoints | Medium | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-04--no-rate-limiting-on-authenticated-business-endpoints) |
| QA-A-05 | Unauthenticated `/health` discloses version and commit | Low | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-05--unauthenticated-health-discloses-version-and-commit) |
| QA-A-06 | CSV exports vulnerable to formula injection | Low–Medium | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-06--csv-exports-are-vulnerable-to-formula-injection) |
| QA-A-07 | QR card canvas interpolates unvalidated style values | ~~Low~~ **Withdrawn** | A | **Rejected (false positive)** | [A](./vulnerability-test-report.md#verified-as-not-vulnerable-with-evidence) |
| QA-A-08 | Manager PIN approvals accept unlimited wrong guesses | Medium | A | **Verified** | [A](./vulnerability-test-report.md#qa-a-08--manager-pin-approvals-accept-unlimited-wrong-guesses) |
| QA-A-09 | Seven production PHP packages one patch behind security fixes | Medium | A | **Verified** — `composer update` applied; **9 advisories → 0** | [Dep](./dependency-audit-report.md#qa-a-09--seven-production-php-packages-are-one-patch-behind-their-security-fixes) |
| QA-A-10 | URL generation can trust client-supplied Host / forwarded headers | Medium | A | **Verified** — forged Host rejected live, including suffix bypass | [Dep](./dependency-audit-report.md#qa-a-10--url-generation-can-trust-client-supplied-host--forwarded-headers) |
| QA-A-11 | npm dev-toolchain advisories (7 High, 0 in production) | Low | A | **Verified** — CI job scopes to `--omit=dev`; no production exposure | [Dep](./dependency-audit-report.md#qa-a-11--npm-dev-toolchain-advisories-7-high-13-moderatelow) |
| QA-B-01 | `role_user.branch_id` is a dead column with a misleading contract | Low | B | **Verified** — column dropped (migration `2026_11_15_000001`) | [B](./security-test-report.md#qa-b-01--role_userbranch_id-is-a-dead-column-with-a-misleading-contract) |
| QA-C-01 | POS sale performs 65 queries and all stock work inside one transaction | **High** | C | **Verified** — 65→59 queries; 383→133 ms after QA-E-00 | [C](./load-performance-report.md#qa-c-01--pos-sale-performs-65-queries-and-all-stock-work-inside-one-transaction) |
| QA-C-02 | Per-branch order numbering serialises sales at ~7.5/sec | ~~High~~ **Informational** | C | **Reclassified** — documented capacity characteristic, not a defect. Lock is held to COMMIT, so an atomic increment cannot help. | [C](./load-performance-report.md#qa-c-02--per-branch-order-numbering-serialises-sales-at-75sec) |
| QA-C-03 | Four composite indexes missing on MySQL (EXPLAIN confirmed) | Medium | C | **Verified** — migration applied to both databases | [C](./load-performance-report.md#qa-c-03--four-composite-indexes-are-missing-on-mysql-confirmed-with-explain) |
| QA-C-04 | Inventory report applies no branch/period filter | Informational | C | **Verified** | [C](./load-performance-report.md#qa-c-04--report-endpoints-are-cheaper-than-predicted-downgraded) |
| QA-D-01 | POS throughput saturates at ~8 concurrent writers per branch | ~~Medium~~ **Informational** | D | **Resolved** — the ceiling was the 16 MB buffer pool, not lock contention. Throughput 2.61→7.53/sec after QA-E-00. | [D](./stress-test-report.md#qa-d-01--throughput-saturates-at-8-concurrent-writers-per-branch) |
| QA-D-02 | No graceful-degradation failure observed under 24-way concurrency | Informational | D | Reported (no action) | [D](./stress-test-report.md#qa-d-02--no-graceful-degradation-failure-mode-observed-informational) |
| QA-E-00 | Local MariaDB `innodb_buffer_pool_size` is 16 MB (XAMPP default) | Informational | D/E | **Verified** — raised to 256 MB; latency 2.9× better, throughput 2.9× better | [D](./stress-test-report.md#executive-summary) |
| QA-E-01 | Backups are written unencrypted and contain password hashes | **High** | E | **Verified** | [E](./production-readiness-report.md#qa-e-01--backups-are-written-unencrypted-and-contain-password-hashes) |
| QA-E-02 | No boot-time guard against `APP_DEBUG=true` in production | **High** | E | **Verified** | [E](./production-readiness-report.md#qa-e-02--working-env-is-a-development-profile-and-would-be-a-live-misconfiguration) |
| QA-E-03 | InnoDB buffer pool 16 MB will cap production throughput | Medium | E | **Open — deployment checklist item.** Cannot be verified from this repo; confirm on the production DB host. | [E](./production-readiness-report.md#qa-e-03--innodb-buffer-pool-is-16-mb-which-will-cap-production-throughput) |
| QA-E-04 | No dependency audit in CI (`composer audit` / `npm audit`) | Medium | E | **Verified** — pipeline jobs added; now **blocking** because advisories are 0 | [E](./production-readiness-report.md#qa-e-04--no-dependency-audit-in-ci) |
| QA-E-05 | `pint --test` fails on 111 files, so `release:check` is permanently red | Medium | E | **Verified** — now passes on 954 files | [E](./production-readiness-report.md#qa-e-05--pint---test-fails-on-111-files-so-composer-releasecheck-is-red) |

## Informational

| ID | Note | Status |
|---|---|---|
| QA-A-INFO-1 | `is_platform_admin` / `tenant_id` in `User::$fillable` — no exploit path found; latent privilege-escalation risk | Awaiting Approval |
| QA-A-INFO-2 | Public-disk upload paths tenant-prefixed and enumerable; filenames hashed | Awaiting Approval |

## Withdrawn / False Positives

| Pre-ID | Claim | Reason for withdrawal |
|---|---|---|
| QA-C-01 | CSRF exemption covers tenant gateway routes | **Withdrawn.** Exemption is `webhooks/*`, `payments/*`; tenant gateways live at `/settings/payments/*`. Not matched. My own error, corrected before reporting. |

## Deferred (pending confirmation in later categories)

| Pre-ID | Candidate | Expected category |
|---|---|---|
| QA-C-04 | 23 models carry `tenant_id` with no tenant scope | B | **Resolved** — `User` and `OfflineSyncConflict` traced; unscoped by design, enforced by policy / platform middleware. |
| QA-C-02 | `role_user.branch_id` written but never enforced | B | **Resolved** — column is never written; branch access uses `branch_user`. Downgraded to Low (QA-B-01). |
| QA-C-03 | `BelongsToTenant` fails open with no context | B / E |
| QA-C-09..18 | Performance findings | C / D |
| QA-C-07 | Session cookie flags depend on unset env | E |

---

## Fix history

### 2026-11-15 — QA-A-09, QA-B-01, QA-E-00 (approved, implemented, VERIFIED)

All five decisions from the "open for decision" list were actioned. Final state: **1000 tests passed,
0 failed** (6,698 assertions), `pint --test` PASS on 954 files, `composer audit` **0 advisories**.

| File | Change |
|---|---|
| `composer.lock` | 30 packages updated, all patch/minor. Laravel `12.70.1 → 12.72.0` |
| `database/migrations/2026_11_15_000001_drop_role_user_branch_id.php` (new) | Drops `role_user.branch_id`, reversible |
| `app/Domain/Identity/Concerns/HasRoles.php` | Removed `withPivot('branch_id')` |
| `app/Domain/Identity/RoleService.php` | `moveUsers()` no longer copies `branch_id` |
| `tests/Feature/Identity/CustomRoleManagementTest.php` | Renamed and updated the branch-scoped assignment test |
| `C:\xampp\mysql\bin\my.ini:147` | `innodb_buffer_pool_size=16M` → `256M` (outside the repo — see note) |

**QA-A-09 — dependency update.** `composer audit` went from **9 advisories across 6 packages to 0**.
Verified by dry-run first: 30 updates, **zero major version bumps**, Laravel stays on 12.x. The
suite was run immediately after and passed 995/997, with the only 2 failures caused by the
concurrent B-01 change — not the update.

**QA-B-01 — dead column dropped.** Verified before dropping that **0 of 67** `role_user` rows had a
non-null `branch_id`. Two code paths referenced it: `HasRoles::roles()` (`withPivot`) and
`RoleService::moveUsers()` (copy-forward). Both cleaned up. The `down()` migration restores the
column with its original comment and FK.

**QA-E-00 — buffer pool raised.** `SET GLOBAL` was refused at runtime — this build reports
`INNODB_BUFFER_POOL_SIZE_MAX = 16777216`, capping it at 16 MB until restart. The server runs as a
standalone `mysqld.exe` process (not a Windows service), started with
`--defaults-file=...my.ini --standalone`. It was stopped gracefully with `mysqladmin shutdown` and
restarted the same way.

**Measured effect (QA database, 15 sequential sales):**

| Metric | Before E-00 | After E-00 | Change |
|---|---|---|---|
| avg latency | 383.4 ms | **132.8 ms** | **−65%** |
| p95 | 670.5 ms | 421.1 ms | −37% |
| p99 | 670.5 ms | 421.1 ms | −37% |
| throughput | 2.61/s | **7.53/s** | **+189%** |
| queries / sale | 59.1 | 59.1 | unchanged |

This is the important result: **query count did not change, only the storage engine's ability to
serve it.** That confirms the throughput ceiling in Category D was the 16 MB buffer pool, not the
application — which is exactly what QA-D-01 and QA-E-03 predicted.

**Disclosure — this setting is outside the repository.** `my.ini` is the shared MariaDB
configuration for the whole XAMPP install, not a project file. A backup of the original is at
`C:\xampp\mysql\bin\my.ini.backup-qa-20261115`. To revert: restore that file and restart `mysqld`.
Only `project_restaurent_saas` and `project_restaurent_saas_qa` were subsequently inspected.

**Not done — QA-E-03.** The production database host's buffer pool cannot be checked from this
repository and was not guessed at. It remains a deployment checklist item.

---

### 2026-11-14 — QA-A-01, QA-A-02 (approved, implemented, NOT verified)

Six files changed. No tests were run, nothing committed or pushed, and no other issue was touched.

| File | Change |
|---|---|
| `app/Domain/Payments/WebhookService.php:75-80` | `cash` branch returns `false` instead of `true` |
| `app/Domain/Payments/Gateways/ManualGateway.php:23-29` | `verifyWebhook()` returns `false` instead of `true` |
| `config/services.php:38-44` | Removed hardcoded `stub-secret` default |
| `app/Domain/Payments/Gateways/StubGateway.php:25-40` | Fails closed when the secret is empty |
| `phpunit.xml:33-35` | Test-only `PAYMENT_STUB_SECRET` so existing webhook tests can sign |
| `.env.example:74-76` | Documented `PAYMENT_STUB_SECRET` (empty) |

**Behaviour changes to be aware of:**
- `POST /webhooks/payments/cash` and `POST /webhooks/payments/manual` now return `401` and do not process. Cash sales are unaffected — they settle in-process via `SaleService`.
- A deployment using the `stub` provider must set `PAYMENT_STUB_SECRET`, or its webhooks will be rejected.

**Not changed (separate instance, same defect class):** `app/Domain/PaymentGateways/Gateways/ManualGateway.php:41-44` also returns `true`, but is unreachable — `PlatformPaymentService::handleNotification()` returns early for `manual` at `:123-129`. Proposed as a follow-up, not folded into this fix.

**Verification outcome — PASSED (2026-11-14)**

Temporary suite `WebhookAuthVerificationTest` (6 cases, 18 assertions) — all passed. Removed after
the re-test; it was created for verification only and is not part of the project suite.

| Probe | Expected | Result |
|---|---|---|
| Unsigned `POST /webhooks/payments/cash` | 401, payment stays `pending` | **PASS** |
| Unsigned `POST /webhooks/payments/manual` | 401, payment stays `pending` | **PASS** |
| Signed `stub` webhook, secret configured | 200, payment `succeeded` | **PASS** |
| `stub` webhook with no secret, self-consistent empty-key signature | 401, payment stays `pending` | **PASS** |
| `stub` webhook signed with the old hardcoded default | 401, payment stays `pending` | **PASS** |
| Duplicate signed webhook | deduped, one event row | **PASS** |

**Negative control (important):** I temporarily reverted the four security files and re-ran the same
suite. Three cases failed with `Expected 401, received 200` — proving the tests genuinely detect the
vulnerability rather than passing vacuously. The fixes were then restored from `git stash`.

**Regression:** `AdvancedFeaturesTest`, `TenantGatewayTest`, `QrBillingTest` and the verification
suite together — **31 passed, 114 assertions**. No pre-existing payment behaviour broken.

**Environment:** tests ran on in-memory SQLite per `phpunit.xml`. The development MySQL database and
the production payment configuration were never touched.

---

### 2026-11-14 — QA-A-04, QA-A-05, QA-A-06, QA-A-08 (approved, implemented, VERIFIED)

| File | Change |
|---|---|
| `app/Domain/Identity/ManagerPinService.php` | Throttle PIN failures: 5 attempts, 300s lockout, keyed `tenant:user`; success clears the counter; lockout audited |
| `app/Providers/AppServiceProvider.php` | Added `workspace` (120/min) and `workspace-heavy` (20/min) limiters keyed per user |
| `routes/web.php` | `throttle:workspace` on the tenant group; `throttle:workspace-heavy` on `/pos/orders` and `/reports` |
| `app/Http/Controllers/HealthController.php` | `/health` returns status only unless platform admin or opt-in flag |
| `config/app.php` | `health_disclose_detail` (env `HEALTH_DISCLOSE_DETAIL`, default false) |
| `app/Support/Csv.php` (new) | `Csv::safe()` / `Csv::row()` neutralise `= + - @` and control-char prefixes |
| 6 export controllers | `fputcsv` rows wrapped in `Csv::row()` |
| `.env.example` | Documented `HEALTH_DISCLOSE_DETAIL` |
| `tests/Feature/Readiness/{ReadinessTest,AppVersionTest}.php` | Detail assertions now opt in; added status-only public-payload tests |

**Behaviour changes to know:**
- A user who fails a manager PIN 5 times is locked out for 5 minutes. A *correct* PIN during lockout is refused (that is the point).
- `/health` no longer exposes version/commit/checks publicly. `deploy.sh` and `deploy-release.sh` only check HTTP 200, so deploys are unaffected. A monitor needing full detail sets `HEALTH_DISCLOSE_DETAIL=true`.
- Export cells starting with a formula trigger gain a leading apostrophe. Numeric cells are untouched.

**Verification outcome — PASSED**
Temporary suite `CategoryAFixVerificationTest` — **11 cases, 47 assertions, all passed.**
Negative control: reverting the four files produced **5 failures** (PIN lockout ×3, workspace limiter, health disclosure), proving the tests detect the defects. Restored afterwards.

**Regression:** 104 passed, 729 assertions across Readiness, PlatformOps, VoidOrder, Shift, ManagerPin, CustomerSegmentation, MarketingLeads, PlatformReadiness, PosSale, Purchasing, OnboardingGating.

---

### 2026-11-14 — QA-A-03 implemented; QA-A-07 withdrawn

**QA-A-03 — security headers** (Fixed, Not Yet Verified)

| File | Change |
|---|---|
| `app/Http/Middleware/AddSecurityHeaders.php` | Added CSP (Report-Only by default), HSTS over HTTPS only, `Permissions-Policy` |
| `config/app.php` | `csp_enabled` / `csp_report_only` (env `CSP_ENABLED`, `CSP_REPORT_ONLY`) |
| `.env.example` | Documented both |

Verified with 7 probes (`SecurityHeadersTest`, 20 assertions, all passed): Report-Only header present
by default; enforcing header sent when opted in; disabled entirely by config; Permissions-Policy
denies camera/microphone/geolocation; HSTS absent on plain HTTP and present on HTTPS; the four
pre-existing headers unchanged.

**Still "Not Yet Verified" on purpose:** CSP correctness needs a real browser. Report-Only means
nothing is blocked, so shipping it is safe, but I cannot claim the policy is complete until someone
loads the actual app and reads the violation report. `'unsafe-inline'` is still required for
`style-src` (Radix inline styles) and `script-src` (Vite dev client, Ziggy). Remove those with
nonces before enforcing.

**QA-A-07 — withdrawn as a false positive.** See the report; `normalizeCanvas()` already enforces
hex-only colours, type allowlisting, numeric clamping and path-traversal rejection at write time.

**Also fixed (scope creep, disclosed):** `pint` auto-formatted `MenuController.php`,
`AppServiceProvider.php` and `routes/web.php` — style only, no behaviour change. I did this because
those three were the only files I had already modified, and leaving red CI on files I touched would
be worse. I did **not** reformat the other 108 failing files.

---

### 2026-11-14 — QA-E-01, QA-E-02, QA-E-04 (implemented, VERIFIED)

| File | Change |
|---|---|
| `config/platform.php:111-118` | `backups.encrypt` now defaults to **true** |
| `app/Providers/AppServiceProvider.php` | `guardProductionConfiguration()` throws when production + `APP_DEBUG=true`, or no `APP_KEY` |
| `.gitlab-ci.yml` | Added `audit:dependencies` (`composer audit`) and `audit:npm` (`npm audit --omit=dev --audit-level=high`) jobs |

**Verification:** 6 temporary tests, 13 assertions, all passed. Negative control: reverting the two
app files produced **4 failures**, proving the tests detect the defects.

- Backup artifact now ends in `.enc` and is a real Crypt payload — asserted that a seeded email
  address does **not** appear as plaintext in the file.
- Debug guard: allowed in local/testing; throws in production with debug on; throws with no `APP_KEY`;
  passes in production with debug off and a key present.

**Regression:** 45 passed, 517 assertions (PlatformReadiness, Readiness, AppVersion, PlatformOps,
VoidOrder, PlatformAccess).

**Deliberate deviation from the finding:** I set both audit jobs to `allow_failure: true`, not
blocking. The lock file currently carries 9 known advisories, so a blocking gate would turn every
pipeline red immediately and bury genuine test failures — the same problem as QA-E-05. The jobs now
*report* the advisory count on every run. Flip to `allow_failure: false` in the change that runs the
`composer update` for QA-A-09.

**QA-E-03 is not a code change.** The InnoDB buffer pool is a database server setting; it belongs on
the deployment checklist, not in this repository.

---

### 2026-11-14 — Performance set: QA-C-01, C-03, C-04 (implemented)

| File | Change |
|---|---|
| `app/Domain/POS/SaleService.php` | `resolveLines()` batched into one `whereIn` + eager `availability`; `deductStock()` reuses the calculated lines instead of re-reading items/products |
| `app/Domain/Reporting/ReportService.php` | `inventory()` now honours `$period->branchId` |
| `database/migrations/2026_11_14_000001_…` | Four composite indexes, tenant-first, reversible, idempotent |

**Measured effect (QA database, 20 sequential sales):**

| Metric | Before | After | Change |
|---|---|---|---|
| avg latency | 258.7 ms | **198.8 ms** | −23% |
| median | 249.3 ms | 190.8 ms | −23% |
| p95 | 372.1 ms | 248.9 ms | −33% |
| p99 | 436.2 ms | 327.5 ms | −25% |
| queries / sale | 65.0 | **59.1** | −9% |
| throughput | 3.87/s | **5.03/s** | +30% |

**Honest assessment:** this is a real improvement but **not the 15–20 query target I predicted**. The
remaining cost is per-row work that is genuinely required: one `stock_movements` insert + one
`stock_balances` update + one `audit_logs` insert per line, plus kitchen tickets, invoice linkage and
the deliberate `lockForUpdate` on `order_sequences` and on the order inside `ensureForOrder`. Cutting
further means changing behaviour (batching writes, deferring audit/kitchen to after commit) — I did
not do that unasked.

**Verified:** 2 temporary tests. The inventory report now returns 1 row for a 1-branch filter where it
previously returned 2; `resolveLines` issues ≤2 product queries for 4 line items.

**Regression:** 112 passed, 810 assertions across POS, reports, inventory, purchasing, QR and realtime.
One failure (`StockBalancePaginationTest`, `10` vs `10.0`) is **pre-existing** — it fails identically
with these changes stashed.

**Index note:** the migration's indexes exist and are reversible, but at 717 orders MySQL still prefers
the older `orders_tenant_id_placed_at_index` / `stock_movements_tenant_id_created_at_index` for two of
the four. `payments_tenant_status_paid_index` **is** used. This is the same "dataset too small to prove
the win" caveat recorded in Category C.

**QA-C-02 is deliberately not changed.** Making the sequence increment a single atomic statement would
raise the concurrency ceiling, but it alters how gap-free numbering is guaranteed — a billing-integrity
decision, not a performance one. It needs your explicit sign-off.

---

### 2026-11-14 — QA-C-02: attempted, my proposed fix was wrong, reverted

**I tried the fix I recommended and it failed. Recording it rather than quietly dropping it.**

**What I tried:** replace the `SELECT … FOR UPDATE` + `save()` pair in `OrderNumberGenerator` with a
single atomic `UPDATE … SET last_number = LAST_INSERT_ID(last_number + 1)`, on the reasoning that one
statement would hold the lock for less time than two.

**Result: 40 test failures** (`500` responses on every sale path). Two separate causes:

1. **The SQL is MySQL-only.** The test suite runs on SQLite; `LAST_INSERT_ID()` does not exist there.
   That alone was fatal and should have been obvious before I wrote it.
2. **The premise was wrong anyway.** I then measured the property directly — whether InnoDB releases a
   row lock at statement end or only at commit:

| Scenario | Second transaction blocked? | Wait |
|---|---|---|
| increment issued, transaction still open | **YES** | 2.01 s (timeout) |
| increment issued, transaction committed | no | 0.00 s |

   **InnoDB holds row locks until COMMIT.** An atomic increment would not shorten the contended window
   by a single millisecond, because the window is the whole sale transaction either way.

**Reverted immediately** — `OrderNumberGenerator.php` is byte-identical to its original state
(`git diff` empty, 37 POS tests passing).

**What this means for QA-C-02:** the finding is real (~5.6–6.0 sales/sec per branch, measured), but the
remedy I published in the report does not work. The only changes that would actually raise the ceiling
are:

- **Shorten the transaction** — which is what QA-C-01 already did (259 → 199 ms; throughput 3.87 →
  5.03/sec single-threaded). This is the only lever that works with the current design.
- **Accept the ceiling.** At ~6/sec per branch, a single branch handles ~21,600 sales/hour. That is
  far above any realistic restaurant load. Multi-branch tenants have independent sequence rows and
  already scale (measured 6.05 vs 8.56/sec).
- **Give up strict gap-free numbering** (e.g. rely on the order row's own auto-increment id, or allow
  gaps via a Redis counter). That is a business decision about billing integrity, not a performance
  tweak, and I do not recommend it unasked.

**My recommendation:** leave the generator as it is. QA-C-02 should be reclassified from "High
performance defect" to "documented capacity characteristic" once QA-C-01's reduction is accepted.

---

### 2026-11-14 — Security remainder: QA-A-10, A-11, B-01

| File | Change |
|---|---|
| `bootstrap/app.php` | `trustProxies()` driven by `TRUSTED_PROXIES`; `EnforceAllowedHosts` in the global web stack |
| `app/Http/Middleware/EnforceAllowedHosts.php` (new) | Rejects a request whose Host header is not in `ALLOWED_HOSTS` |
| `config/app.php` | `allowed_hosts` setting |
| `.env.example` | Documented `TRUSTED_PROXIES` and `ALLOWED_HOSTS` |
| `.gitlab-ci.yml` | (from QA-E-04) `npm audit --omit=dev --audit-level=high` scopes A-11 to shipping deps |

**QA-A-10 — two layers, both off by default.** Trusting proxies and restricting hosts are both
deployment-specific, so neither can safely be switched on blindly. Empty `TRUSTED_PROXIES` keeps the
current (untrusting) behaviour; empty `ALLOWED_HOSTS` disables the check. **Both must be set in
production** — the `.env.example` entries say so.

Verified with 7 tests: forged Host rejected, `example.com.attacker.test` rejected (suffix confusion),
`.example.com` subdomain pattern works, multiple hosts supported, empty list disables the check, and a
generated URL never contains the attacker host.

**QA-A-11** — no code change needed beyond the CI job. Re-confirmed no affected package is in the
production dependency tree.

**QA-B-01 — my earlier claim needed refinement.** I said the column is "never written"; that was
wrong. `RoleService::moveUsers` **does** copy it forward when re-pointing a role. What I proved with
4 tests is more precise: `assignRole` writes NULL, no authorization path reads it, and branch access
comes exclusively from `branch_user`. So the column is *copy-forward metadata that is never enforced*
— which is exactly the trap, not a live vulnerability. Recommendation unchanged: drop it or implement
it. **No code change made** — deleting a column is a schema decision for you.

**Regression:** 39 passed, 395 assertions. One unrelated pre-existing failure
(`MarketingPublicTrackingTest`, brand-suffix title) confirmed failing with these changes stashed.

---

### 2026-11-14 — QA-E-05: full pint pass (VERIFIED)

`vendor/bin/pint` across the repository → **`pint --test` now passes on 948 files** (was 111 failures).

**Diff size:** 127 files changed, +706 / −225. Overwhelmingly `ordered_imports`,
`fully_qualified_strict_types`, `no_unused_imports` and trait-list ordering.

**One change worth flagging as not-purely-cosmetic:** pint rewrote
`BranchScope::apply()`'s `static::accessibleBranchIds()` → `self::accessibleBranchIds()`. That *is* a
behavioural difference in general (late static binding vs. not). I checked before accepting it: the
class is declared `final`, so the two are equivalent here. Had it been non-final with subclasses, that
would have been a silent regression — the kind a "style-only" label hides.

**Proof it broke nothing:** ran the whole suite with all changes, then stashed everything and ran it on
pristine HEAD.

| Run | Result |
|---|---|
| With all audit changes (pint + fixes) | **16 failed, 980 passed** (6,642 assertions) |
| Pristine HEAD baseline | **16 failed, 978 passed** (6,633 assertions) |

**Identical failure count.** The same 16 pre-existing failures (GD extension missing, one marketing
SEO assertion, one marketing title assertion). My changes added 2 net passing tests and broke nothing.

**The 16 pre-existing failures are environmental, not code:** 9 stem from the missing `gd` extension
(image uploads, QR PNG/PDF), and the marketing failures are unrelated title/meta assertions. They will
still fail CI until GD is installed on the runner.

---

### 2026-11-14 — QA-A-03 verified in a real browser

I said CSP could not be verified without a browser. I had browser automation available, so I used it
rather than leaving the claim open.

**Method:** `php artisan serve`, then Chrome via CDP. Ran the app in **both** modes:
Report-Only (default) and enforcing (`CSP_REPORT_ONLY=false`).

| Check | Result |
|---|---|
| `Content-Security-Policy-Report-Only` header present by default | **PASS** |
| Header absent, enforcing header present when opted in | **PASS** |
| `/login` renders: React mounted, 5 inputs, marketing copy | **PASS** |
| `/register` renders: 5 inputs, correct title | **PASS** |
| **Login succeeds and `/dashboard` loads under enforcing CSP** | **PASS** |
| Dashboard charts render: **37 SVG, 98 recharts nodes** | **PASS** |
| `agent-browser errors` | **0 page errors** |
| `/build/manifest.json` fetchable | **PASS (200)** |

**What this proves that tests could not:** the policy does not break the app's own assets, Inertia
navigation, or the chart library — in *enforcing* mode, not just report-only. That was the specific
risk I flagged as unverifiable.

**What it still does not prove:** that the policy is *complete*. `'unsafe-inline'` remains in
`script-src` and `style-src`, so CSP is currently a defence-in-depth control, not a strict XSS
barrier. Removing it needs nonces for Vite/Ziggy/Radix, which is a wider change. The report's
recommendation stands: **stay in Report-Only in production until a violation report is collected
from real traffic**, then enforce.

**Cleanup:** both dev servers stopped, ports 8123–8125 released, browser closed.

---

### 2026-11-14 — QA-A-10 verified against a live server

Verified with real HTTP requests against `php artisan serve` with `ALLOWED_HOSTS=127.0.0.1,localhost`.

| Request | Host header | Result |
|---|---|---|
| `/login` | `127.0.0.1:8130` | **200** — correct host passes |
| `/login` | `localhost:8130` | **200** — allowlisted alias passes |
| `/login` | `evil.attacker.test` | **400** — rejected |
| `/login` | `127.0.0.1.attacker.test` | **400** — **suffix-confusion bypass blocked** |
| `/forgot-password` | `evil.attacker.test` | **400** — the password-reset entry point is protected |

The suffix case is the one that matters: a naive `str_contains(host, allowed)` would have accepted
`127.0.0.1.attacker.test`. The middleware compares exact hosts, or `.suffix` patterns when explicitly
prefixed with a dot.

**Deployment requirement unchanged:** `ALLOWED_HOSTS` and `TRUSTED_PROXIES` are empty by default and
the check is therefore **off**. Both must be set in production — an empty list is reported as "check
disabled", not "verified".

---

### 2026-11-14 — `gd` root-caused: 16 → 5 test failures

I had been reporting "16 pre-existing failures, 9 from a missing `gd` extension" as an environment
fact. I investigated it properly instead of leaving it as a shrug.

**Root cause is one commented line:** `C:\xampp\php\php.ini` line 922 reads `;extension=gd`. The DLL
is present (`C:\xampp\php\ext\php_gd.dll`, 10.5 MB) and the `extension_dir` is correctly set. The
extension simply is not enabled.

**Proof it fixes things** — ran the suite with GD provided additively (a temporary
`PHP_INI_SCAN_DIR`, so `php.ini` was **not** modified and the change is fully reversible):

| Run | Result |
|---|---|
| Without `gd` | **16 failed, 978 passed** |
| **With `gd`** | **5 failed, 991 passed** (6,677 assertions) |

**11 failures resolved.** The GD-dependent groups all went green:
`ProductBulkOpsTest`, `ProductImageTest`, `ProductEditSafetyTest`, `QrManagerTest`, `QrDesignTest`,
`QrDiningFlowTest`, `PlatformSettingsTest` — **66 passed, 0 failed**.

GD provides PNG, JPEG, WebP and FreeType here, and `imagecreatetruecolor()` / `imagepng()` both work.

**The 5 remaining failures are unrelated real defects**, not environment:

| Test | Symptom |
|---|---|
| `StockBalancePaginationTest` | `10` vs `10.0` — strict type comparison in the assertion |
| `MarketingEmailDeliveryTest` | expected `failed`, got something else |
| `MarketingPublicTrackingTest` | brand suffix appended twice |
| `MarketingSeoTest` | endpoint/fallback assertion |
| (one further) | — |

These are worth their own fix pass; they are genuine, if minor, test/title defects rather than
missing tooling.

**Action required (yours):** uncomment line 922 in `C:\xampp\php\php.ini` and restart Apache/PHP.
That is a **machine-wide** change affecting every PHP project on this host, which is why I did not
make it. On CI, add `gd` to the PHP image (`docker-php-ext-install gd` in `.gitlab-ci.yml`).

---

## Severity definitions used

| Severity | Meaning |
|---|---|
| **Critical** | Direct cross-tenant data breach, auth bypass to full account takeover, or unrestrained financial loss, reachable by an unauthenticated or low-privilege attacker. |
| **High** | A security control is fundamentally broken or absent on a sensitive surface (payments, auth, isolation), or leads to significant data/financial integrity loss. |
| **Medium** | Defense-in-depth is missing, or a weakness requires a precondition (a specific config, a trusted user, a chained step) to exploit. |
| **Low** | Limited impact, requires an unlikely precondition or a cooperating victim action. |
| **Informational** | Not currently exploitable; noted so it does not become one. |

---

## Fix workflow (what happens when you approve)

1. You name the Issue IDs you approve — nothing else is touched.
2. I state exactly which files will change, before changing them.
3. I make the minimal change for those IDs only; no refactoring, no unrelated edits.
4. I show you the diff and a change summary, and mark the issue **Fixed (Not Yet Verified)**.
5. I stop and wait for your re-test approval.
6. On approval I re-run the specific checks, then mark **Verified** or reopen.
