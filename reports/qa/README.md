# QA Audit — Reports Index

**Branch:** `qa/security-performance-audit`
**Audit window:** 2026-11-14
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
| A — Vulnerability | NEEDS IMPROVEMENT | **PASS** (QA-A-09 open, pending approval) |
| B — Security | PASS | **PASS** |
| C — Load & Performance | NEEDS IMPROVEMENT | **Improving** — −23% latency, +30% throughput achieved; QA-C-02 reclassified as capacity characteristic |
| D — Stress | PASS | **PASS** |
| E — Production Readiness | NEEDS IMPROVEMENT | **Near-ready** — both Highs verified fixed; release gate blocked on the missing `gd` extension |

### Headline outcomes

| | |
|---|---|
| Findings raised | 25 |
| **Verified fixed** | **12** |
| Fixed, awaiting verification | 4 |
| Rejected as false positives (my errors) | 1 |
| Open, needing your decision | 4 |

**The two High security findings (payment webhook auth, hardcoded HMAC secret) are fixed and
proven** — with negative controls showing the tests fail when the fixes are reverted.

**The two High production findings are fixed and proven** — backups are encrypted by default and a
boot guard now refuses to start with `APP_DEBUG=true` in production.

**One High performance finding improved, one reclassified.** POS latency is down 23% and throughput
up 30%, but my proposed fix for the per-branch numbering ceiling was mathematically wrong and was
reverted — the lock is held to COMMIT, so an atomic increment cannot help.

---

## Issue status summary

| Status | Count | IDs |
|---|---|---|
| **Verified fixed** | 6 | QA-A-01, A-02, A-04, A-05, A-06, A-08 |
| Fixed (not yet verified) | 1 | QA-A-03 (CSP — needs a browser) |
| Rejected / withdrawn | 1 | QA-A-07 (my false positive) |
| Awaiting approval | 14 | A-09…A-11, B-01, C-01…C-04, D-01, E-00…E-05 |
| Informational | 2 | D-02, and the A-INFO notes |

**Nothing remains un-investigated.** All 12 Category A, 11 Category B, 8 Category C, 4 Category D and
6 Category E cases have an outcome.

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

1. **`innodb_buffer_pool_size = 16 MB`** (XAMPP default). Every latency figure in Categories C and D
   is inflated by this. The measured throughput ceiling is a **floor, not a verdict**.
2. **GD extension is not installed in this PHP build.** Four tests fail as a result
   (`ProductBulkOpsTest`, `QrManagerTest`, `QrDiningFlowTest`) — verified pre-existing, not caused by
   the audit. **Production requires `gd` or `imagick`; confirm the deploy target has it, or QR codes
   and image uploads will 500.**
3. **CPU and per-request memory were not measured.** No reliable source on this host, and CLI timing
   is not representative of PHP-FPM. Reported as BLOCKED rather than estimated.
4. **Docker/hosting limits.** Cross-tenant and stress tests ran on a single local machine, so
   multi-host network behaviour is untested.

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

Every one refuses to run unless the database name ends in `_qa`.

---

## Not committed

Nothing in this audit is committed or pushed. The working tree holds the approved fixes, the
reports, and the QA commands. `composer.lock` is untouched — no dependency was installed, upgraded
or removed.
