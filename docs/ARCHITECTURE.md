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
