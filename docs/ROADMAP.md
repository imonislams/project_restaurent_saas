# Development Roadmap

**Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

> Build the system as a **sequence of completed business journeys**, not by creating every
> module's screens first. **Do not proceed automatically to the next phase.** Confirm the
> current phase is complete, document remaining issues and wait for explicit approval.

---

## Phase overview

| # | Phase | Focus |
|---|-------|-------|
| 01 | Repository discovery and architecture | Inspect existing code, DB, routes, auth, frontend, tests, deployment. **No broad refactoring.** |
| 02 | Tenant security and authentication | Registration, verification, membership, tenant context, policies, cross-tenant tests |
| 03 | Onboarding and branch setup | Company settings, first branch, timezone, currency, tax, activation checklist |
| 04 | Team and permissions | Invitations, role management, branch access, sensitive-action approvals |
| 05 | Menu and inventory foundation | Products, categories, pricing, units, opening stock, movement ledger |
| 06 | Opening day and POS | Cashier shift, order creation, discounts, tax, payment, receipt, atomic stock/cash updates |
| 07 | Kitchen, tables and fulfillment | KDS, table management, takeaway, order status tracking |
| 08 | Purchasing, waste and transfers | Supplier workflow, goods receiving, adjustments, waste, branch transfers |
| 09 | Cash, expenses and accounting | Shift reconciliation, account movements, expense approvals, financial rules |
| 10 | Reports and dashboards | Sales, payments, stock, waste, expenses, reconciled profit calculations |
| 11 | SaaS subscriptions and platform admin | Plans, limits, usage, billing states, tenant diagnostics, audited support access |
| 12 | Queues, scheduler and notifications | Retry-safe jobs, recurring tasks, failure monitoring, operational alerts |
| 13 | Performance and production readiness | Query profiling, indexes, backups, restore tests, monitoring, security, load tests |
| 14 | Internationalization and advanced features | Localized experience, extra payment providers, loyalty, delivery integrations, advanced analytics |
| 17 | PWA, offline operation, versioning & release | Installable app, offline POS capture with replay-safe sync, SemVer + changelog + tagged releases |

---

## Phase detail

### Phase 01 — Repository discovery and architecture

Inspect existing code, database, routes, authentication, frontend, tests and deployment.
Produce an architecture map, feature inventory, dependency inventory, tenant-isolation
assessment, existing journey map and prioritized risks. **No code changes.**

### Phase 02 — Tenant security and authentication

Tenant registration, email verification, membership, tenant context resolution, policies
and gates. Cross-tenant tests are the exit gate.

### Phase 03 — Onboarding and branch setup

Company settings, first branch (timezone/currency/tax), receipt and service types,
resumable wizard, activation checklist, time-to-first-sale tracking.

### Phase 04 — Team and permissions

Email invitations, invitation acceptance, multi-role assignment, granular permissions,
branch restrictions, manager PIN approvals, role-change audit.

### Phase 05 — Menu and inventory foundation

Categories, products, variants, modifiers, pricing, units, opening stock and the stock
movement ledger. Recipe/costing foundation optional and configurable.

### Phase 06 — Opening day and POS

Cashier shift opening, order creation, discounts, tax, payment (cash + external),
receipt, and atomic stock/cash updates. This is the **must-never-break** transaction.

### Phase 07 — Kitchen, tables and fulfillment

KDS tickets and stations, table/floor management, takeaway and delivery order types,
order status tracking. Table features remain optional.

### Phase 08 — Purchasing, waste and transfers

Suppliers, purchase orders, goods receiving (inventory updated only on confirmed
receipt), waste recording with stock movements, inter-branch transfers with approval.

### Phase 09 — Cash, expenses and accounting

Shift reconciliation and closures, account movements, expense approvals, financial
rules. Define the accounting model; full double-entry only if required.

### Phase 10 — Reports and dashboards

Sales, payment, cash, shift, inventory, purchase, waste, expense, profit, staff, branch
and tax reports. Consistent date/branch filters and timezone-correct periods.

### Phase 11 — SaaS subscriptions and platform admin

Plans, feature limits, usage metering, billing states, tenant diagnostics and audited
support access (impersonation). Backend entitlement enforcement.

### Phase 12 — Queues, scheduler and notifications

Retry-safe queued jobs, scheduled recurring tasks, failure monitoring and operational
alerts. Secondary work only after commit.

### Phase 13 — Performance and production readiness

Query profiling, indexes, backups, restore tests, monitoring, security review and load
tests.

### Phase 14 — Internationalization and advanced features

Localized experience (Bangla/English), additional payment providers, loyalty, delivery
integrations and advanced analytics.

### Phase 17 — PWA, offline operation, versioning & release

Runs **after** the core build, as a program of its own with an approval gate per sub-phase.
Design authority is [PWA-OFFLINE.md](./PWA-OFFLINE.md) and [RELEASE.md](./RELEASE.md).

| Sub-phase | Focus |
|---|---|
| 17A | Documentation — PWA/offline design and release process (no code). |
| 17B | PWA shell — manifest, icons, service worker (static assets only), offline page, install/update UI. |
| 17C | Version + build metadata — `VERSION` as single source, surfaced in UI and `/health`. |
| 17D | Release process — changelog, pre-release check, first annotated tag. |
| 17E | Offline foundation — offline bundle endpoint, IndexedDB mirror, outbox, sync engine. |
| 17F | Offline POS capture — pricing parity fixtures, offline sale flow, provisional numbers. |
| 17G | Conflicts & sync observability — `offline_sync_conflicts`, resolution UI, server rules. |
| 17H | Offline auth & approvals hardening — cached session expiry, online-only approvals. |

**Exit requirements (per sub-phase):** the phase exit checklist below **plus** an explicit
statement of what remains unavailable offline, and evidence that no Inertia/JSON response is
cached by the service worker.

> **Hard boundary:** a payment that cannot be authorised offline is never recorded as
> settled, and an offline-created order is never given a final order number by the client.

---

## Phase exit requirements

Every phase must finish with **all** of the following:

- [ ] Verified end-to-end business journey.
- [ ] Permission and tenant-isolation tests.
- [ ] Validation, error and rollback tests.
- [ ] Automated regression coverage.
- [ ] Responsive and desktop UX review.
- [ ] Query/performance review appropriate to the feature.
- [ ] Audit log verification for sensitive operations.
- [ ] Migration and rollback assessment.
- [ ] A concise report of changes, test results and remaining risks.

---

## Implementation workflow (per phase)

1. **Discovery** — inspect the relevant area; no code changes. (Phase 01 applies this to the whole repo.)
2. **Planning** — select one phase; list business outcomes, files/modules, schema changes, dependencies, security concerns, acceptance tests.
3. **Implementation** — implement the smallest coherent change that completes the journey; reuse existing patterns.
4. **Verification** — run automated tests, security checks, migration checks, regression tests; inspect the UI and test failure scenarios.
5. **Audit report** — report scope inspected, journey completed, features implemented, files changed, DB/migration changes, security and isolation results, tests run, performance notes, known defects, deployment/rollback notes and final phase status.

---

## Execution boundary

Complete only the **current approved phase**. Do not automatically implement the next
phase, rewrite unrelated modules or perform destructive production operations. **Stop after
verification and wait for approval before continuing.**

> The definition of done is a **verified end-to-end business journey**, not merely a
> completed UI page or a successful code-generation response.
