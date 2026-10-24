# Overview Dashboard Enhancement — Consolidated Report

Status: **complete (Phases 1–3)** · Reporting timezone **Asia/Dhaka** · Currency **BDT** (tenant `region.currency`)

This is the durable record for the Overview (business dashboard) enhancement. It
summarises the agreed scope, the KPI formulas, every file touched, the test
results, and the remaining risks.

---

## 1. Goal achieved

The tenant **Overview** (`GET /dashboard`) is now a **period-driven business
performance report** with a global period filter (**Today · Week · Month ·
Custom**) that consistently re-drives every date-dependent widget, plus a thin
always-on **"right now"** strip so today's operational state is visible the
moment the page opens. Onboarding mode is unchanged.

---

## 2. Decisions locked (from the planning session)

1. **Structure** — curated period-driven dashboard + always-on right-now strip; onboarding mode untouched.
2. **KPI cards** — default preset **Today**, each headline KPI shows value **+ delta vs the previous equivalent period**.
3. **Branch** — no new selector; implicit active-branch scoping. Branch comparison only for tenant-wide users.
4. **Money basis** — sales by order `placed_at`; collected/payment mix by payment `paid_at`.
5. **Access** — single `dashboard.view` gate (no new permissions).
6. **Week** — week-to-date, Monday 00:00 → now (Asia/Dhaka).

---

## 3. Final layout (top → bottom)

1. Header + **PeriodFilter** (Today · Week · Month · Custom) and Print / Export CSV.
2. **Primary KPIs** (deltas): Net Sales, Orders, Average Ticket, Payments Collected.
3. **Secondary KPIs** (deltas): Gross Sales, Discounts, Tax Collected, Refunds (voids).
4. **Sales performance** chart (current vs. previous-period overlay; hourly buckets for a single day, daily otherwise) + **Right now** card.
5. **Top products** · **Busiest hours** · **Payment mix** (collected by payment date).
6. **Orders by source / type / status**.
7. **Profitability** (Net Sales excl. tax, COGS, Gross Profit, Gross Margin, Operating Expenses, Net Operating).
8. **Customer segments** (lifetime) · **Top customers** (lifetime).
9. **Branch comparison** (tenant-wide only) · **Staff performance**.
10. Plan / subscription (in the Right now card).

**Period-scoped:** KPIs, trend, order analytics, top products, busiest hours, payment mix, profitability, branch comparison, staff.
**Period-independent:** right-now strip (active guests, pending orders, low stock, workspace counts), lifetime customer analytics, plan/subscription.

---

## 4. KPI definitions & formulas

Over **completed** orders in the period (branch-scoped) unless noted.

| Metric | Formula |
|---|---|
| Gross Sales | `Σ order.subtotal` |
| Discounts | `Σ order.discount_total` |
| Net Sales (excl. tax) | `Σ (order.total − order.tax_total)` |
| Tax Collected | `Σ order.tax_total` |
| Service Charge | `Σ order.service_charge` |
| Refunds (voids) | `Σ order.total` for `status = voided` (`voided_at`) |
| Orders | `count(completed orders)` |
| Average Ticket | `Net Sales ÷ Orders` (0 when no orders) |
| **Payments Collected** | `Σ payment.amount` where `status = succeeded` **and `paid_at` in period** |
| Payment Mix | above, grouped by payment method |
| COGS | `Σ order_item.unit_cost × quantity` |
| Gross Profit | `Net Sales − COGS`; Margin % = `Gross Profit ÷ Net Sales × 100` |
| Net Operating | `Gross Profit − Σ approved expenses` |
| Busiest Hours | completed orders per local hour |
| Active Guests | participants of dining sessions in {open, bill_requested, settling}, branch-scoped |
| Low Stock | `StockBalance.quantity <= inventory.low_stock_threshold` |
| Pending Orders | `count(orders.acceptance_status = pending)` |

**Correctness fixes bundled:** payment mix now uses `paid_at` + `succeeded` (was
`placed_at`); "Active guests" now derives from active dining sessions (was
`customers.is_active`).

---

## 5. Period filter behaviour

- Default on load: `today`.
- `today` → today 00:00 → now (prev: yesterday) · `week` → Mon 00:00 → now (prev: previous Mon–Sun) · `month` → 1st 00:00 → now (prev: previous month) · `custom` → explicit range (prev: equal-length window).
- Transport: `router.get(route('dashboard'), {preset}|{from,to}, {preserveState, replace, preserveScroll})`.
- Resolved server-side by `ReportPeriod` in the tenant/branch timezone; all custom ranges are UTC-converted for queries.

---

## 6. Files changed

### Backend
| File | Change |
|---|---|
| `app/Domain/Reporting/ReportPeriod.php` | Added `preset`, `forPreset()`, `previous()` (previous-period alignment) |
| `app/Domain/Reporting/ReportService.php` | Added `salesMetrics()`/`metricsFrom()` (shared source), `collectedTotal()`, `collected()`, `netTrend()`, `orders()`/`breakdown()`; refactored `sales()` to the shared metrics |
| `app/Domain/Reporting/DashboardOverviewService.php` | **New** — composes the period payload (KPIs + deltas, profit, trend overlay, top products, payment mix, busiest hours, order stats, branch/staff) |
| `app/Domain/Reporting/DashboardAnalyticsService.php` | Reworked — kept customer analytics + low stock + pending; added `activeGuestsCount()`; removed hard-coded 14-day code |
| `app/Http/Controllers/DashboardController.php` | Reads `preset`/`from`/`to`, builds the window, passes `period` + extended props + `hasTenantWideBranchAccess()` |

Route `GET /dashboard` unchanged.

### Frontend
| File | Change |
|---|---|
| `resources/js/Components/ui/PeriodFilter.tsx` | **New** — Today/Week/Month + Custom popover, i18n-aware |
| `resources/js/Pages/Dashboard.tsx` | Period filter, KPI cards with deltas, overlay chart, right-now strip, order analytics, profitability, branch/staff tables, print + CSV |
| `resources/js/i18n/translations.ts` | ~70 new `dash.*` keys in `en` + `bn` |

### Tests
| File | Coverage |
|---|---|
| `tests/Feature/Dashboard/OverviewDashboardTest.php` | **New** (11) — KPI bases, collected by `paid_at`, `succeeded` filter, active guests, order analytics, branch visibility, staff, profitability, trend overlay, dashboard period props |
| `tests/Feature/Reporting/ReportPeriodTest.php` | **New** (4) — previous-period alignment for today/week/month/custom |

### Docs
- `docs/ARCHITECTURE.md` — §11 "Tenant Overview dashboard & reporting periods".
- `docs/OVERVIEW_DASHBOARD.md` — this report.

---

## 7. Inertia props (analytics, when onboarding complete)

```
period: { preset, from, to, timezone }
analytics: {
  currency,
  kpis:              [{ label, value, format: money|number, delta: number|null }],   // translation keys
  kpis_secondary:    [{ label, value, format, delta }],
  profit:            [{ label, value, format: money|percent, delta: null }],
  trend:             [{ label, value, previous }],
  top_products:      [{ label, value }],
  payment_mix:       [{ label, value }],
  busiest_hours:     [{ label, value }],       // order counts
  order_stats:       { total, completed, voided, by_source, by_type, by_fulfillment },
  branches:          [{ branch, orders, gross, net }] | null,   // tenant-wide only
  staff:             [{ cashier, orders, sales, voids }],
}
customerAnalytics: { total, spend, repeat, segments, top }   // lifetime
business360:       { branches, users, products, customers, active_customers, active_guests, low_stock, pending_approvals }
```

KPI `label`s are i18n keys (`dash.kpi.*`), resolved in the frontend with `useT()`.

---

## 8. Verification

| Check | Result |
|---|---|
| Full PHP suite (`php artisan test`) | **587 passed (3315 assertions)** |
| TypeScript (`npx tsc --noEmit`) | clean |
| PHP syntax (`php -l`) on changed files | clean |
| New tests | 15 (11 dashboard + 4 period) |

No browser/E2E pass was run; no deployment performed.

**Issues caught by tests during the build** (both fixed):
- `ReportPeriod::previous()` off-by-one — custom comparison window was one day too long (used the raw `23:59:59` diff); now measures whole days.
- Status filtering on loaded orders must compare the **enum** (`$o->status === OrderStatus::Completed`); a collection `where('status', 'completed')` does not match a backed enum.

---

## 9. Known limitations & remaining risks

- **CSV** exports the KPI summary only (not the order/branch/staff tables).
- **No caching** of period metrics; large custom ranges recompute each load.
- **No dedicated dashboard print stylesheet** (uses the browser print dialog).
- `ReportService` loads collections into memory — fine at current scale; revisit with aggregate queries / indexes if periods grow very large.
- **Profitability** depends on `order_items.unit_cost` snapshots; orders without a cost will understate COGS.
- Optional indexes not added: `orders(branch_id, status, placed_at)`, `payments(tenant_id, status, paid_at)`.

---

## 10. Deferred / open

- Refunds basis is **voided orders** (no dedicated refund table exists); revisit if payment-level refunds (`status = refunded`) should count.
- Collected filter is `succeeded` only; `pending` intentionally excluded.
- Optional: period-over-period deltas for the secondary KPIs and profitability; caching; richer exports.

---

## 11. How to run the dashboard locally

```
php artisan serve
npm run dev        # or: npm run build
```
Sign in as a tenant owner with a completed onboarding, open **Overview**, and use
the period filter. To verify the suite:

```
php artisan test tests/Feature/Dashboard tests/Feature/Reporting
npx tsc --noEmit
```
