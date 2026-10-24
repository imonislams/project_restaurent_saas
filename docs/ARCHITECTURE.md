# Architecture

**Related docs:** [PRD.md](./PRD.md) · [DATABASE.md](./DATABASE.md) · [SECURITY.md](./SECURITY.md) · [ROADMAP.md](./ROADMAP.md)

---

## 1. Architectural goal

A **maintainable modular monolith** — not premature microservices. One deployable
application with clear internal module boundaries so features stay isolated and testable.

For a Laravel-first desktop-like application, **Laravel + Inertia.js + React + TypeScript**
is the strong starting point: a cohesive application without a separate frontend/backend
deployment from day one.

> If the repository already uses Vue, Livewire or Blade, inspect the existing
> implementation before choosing to migrate. **A working system should not be rewritten
> merely to match a preferred stack.**

---

## 2. Recommended technology stack

| Layer | Recommendation |
|-------|----------------|
| Backend | Laravel, PHP, REST API or Laravel web controllers |
| Database | MySQL or PostgreSQL — choose one based on deployment and team expertise |
| Frontend | React + TypeScript + Inertia.js |
| Styling | Tailwind CSS with a consistent component system |
| Tables & forms | Reusable data tables, validation, filters, form components |
| Queue | Redis-backed Laravel queues for production workloads |
| Scheduler | Laravel Scheduler with a reliable server cron entry |
| Cache | Redis or a suitable cache driver |
| Authentication | Laravel auth with secure sessions, or an API auth strategy |
| Authorization | Laravel Policies/Gates, plus a permission package if needed |
| Testing | Pest or PHPUnit — feature tests + browser E2E tests |
| Monitoring | Centralized error tracking, application logs, queue metrics |
| File storage | Private storage for sensitive documents; public only for intentionally public assets |
| Deployment | Automated tests, controlled migrations, health checks, rollback strategy |

---

## 3. Module boundaries

| Layer | Contents |
|-------|----------|
| **Presentation** | POS terminal · Tenant dashboard · SaaS admin · KDS |
| **Application** | Controllers · Form Requests · Policies · Application services |
| **Domain modules** | Tenant · POS · Menu · Inventory · Purchasing · Cash · Reports · Billing |
| **Database** | Transactions, constraints, indexes, audit records |
| **Operations** | Queues, scheduler, cache, storage, monitoring |

**Rule:** keep business logic out of giant controllers. Use dedicated
application/domain services for critical workflows such as **completing a sale**,
**receiving a purchase**, **issuing a refund** and **closing a cashier shift**.

---

## 4. Suggested Laravel module structure

```
app/
├── Domain/
│   ├── Tenancy/          # tenants, tenant context, isolation
│   ├── Identity/         # users, roles, permissions, invitations, sessions
│   ├── Branches/         # branches, hours, registers, branch access
│   ├── Menu/             # categories, products, variants, modifiers, availability
│   ├── POS/              # terminal workflows, carts, shortcuts
│   ├── Orders/           # orders, order items, status history, tables, KDS
│   ├── Payments/         # payments, attempts, refunds, webhooks, idempotency
│   ├── Inventory/        # stock ledger, balances, counts, transfers, waste
│   ├── Purchasing/       # suppliers, POs, receipts, supplier payments
│   ├── Waste/            # waste records, approvals, cost
│   ├── CashManagement/   # shifts, cash movements, closures, reconciliation
│   ├── Accounting/       # expense categories, expenses, financial transactions
│   ├── Customers/        # customers, loyalty, consents
│   ├── Reporting/        # report definitions, queries, exports
│   ├── Subscriptions/    # plans, subscriptions, usage, entitlements
│   └── Auditing/         # audit logs, security events
├── Http/
│   ├── Controllers/
│   ├── Middleware/
│   └── Requests/
├── Jobs/
├── Policies/
├── Events/
└── Providers/
```

```
resources/js/
├── layouts/
│   ├── SaaSAdminLayout.tsx
│   ├── TenantLayout.tsx
│   └── POSLayout.tsx
├── components/
├── pages/
│   ├── saas/
│   ├── onboarding/
│   ├── dashboard/
│   ├── pos/
│   ├── menu/
│   ├── inventory/
│   ├── purchasing/
│   ├── cash/
│   ├── reports/
│   └── settings/
└── types/
```

> This is a **logical starting structure**, not a mandate to move an existing codebase
> into it all at once.

---

## 5. Request lifecycle (critical paths)

### 5.1 A POS sale

```
UI (React/Inertia)
  → Form Request validation (server-side totals recomputed)
  → Policy / Gate check (tenant + branch + role + permission)
  → SaleService (DB transaction)
        · persist order + immutable price snapshots
        · persist payment (internal: atomic; external: state machine)
        · write stock + cash movements
  → commit
  → dispatch secondary jobs AFTER commit (kitchen ticket, receipt, notifications, analytics)
  → respond with confirmed state
```

Key properties:

- Totals are **server-calculated**, never trusted from the browser.
- The transaction is committed only when all required writes succeed.
- Secondary work is **post-commit** and retry-safe.
- Idempotency keys prevent duplicate sales/charges.

### 5.2 Tenant context resolution

Tenant and branch context must be resolved from **trusted authenticated server-side
context**, never from a client-supplied identifier alone. See [SECURITY.md](./SECURITY.md).

---

## 6. Cross-cutting concerns

| Concern | Approach |
|---------|----------|
| Transactions | Wrap related critical writes (sale, payment, stock, cash) in DB transactions |
| Idempotency | Idempotency keys on retried payment and sale requests |
| Queues | Redis-backed; dispatch after commit; retry-safe and monitored |
| Scheduling | Laravel Scheduler behind a reliable cron entry; execution monitoring |
| Caching | Redis; driven by profiling and actual access patterns |
| Logging | Structured logs with request/tenant/branch/user correlation IDs |
| Money | Decimal-safe storage with explicit rounding policy |
| Localization | No hard-coded currency/tax/gateway/timezone in core logic |

---

## 7. Testing strategy

- **Feature tests** — every endpoint: authorization, validation, happy path, failure/rollback.
- **Tenant-isolation tests** — attempt cross-tenant and cross-branch access; must fail closed.
- **Regression tests** — added for every corrected critical business rule.
- **Browser E2E** — critical journeys (onboarding, POS sale, shift close).
- **Never use production business data for destructive tests.**

---

## 8. Deployment

- Automated test suite gates deployment.
- Controlled, reversible migrations with a rollback assessment.
- Health checks for app, queue worker, scheduler and database.
- Rollback strategy documented per release.

---

## 9. Non-negotiable engineering rules

1. Inspect the existing repository before changing anything.
2. Preserve existing working behavior unless an evidence-backed defect requires change.
3. Work one approved phase at a time.
4. Trace every journey UI → validation → authorization → business logic → DB → side effects.
5. Resolve tenant context from trusted authenticated server-side context.
6. Enforce tenant/branch authorization on every endpoint, query, job, export and file op.
7. Design payment operations for idempotency, retries, webhook verification, uncertain outcomes.
8. Maintain traceable stock and financial movements.
9. Never queue a critical state change and report success before it is confirmed.
10. Dispatch secondary jobs after commit with a reliable dispatch strategy.
11. Make queued jobs retry-safe and monitor failed jobs.
12. Use DB constraints, indexes and automated tests.

---

## 10. Order → Kitchen → Billing state ownership

Each concern has a single authoritative owner; every other module reads (never
writes) another owner's state.

| Concern | Authoritative owner | Notes |
|---------|---------------------|-------|
| Staff/QR order confirmation | Order System (`orders.acceptance_status`) | Staff orders default to Pending; an `orders.approve` holder confirms (or the tenant opts into direct taking). |
| Kitchen processing status | Kitchen (`kitchen_tickets.status`) | Enforced state machine: `new → accepted → preparing → ready → handed_over → served`, plus `cancelled`. Order System mirrors this into `orders.fulfillment_status` (read-only `KitchenStatusSynchronizer`). |
| Invoice & payment records | Invoicing / billing (`invoices`, `invoice_orders`, `payments`) | Served orders join an open invoice per table/session (`invoice_orders.order_id` unique → no double charge). Finalized (paid/void) invoices are never modified. |
| Customer QR tracking | Read-only view | `CustomerStatusMapper` projects order + kitchen state onto the customer timeline. |

Synchronization rules:

- Kitchen is authoritative for processing; it publishes to the Order System and to QR tracking.
- Serving (`kitchen_tickets.status = served`, or `orders.fulfillment_status = served`) idempotently triggers invoice creation — there is no separate manual "send to billing" step.
- Confirmation, serving, bill requests and payment callbacks are all safe against repetition (DB unique constraints, row locks, idempotency keys).
- Notification recipients are always branch-scoped and permission-filtered.
- Failures are recorded (`kitchen.ticket_open_failed` audit marker, `kitchen:backfill-tickets` command) and recoverable without losing or duplicating data.

---

## 11. Tenant Overview dashboard & reporting periods

The business **Overview** (`GET /dashboard`, `DashboardController@index` →
`DashboardOverviewService`) is period-driven. A global period filter
(`Today · Week · Month · Custom`, `resources/js/Components/ui/PeriodFilter.tsx`)
re-drives every date-dependent widget via an Inertia `router.get` round-trip.

### Reporting window

`App\Domain\Reporting\ReportPeriod` is the single source of truth for a window:

- `ReportPeriod::forPreset('today'|'week'|'month', …)` resolves boundaries in the
  tenant/branch timezone (**Asia/Dhaka**); weeks start **Monday** and presets are
  week/month-to-date. `ReportPeriod::make($from, $to, …)` handles custom ranges.
- `ReportPeriod::previous()` returns the equivalent preceding window (yesterday /
  previous week / previous month / equal-length custom) for KPI deltas and the
  trend overlay.

### Period vs. "right now"

| Zone | Driven by the period filter | Source |
|------|-----------------------------|--------|
| KPI cards (+ deltas), sales trend, orders by source/type/status, top products, busiest hours, payment mix, profitability, branch comparison, staff | Yes | `ReportService` (via `DashboardOverviewService`) |
| Right-now strip, lifetime customer segments / top customers, plan & subscription | No | `DashboardAnalyticsService` + tenant data |

### Money semantics (never conflated)

- **Sales** follow the order's `placed_at`; **Payments collected** and the payment
  mix follow each payment's own `paid_at` and count only `status = succeeded`
  (`ReportService::collected*`).
- Net sales exclude tax: `Σ (order.total − order.tax_total)`; refunds are voided
  orders; profit = net sales − COGS (immutable `order_items.unit_cost`) − approved
  expenses.

### Access & scoping

- Single gate `dashboard.view` (route: `auth + verified + onboarding.completed`);
  onboarding mode is unchanged.
- All queries run under `BelongsToTenant` + `BranchScope` (fail-closed). **Branch
  comparison** is only returned when the user has tenant-wide branch access; no
  cross-branch data is sent otherwise.

### Frontend

- `resources/js/Pages/Dashboard.tsx` renders the sections above; KPI labels are
  translation keys (`dash.kpi.*`) resolved with `useT()` (`resources/js/i18n`).
- Print uses the browser print dialog; CSV export is generated client-side from
  the KPI summary.

Tests: `tests/Feature/Dashboard/OverviewDashboardTest.php`,
`tests/Feature/Reporting/ReportPeriodTest.php`.
