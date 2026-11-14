# Category C — Load & Performance Test Report

**Testing category:** C — Load & Performance Testing
**Execution date:** 2026-11-14
**Environment:** Isolated `project_restaurent_saas_qa` on MariaDB 10.11.16, PHP 8.5.12, 512 MB memory limit
**Data isolation:** the development database (`project_restaurent_saas`) was not written to. Verified before and after: 7 tenants / 57 users / 374 orders unchanged.
**Method:** real code paths driven by purpose-built artisan commands; `EXPLAIN` on hot query shapes; multi-process contention tests.
**Overall result:** **NEEDS IMPROVEMENT** — POS write path is the bottleneck; four composite indexes are confirmed missing on MySQL.

---

## Executive Summary

I built the requested dataset and measured the real system rather than estimating.

**Dataset achieved:** 100 tenants · 10,000 products · 800 categories · 200 branches · 200 users · 5,000 customers · 1,000 suppliers · 3,000 stock balances · 3,670 orders with 11,010 line items and 3,670 payments.

**Headline measurements:**

| Path | Result |
|---|---|
| POS sale (single-threaded) | **258.7 ms avg**, p95 372 ms, p99 436 ms, **65 queries/sale** |
| POS sale (4 concurrent workers) | 7.54 sales/sec aggregate |
| POS sale (8 concurrent workers) | **7.46 sales/sec — no gain from doubling** |
| Reports (sales / products / cash / staff) | 2–3 queries, 18–136 ms |
| Inventory report | 5 queries, 15–63 ms |

**The single most important finding:** POS throughput **plateaus at ~7.5 sales/sec** and does not improve from 4 to 8 concurrent workers. Combined with 65 queries per sale and a `lockForUpdate` on one `order_sequences` row per branch, this is the application's write ceiling for a single branch. That is a genuine capacity limit, not a measurement artifact — I confirmed it by doubling concurrency and getting *less* throughput.

**Two things I could not measure, stated plainly:**
- **CPU utilisation** — no reliable per-process source on this Windows host. Not estimated.
- **Memory per request** — PHP CLI peak memory is not representative of PHP-FPM request memory. Not estimated.

---

## Test Statistics

| Metric | Count |
|---|---|
| Test cases planned (Category C) | 8 |
| Completed | 6 |
| Blocked | 2 (memory/CPU profiling — no tooling) |
| Datasets built | 2 (staged 10 → 100 tenants) |
| Transactions generated | 3,670 orders / 11,010 items / 3,670 payments |
| Integrity checks passed | 10 / 10 |

| ID | Case | Result |
|---|---|---|
| C-01 | Dataset construction | **PASS** — 100 tenants × 100 products, zero integrity defects |
| C-02 | Report query cost | **PASS** — lower than expected |
| C-03 | POS write path | **FAIL** — QA-C-01 |
| C-04 | Concurrent POS throughput | **FAIL** — QA-C-02 |
| C-05 | Index coverage (`EXPLAIN`) | **WARN** — QA-C-03 |
| C-06 | N+1 in reports | **PASS** — not reproduced |
| C-07 | Memory consumption | **BLOCKED** |
| C-08 | CPU utilisation | **BLOCKED** |

---

## Dataset integrity

Before measuring, I verified the data is not corrupt — a load test on bad data is worthless.

| Check | Expected | Result |
|---|---|---|
| tenants | 100 | **100** |
| products | 10,000 | **10,000** |
| products per tenant (min/max) | 100 / 100 | **100 / 100** |
| products with NULL `tenant_id` | 0 | **0** |
| products with orphan category | 0 | **0** |
| **cross-tenant category links** | 0 | **0** |
| branches per tenant | 2 | **2 / 2** |
| tenants without subscription | 0 | **0** |
| cross-tenant `branch_user` rows | 0 | **0** |

**Staged as agreed:** I built 10 tenants first, verified, then scaled to 100. The verify-then-scale decision paid for itself — see "Seeding defects found" below.

---

## Performance Metrics (measured)

### POS sale — sequential, 30 sales

| Metric | Value |
|---|---|
| avg latency | **258.7 ms** |
| median | 249.3 ms |
| p95 | 372.1 ms |
| p99 | 436.2 ms |
| min / max | 155.3 / 436.2 ms |
| **avg queries per sale** | **65.0** |
| max queries per sale | 66 |
| throughput | **3.87 sales/sec** |

### POS sale — concurrent

| Workers | Sales | Wall clock | Aggregate sales/sec | Failures |
|---|---|---|---|---|
| 4 | 32 | 4.24 s | **7.54** | 0 |
| 8 | 64 | 8.58 s | **7.46** | 0 |

**Throughput did not increase from 4 → 8 workers.** That is the definition of saturation.

### Report paths (3 tenants sampled)

| Report | Queries | Latency |
|---|---|---|
| sales | 2 | 64–98 ms |
| products | 2 | 124–136 ms |
| cash | 3 | 16–27 ms |
| inventory | 5 | 15–63 ms |
| staff | 3 | 26–38 ms |

**This contradicts my own pre-audit prediction.** I flagged `ReportService::inventory` as "the worst offender — full `stock_balances` scan". With 3,000 balances it costs **5 queries and 15–63 ms**. The eager-loaded `with(['stockable','branch','stockLocation'])` keeps query count bounded, and PHP aggregation over 3,000 rows is cheap. I over-predicted. The finding below is reframed accordingly.

---

## Detailed Findings

### QA-C-01 — POS sale performs 65 queries and all stock work inside one transaction

| Field | Value |
|---|---|
| **Severity** | **High** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `app/Domain/POS/SaleService.php` |
| **Affected endpoint** | `POST /pos/orders` |
| **Evidence** | 65 queries/sale (max 66), 258.7 ms avg, p99 436 ms |

**Reproduction:** `php artisan qa:measure-pos --sales=30` with the QA dataset. Full metrics in the table above.

**Expected:** A 2-line counter sale should be a compact write path — order, round, 2 items, 1 payment, stock movements. Double-digit queries.

**Actual:** **65 queries for a two-item sale.** Each ingredient in a recipe triggers its own nested transaction with `lockForUpdate` (`StockService::record`), and each stock movement commits separately inside the outer sale transaction.

**Business impact:** At 258 ms per sale, a busy counter feels sluggish — a cashier waits ~0.26 s per transaction before the next customer. p99 of 436 ms is noticeable. Because all 65 queries sit inside one transaction holding row locks, a slow sale also blocks others (see QA-C-02).

**Recommended solution:** Batch stock movements into a single transaction and a single `insert` per sale rather than one nested transaction per ingredient; pre-load payment methods and product prices in one query; defer non-critical writes (audit, notifications) to after commit. I would expect this to drop to ~15–20 queries and under 100 ms. **Not implemented — awaiting approval.**

---

### QA-C-02 — Per-branch order numbering serialises sales at ~7.5/sec

| Field | Value |
|---|---|
| **Severity** | **High** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | `app/Domain/POS/OrderNumberGenerator.php`, `OrderSequence` |
| **Affected endpoint** | `POST /pos/orders` |
| **Evidence** | 4 workers → 7.54/sec; 8 workers → 7.46/sec |

**Reproduction:** `php artisan qa:measure-concurrency --workers=4 --sales=8` then `--workers=8`.

**Expected:** Aggregate throughput should scale roughly linearly with workers until a real resource limit is reached.

**Actual:** Doubling workers 4 → 8 produced **less** aggregate throughput (7.54 → 7.46). Every sale in a branch must take `lockForUpdate` on the same `order_sequences` row (`OrderNumberGenerator.php:15-20`) and hold it for the whole sale transaction. All concurrent sales in a branch therefore queue behind each other.

**Why this matters more than the raw number:** 7.5 sales/sec per branch is fine for one till, and **a multi-branch restaurant is unaffected** because each branch has its own sequence row. The risk is a single high-volume branch (large QSR, food court, event) where several tills share one branch — they will contend.

**Correct attribution:** the lock is *not* a bug. Gap-free numbering genuinely requires serialisation. The cost is that the lock is held for the **entire 65-query sale transaction**, not just the counter increment. Shortening the transaction (QA-C-01) directly raises this ceiling.

**Recommended solution:** Either (a) shorten the transaction per QA-C-01, or (b) replace the row lock with an atomic `UPDATE ... SET last_number = last_number + 1` plus a retry, which holds the lock for one statement. Option (b) preserves gap-free numbering for the committed case. **Not implemented — awaiting approval.**

---

### QA-C-03 — Four composite indexes are missing on MySQL (confirmed with EXPLAIN)

| Field | Value |
|---|---|
| **Severity** | **Medium** |
| **Status** | Reported — Awaiting Approval |
| **Affected module** | migrations (`orders`, `payments`, `stock_movements`, `stock_balances`) |
| **Evidence** | `EXPLAIN`: `ref|filter` before, single-index `ref` after |

**Reproduction:** `php artisan qa:measure-indexes` (before) and `--apply` (after).

| Query | Before | After |
|---|---|---|
| payments collected | `payments_tenant_id_order_id_index` | **`qa_payments_tenant_status_paid`** ✓ |
| stock_balances | `ref|filter` (2 indexes, 1% filtered) | **single `ref`** ✓ |
| orders list | `orders_tenant_id_placed_at_index` | unchanged (optimizer preferred the old index) |
| stock_movements | `ref|filter` — still filtering | unchanged |

**Honest interpretation:** the indexes were genuinely absent (my static finding was correct), and on `payments`/`stock_balances` they demonstrably improved the plan. But at **205 orders per tenant** MySQL sees no benefit for `orders`/`stock_movements` and ignores them. This will change with volume — the current dataset is too small to prove the win on those two.

**Business impact today:** low. **At production volume:** the reports that scan `stock_movements` (one row per ingredient per sale — the fastest-growing table) will degrade. This is a "fix before it hurts" item.

**Recommended solution:** add `orders(tenant_id, branch_id, placed_at)`, `payments(tenant_id, status, paid_at)`, `stock_movements(tenant_id, branch_id, created_at)`, `stock_balances(tenant_id, branch_id)` as real migrations, then re-measure at 10× volume.

**Note:** I created these indexes on the **QA database only** to measure the delta. They are not migrations and do not exist in your application.

---

### QA-C-04 — Report endpoints are cheaper than predicted (downgraded)

| Field | Value |
|---|---|
| **Severity** | **Informational** |
| **Status** | Reported — corrected |
| **Affected module** | `app/Domain/Reporting/ReportService.php` |

My pre-audit claim that `ReportService::inventory` "scans the whole `stock_balances` table" and was the "worst offender" **did not hold up**: 5 queries, 15–63 ms over 3,000 balances.

The underlying observation is still true — `inventory()` applies no branch or period filter (`ReportService.php:391`) — so it will grow linearly with total stock rows across all tenants. At 3,000 rows it is invisible; at 300,000 it will not be.

**Recommended solution:** add the branch filter and paginate. Low priority.

---

## N+1 verification — not reproduced

I predicted N+1 in `QrMenuService` (missing `availability` eager load) and `ReportService::cash` (`currentExpectedCash()` per shift). Measured query counts:

- `report:cash` → **3 queries** regardless of tenant. The N+1 requires shifts with `expected_cash IS NULL`; in the dataset all 100 shifts have it null, yet the count stayed at 3 — because the period window contained one shift per tenant, not many.
- `report:products` → **2 queries** over 1,000 order items.

**Conclusion:** I could not reproduce either N+1 at this data volume. I am **not** withdrawing them — the code pattern is real (`$product->isAvailableIn()` reads a non-eager-loaded relation) — but I have no measurement proving impact. They belong in Category D or a larger dataset, not asserted here as confirmed.

---

## Seeding defects found (and fixed)

Worth recording, because they show the staged approach working:

1. **`StockService::record()` requires a `StockMovementReason` enum, not a string.** My first stock seeder passed `'opening'` and threw a `TypeError` that my own `catch` block swallowed — producing 3,000 "tracked" products with **zero** stock rows. Caught by integrity verification, not by the command's output.
2. **Every product was seeded with `inventory_mode: none`**, so sales never deduct stock and the inventory report short-circuits. Fixed by `qa:seed-stock`.
3. **Stock seeding was 3× too slow** when run before the fix (TypeError per product).

**Lesson:** a seeder reporting "0 rows written" must be treated as a failure, not a warning. My initial silent `catch` hid a real bug for one full measurement round.

---

## Blocked measurements

| Metric | Why blocked |
|---|---|
| CPU utilisation | No per-process CPU source on this host; PHP CLI timing is single-threaded |
| Memory per request | CLI peak memory ≠ FPM worker memory |
| DB connection utilisation | Single-process measurement; pool behaviour needs a real web server under load |
| Slow-query log analysis | Would require enabling the global slow log on the MariaDB instance — a shared-instance change I did not make |

These categories need the ApacheBench run against a served instance. I did not run `ab` because the app is not served from the QA database and doing so would need an `.env.qa` + vhost — a change I'll make only with your approval.

---

## Recommendations (ordered by impact)

1. **QA-C-01** — collapse the 65-query sale into a bounded write path. Highest leverage: improves latency *and* the concurrency ceiling at once.
2. **QA-C-02** — after C-01, re-measure. If the plateau persists, move the sequence increment to a single atomic statement.
3. **QA-C-03** — add the four indexes as migrations, then re-measure at 10× volume. My current numbers are too small to prove the `orders`/`stock_movements` win.
4. **QA-C-04** — add the branch filter to `inventory()` before data grows.
5. Re-run Category C after C-01 with 10× order volume (30,000+) so the index and N+1 effects become measurable.

---

## Final Verdict

**NEEDS IMPROVEMENT**

The application is correct but the POS write path is expensive: **65 queries per two-item sale, 259 ms average, and a hard ~7.5 sales/sec ceiling per branch** that does not improve with more concurrency. Two High findings, both in the same subsystem, both addressable without changing business behaviour.

Reports — which I had predicted would be the problem — are fine at this scale. The prediction I got wrong is recorded above rather than quietly dropped.

Dataset, harnesses and measurements are reproducible; all were confined to `project_restaurent_saas_qa`.

---

## Remediation status (added 2026-11-14, after the audit)

The measurements above are the **before** state. This section records what changed and what was
re-measured afterwards, on the same QA dataset.

### Before / after (20 sequential sales, same QA database)

| Metric | Before | After | Change |
|---|---|---|---|
| avg latency | 258.7 ms | **198.8 ms** | **−23%** |
| median | 249.3 ms | 190.8 ms | −23% |
| p95 | 372.1 ms | 248.9 ms | **−33%** |
| p99 | 436.2 ms | 327.5 ms | −25% |
| queries / sale | 65.0 | **59.1** | −9% |
| throughput | 3.87/sec | **5.03/sec** | **+30%** |

**What was changed**

- `SaleService::resolveLines()` — products loaded in one `whereIn` with eager `availability`
  (was one query per line, plus a lazy load per line for availability).
- `SaleService::deductStock()` — reuses the calculated lines instead of re-reading `order_items` and
  re-querying each `product`.
- `ReportService::inventory()` — now honours `$period->branchId` (QA-C-04).
- New migration adding four tenant-first composite indexes (QA-C-03).

**Honest assessment of the result:** −23% latency is real but **I predicted 15–20 queries and got 59**.
My estimate was wrong. The remainder is per-row work that is genuinely required (one stock movement,
one balance update and one audit row per line), plus the deliberate `lockForUpdate` calls. Going lower
means changing behaviour — batching writes or deferring audit/kitchen to after commit — which I did not
do unasked.

### QA-C-02 — my proposed fix was wrong and was reverted

I recommended collapsing the sequence increment into a single atomic statement. I implemented it and it
**failed 40 tests**, for two reasons:

1. The SQL was MySQL-only; the suite runs on SQLite.
2. More importantly, the premise was false. I measured lock scope directly:

| Scenario | Second transaction blocked? | Wait |
|---|---|---|
| increment issued, transaction still open | **YES** | 2.01 s (timeout) |
| increment issued, transaction committed | no | 0.00 s |

**InnoDB holds row locks until COMMIT.** An atomic increment cannot shorten the contended window,
because the window is the entire sale transaction. The change was reverted and `OrderNumberGenerator`
is byte-identical to its original.

**Revised position:** QA-C-02 is not a defect to fix — it is a documented capacity characteristic
(~6 sales/sec per branch, ~21,600/hour, far above realistic restaurant load, and multi-branch tenants
scale independently at 8.56/sec measured). The only lever that works is shortening the transaction,
which is exactly what QA-C-01 already did.

### Index note

The migration's indexes exist and are reversible. At the current dataset size (717 orders) MySQL still
prefers the older single-column indexes for `orders` and `stock_movements`; `payments_tenant_status_paid_index`
**is** used. Re-measure at 10× volume before concluding either way.
