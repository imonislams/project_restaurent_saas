# Database Design

**Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [SECURITY.md](./SECURITY.md)

> Exact columns and relationships are finalized after reviewing the repository and
> business rules. This document is the **schema inventory** plus the mandatory
> integrity rules that must hold regardless of final column choices.

---

## 1. Schema inventory by domain

| Domain | Main tables |
|--------|-------------|
| Platform | `tenants`, `tenant_settings`, `plans`, `plan_features`, `subscriptions`, `usage_records` |
| Identity | `users`, `roles`, `permissions`, `role_user` (or membership equivalent), `invitations`, `sessions` |
| Branches | `branches`, `branch_user`, `business_hours`, `registers` |
| Menu | `categories`, `products`, `product_variants`, `modifier_groups`, `modifiers`, `product_availability` |
| Recipes | `ingredients`, `recipes`, `recipe_items`, `units`, `unit_conversions` |
| Orders | `orders`, `order_items`, `order_item_modifiers`, `order_status_history` |
| Payments | `payments`, `payment_attempts`, `refunds`, `payment_webhook_events` |
| Inventory | `stock_locations`, `stock_balances`, `stock_movements`, `stock_counts`, `stock_transfers`, `waste_records` |
| Purchasing | `suppliers`, `purchase_orders`, `purchase_order_items`, `goods_receipts`, `supplier_payments` |
| Restaurant ops | `dining_areas`, `tables`, `reservations`, `kitchen_tickets`, `kitchen_ticket_items` |
| Cash | `shifts`, `cash_movements`, `cash_accounts`, `account_transfers`, `shift_closures` |
| Accounting | `expense_categories`, `expenses`, `financial_transactions`, `journal_entries`, `journal_entry_lines` |
| Customers | `customers`, `loyalty_accounts`, `loyalty_transactions`, `customer_consents` |
| Operations | `notifications`, `audit_logs`, `support_tickets`, `scheduled_task_runs` |

> Not every table is required in the initial MVP. Full double-entry accounting, loyalty,
> reservations and advanced recipe management can be staged later.

---

## 2. Tenancy model

- **Tenant** is the isolation root. Every tenant-owned record carries `tenant_id`.
- **Branch** is the operational scope. Branch-level records carry `branch_id`.
- Users may belong to one tenant and multiple branches (via `branch_user`).
- Platform operators are **not** tenant users; platform access is a separate identity
  and permission set (see [SECURITY.md](./SECURITY.md)).

### 2.1 Scope chain

```
Tenant (tenant_id)
  └── Branch (branch_id)
        └── Operational records (orders, stock, shifts, expenses, ...)
```

Every applicable query, job, export and file operation must be constrained by the
resolved tenant (and branch where applicable).

---

## 3. Mandatory data-integrity rules

1. **Tenant scoping** — every tenant-owned record must be scoped to its tenant.
2. **Branch validation** — branch-level records must be validated against the authorized
   tenant **and** branch.
3. **Transactions** — use database transactions for critical sale, payment, stock and
   cash changes.
4. **Unique constraints** — business identifiers that must never be duplicated
   (order numbers per branch, SKU per tenant, idempotency keys) get unique constraints.
5. **Money** — decimal-safe monetary storage with explicit rounding policy.
6. **Idempotency** — idempotency keys for retried payment and sale requests.
7. **Source references** — stock movements and financial movements record their source
   transaction.
8. **No hard deletes** — finalized financial transactions are never hard-deleted.
9. **Historical snapshots** — preserve historical prices, discounts, tax values and
   product descriptions on completed orders (immutable price snapshots).
10. **Keys & indexes** — appropriate foreign keys and indexes on all hot query paths.
11. **Refund/void/return semantics** — define exactly how refunds, voids, returns and
    corrections affect stock and accounting.
12. **Audit** — keep audit records of sensitive administrative actions.

---

## 4. Key relationships & invariants

| Relationship | Invariant |
|--------------|-----------|
| `orders` → `order_items` → `order_item_modifiers` | Item prices/tax snapshotted at sale time and immutable afterward |
| `orders` → `payments` | Sum of successful payments ≥ order total before status = paid (policy-dependent) |
| `payments` → `payment_attempts` | Attempts are append-only; success recorded once per idempotency key |
| `payments` → `payment_webhook_events` | Webhooks stored raw, deduplicated, processed idempotently |
| `orders` → `stock_movements` | Stock deduction references the order that caused it |
| `refunds` → `stock_movements` / `financial_transactions` | Refund semantics explicitly defined per product type |
| `shifts` → `cash_movements` | Cash movements belong to exactly one open shift |
| `shifts` → `shift_closures` | Closed shift immutable; corrections are new records |
| `purchase_orders` → `goods_receipts` | Inventory updated **only** for confirmed receipts |
| `waste_records` → `stock_movements` | Waste always creates a corresponding stock movement |
| `stock_movements` | Append-only ledger; corrections are compensating entries |

---

## 5. Ledger principle

Two append-only ledgers anchor the business core:

1. **Stock movement ledger** — every quantity change is a movement with a source reference.
2. **Financial movement ledger** — every money movement (sale, refund, expense, transfer)
   is recorded with a source reference.

Balances are **derived** from movements (or cached and reconciled against them). Do not
independently edit balances in multiple modules without a consistent transaction and
reconciliation strategy.

```
stock_movements:          (id, tenant_id, branch_id, stock_location_id,
                           product_id|ingredient_id, qty_delta, unit_cost,
                           reason, source_type, source_id, created_by, created_at)

financial_transactions:   (id, tenant_id, branch_id, account_id,
                           amount_delta, direction, category,
                           source_type, source_id, created_by, created_at)
```

---

## 6. Cash vs. revenue (modeling note)

These are **different concepts** and must not be conflated:

- **Sales revenue** ≠ **cash received**.
- **Taxes collected** are a liability, not revenue.
- A shift (cashier session) is not the same as a **business day**.

Model payments (money movements) separately from revenue recognition (accounting
entries). A full double-entry general ledger (`journal_entries`,
`journal_entry_lines`) is only required if the platform is intended to serve as an
accounting system rather than operational cash management.

---

## 7. Indexing & performance

- Composite indexes leading with `tenant_id` (and `branch_id`) for tenant-scoped queries.
- Indexes on hot filters: dates, statuses, foreign keys, barcodes, order numbers.
- Server-side pagination for large tables.
- Query profiling before optimization; optimize from real access patterns.

---

## 8. Migration policy

- Migrations are controlled, reversible where possible, and assessed for rollback.
- Data migrations that rewrite existing financial/stock records require an explicit
  reconciliation plan.
- Never run destructive migrations against production business data without backup and
  a documented rollback.
