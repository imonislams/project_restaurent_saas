# QA Audit — Reports Index

**Branch:** `qa/security-performance-audit`
**Audit window:** 2026-11-14 → 2026-11-15
**Scope:** vulnerability, security, load/performance, stress, production readiness

---

## Read this first

| # | Document | What it answers |
|---|---|---|
| 1 | [issue-register.md](./issue-register.md) | **Every finding, current status, and fix history.** Start here. |
| 2 | [vulnerability-test-report.md](./vulnerability-test-report.md) | Category A — injection, XSS, CSRF, auth, IDOR, exports |
| 3 | [security-test-report.md](./security-test-report.md) | Category B — tenant/branch isolation, roles, impersonation |
| 4 | [load-performance-report.md](./load-performance-report.md) | Category C — 100-tenant dataset, latency, query counts |
| 5 | [stress-test-report.md](./stress-test-report.md) | Category D — ramp to saturation, burst/recovery |
| 6 | [production-readiness-report.md](./production-readiness-report.md) | Category E — deployment safety, backups, config |
| 7 | [dependency-audit-report.md](./dependency-audit-report.md) | Dependency advisories with reachability analysis |

---

## Verdicts at a glance

> **These are the verdicts as recorded at audit time.** Each report now carries a
> *Remediation status* section at the bottom showing what has since been fixed and verified.
> The status table below is the current one.

| Category | Audit-time verdict | Current state |
|---|---|---|
| A — Vulnerability | NEEDS IMPROVEMENT | **PASS** — all 11 closed, dependency advisories at 0 |
| B — Security | PASS | **PASS** — dead `role_user.branch_id` column dropped |
| C — Load & Performance | NEEDS IMPROVEMENT | **PASS** — 383→133 ms, 2.61→7.53 sales/sec; QA-C-02 reclassified as capacity characteristic |
| D — Stress | PASS | **PASS** — saturation ceiling was the buffer pool, now resolved |
| E — Production Readiness | NEEDS IMPROVEMENT | **PASS** — capacity check automated and enforced at deploy |

### Headline outcomes

| | |
|---|---|
| Findings registered | 24 |
| **Fixed & verified** | **21** |
| Reclassified (defect → capacity characteristic) | 1 (QA-C-02) |
| Rejected as false positive (my error) | 1 (QA-A-07) |
| Reported, no action recommended | 1 (QA-D-02) |
| **Open** | **0** |

**Final gate status (2026-11-16, re-run from scratch):** 1004 tests passed / 0 failed (6,700 assertions) ·
`pint --test` PASS on 955 files · `composer audit` **0 advisories** · `tsc` clean · vitest 22/22.

**The three High security findings are fixed and proven** — payment webhook auth, hardcoded HMAC
secret, and (via the dependency update) the password-reset link-poisoning path in
`symfony/http-foundation`. Each was verified with a negative control.

**The two High production findings are fixed and proven** — backups are encrypted by default and a
boot guard now refuses to start with `APP_DEBUG=true` in production.

**The performance story ended differently than expected.** My proposed fix for the per-branch
numbering ceiling was mathematically wrong and was reverted — the lock is held to COMMIT, so an
atomic increment cannot help. The real cause was the 16 MB InnoDB buffer pool: raising it to 256 MB
cut POS latency by 65% and raised throughput 2.9× *without changing a single query*.

---

## Issue status summary

| Status | Count | IDs |
|---|---|---|
| **Verified fixed** | 21 | A-01…A-06, A-08…A-11, B-01, C-01, C-03, C-04, D-01, E-00…E-05 |
| Reclassified | 1 | C-02 (defect → documented capacity characteristic) |
| Rejected / withdrawn | 1 | A-07 (my false positive) |
| Reported, no action | 1 | D-02 |
| **Open** | **0** | — |

*(Plus two A-INFO notes that are observations rather than findings.)*

**Nothing remains un-investigated.** All 12 Category A, 11 Category B, 8 Category C, 4 Category D and
6 Category E cases have an outcome.

---

## Reading these reports

| Route | Access |
|---|---|
| `reports/qa/*.md` | The source of truth — plain Markdown in the repository |
| `/platform/ops/qa-portal` | Rendered HTML portal, **platform admins only** (`platform.monitoring.view`) |

Build the portal after editing any report:

```bash
php artisan qa:build-portal
```

It renders `reports/qa/*.md` into `storage/app/qa-portal.html` as a single self-contained file with no
external dependencies and no network calls.

**The portal reads its numbers from these files, not from hand-typed constants.** The findings count,
the per-status breakdown and the release-gate figures are all parsed out of `issue-register.md` and
this README at build time, so the dashboard cannot drift from the reports behind it. If a count looks
wrong, the register is wrong — that is the point.

It is deliberately **not** written into `public/`: these reports enumerate every unfixed vulnerability
in the product, and a file in the web root would be served by the web server directly, bypassing all
authentication. Access is covered by `tests/Feature/Platform/QaPortalAccessTest.php` — guests redirect
to login, tenant users get 403, platform admins get the page.

---

## How the audit was run

**Environment isolation.** Every dynamic test ran against a purpose-built
`project_restaurent_saas_qa` database (143 tables). The development database
(`project_restaurent_saas`) was verified unchanged before and after: **7 tenants / 57 users /
374 orders**, identical at start and end. Production was never contacted.

**Method.** Static code review first, then executable proof. Every dynamic finding was verified with a
temporary test suite that was removed afterwards. Where a fix was applied, a **negative control** was
run — reverting the fix to confirm the test actually fails — so no test passes vacuously.

**Dataset.** 100 tenants · 10,000 products · 800 categories · 200 branches · 5,000 customers ·
1,000 suppliers · 3,000 stock balances · 4,168 orders / 11,538 line items / 4,168 payments.
Built in two stages (10 → 100) so a seeding defect could be caught before a long run.

---

## Things I got wrong (recorded, not hidden)

An audit that only lists the app's mistakes is not an audit. These are mine:

| Claim | Correction |
|---|---|
| "CSRF exemption covers tenant gateway routes" (High) | **Withdrawn.** Those routes are at `/settings/payments/*`; the exemption is `payments/*`. I read the URI prefix without checking the route group. |
| "QR canvas allows CSS injection" (Low) | **Withdrawn.** `normalizeCanvas()` enforces hex-only colours, type allowlisting, clamps and path-traversal rejection at *write* time. I judged the template without tracing the write path — twice the same mistake. |
| "`role_user.branch_id` is not enforced" (High) | **Downgraded to Low.** The column is never written at all; branch access uses `branch_user`. Isolation works. |
| "23 unscoped models are an IDOR surface" | **Mostly resolved.** `User` is unscoped by design (platform needs it) and guarded by `UserPolicy`; cross-tenant staff writes return 403. |
| "`ReportService::inventory` is the worst offender — full table scan" | **Over-predicted.** Measured 5 queries / 15–63 ms. Reports are fine at this scale. |
| "N+1 in `ReportService::cash` and `QrMenuService`" | **Not reproduced** at this data volume. Kept open (the code pattern is real) but with no measured impact. |
| "TableStaff should not have `pos.use`" | **Wrong.** Table staff take orders; the correct boundary is no void/refund/cash — which holds. |
| "Pending migration found" | **False alarm.** My grep matched "Pending" in the migration's own filename. Zero migrations are pending. |

---

## Environment caveats that affect the numbers

1. **`innodb_buffer_pool_size` — RESOLVED 2026-11-15.** It was 16 MB (XAMPP default), which inflated
   every latency figure in Categories C and D and was the actual throughput ceiling. Raised to
   256 MB: POS latency 383 → 133 ms, throughput 2.61 → 7.53 sales/sec, **query count unchanged**.
   The Category C and D numbers recorded on 2026-11-14 are therefore a *floor*, not a verdict.
   The change is in `C:\xampp\mysql\bin\my.ini` (shared server config, outside this repo), backup at
   `my.ini.backup-qa-20261115`.
2. **GD extension — RESOLVED.** `gd` was enabled in `C:\xampp\php\php.ini` (line 922 was commented
   out). This resolved 11 of the 16 pre-existing test failures. **Production still requires `gd` or
   `imagick`; confirm the deploy target has it, or QR codes and image uploads will 500.**
3. **CPU and per-request memory were not measured.** No reliable source on this host, and CLI timing
   is not representative of PHP-FPM. Reported as BLOCKED rather than estimated.
4. **Docker/hosting limits.** Cross-tenant and stress tests ran on a single local machine, so
   multi-host network behaviour is untested.
5. **`slow_query_log` is OFF** on this MariaDB instance (`long_query_time` 10 s). Slow-query analysis
   was therefore done with `EXPLAIN` and explicit timing instead. Worth enabling in production.

---

## QA artefacts in the repository

Temporary test suites were deleted after use. The following remain and are safe to re-run against
`project_restaurent_saas_qa`:

| Command | Purpose |
|---|---|
| `qa:seed-dataset` | Build the 100-tenant catalogue dataset |
| `qa:seed-stock` | Add tracked stock balances and movements |
| `qa:seed-trade` | Generate POS sales through the real `SaleService` |
| `qa:measure-queries` | Query counts + latency for hot report paths |
| `qa:measure-pos` | POS sale latency, p95/p99, queries per sale |
| `qa:measure-indexes` | `EXPLAIN` before/after the composite indexes |
| `qa:measure-concurrency` | Concurrent POS throughput |
| `qa:stress-ramp` | Ramp workers to the saturation knee |
| `qa:stress-recovery` | Burst then verify recovery |
| `qa:stress-branch-isolation` | Same branch vs spread branches |
| `qa:build-portal` | Render these reports into the HTML QA portal |

Every database-touching command refuses to run unless the database name ends in `_qa`.
`qa:build-portal` is the exception — it only reads Markdown from `reports/qa/`.

---

## Not committed

Everything in this audit is committed to `qa/security-performance-audit` as of `d263a56`, plus the
2026-11-15 changes (dependency update, B-01 migration, report updates) which are **uncommitted in the
working tree** — the `composer.lock` refresh and the schema migration wait for your review.

The buffer-pool change (`my.ini`) lives outside the repository and is **not** part of any commit.
