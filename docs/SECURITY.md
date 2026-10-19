# Security & Tenant Isolation

**Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md)

---

## 1. The three-access model

Platform access, tenant business access and support access are **separate permissions**.

| Access type | Who | Scope |
|-------------|-----|-------|
| Platform access | SaaS Super Admin | Tenant lifecycle, plans, billing, diagnostics, maintenance — **not** tenant business data by default |
| Tenant business access | Tenant users (owner, admin, manager, cashier, ...) | Their own tenant/company only |
| Support access | Support staff | Time-limited, reasoned, audited — via impersonation only |

**Hard rules:**

- A cashier must not see SaaS billing or platform maintenance.
- A SaaS administrator must **not** automatically gain unrestricted access to tenant
  business data.
- Impersonation must **never** become a hidden way to bypass tenant isolation.
- Enforce restrictions on the **backend**, not only by hiding frontend buttons.

---

## 2. Tenant isolation

- Tenant context is resolved from **trusted authenticated server-side context** — never
  from a client-supplied `tenant_id` alone.
- Every endpoint, query, job, export and file operation is constrained by the resolved
  tenant (and branch where applicable).
- Branch-level operations validate **both** `tenant_id` and `branch_id`.
- The active branch is resolved server-side per request (`ResolveActiveBranch`) from the
  authenticated user's accessible branches; a client-supplied branch is honoured only when the
  user may access it. Data-layer branch scoping (a fail-closed global scope) is added in
  Phase 16E(B).
- Cross-tenant access must **fail closed**.
- Automated cross-tenant tests are mandatory in every phase.

---

## 3. Roles & permission matrix

Predefined roles (see PRD §4). Granular actions: **view, create, update, delete,
approve, refund, export, manage**.

| Capability | Super Admin | Owner | Admin | Branch Mgr | Supervisor | Cashier | Kitchen | Inv. Mgr | Accountant | Auditor |
|------------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Platform admin | ✔ | – | – | – | – | – | – | – | – | – |
| Tenant settings | – | ✔ | ✔ | – | – | – | – | – | – | – |
| Branch config | – | ✔ | ✔ | ▲ | – | – | – | – | – | – |
| POS sales | – | ✔ | ✔ | ✔ | ✔ | ✔ | – | – | – | – |
| Voids/refunds | – | ✔ | ✔ | ✔ | ▲ | – | – | – | – | – |
| Kitchen tickets | – | – | – | ✔ | ✔ | – | ✔ | – | – | – |
| Inventory | – | ✔ | ✔ | ▲ | – | – | – | ✔ | – | – |
| Purchasing | – | ✔ | ✔ | ▲ | – | – | – | ✔ | – | – |
| Cash/shifts | – | ✔ | ✔ | ✔ | ▲ | ▲ | – | – | ✔ | – |
| Expenses | – | ✔ | ✔ | ▲ | – | – | – | – | ✔ | – |
| Reports | – | ✔ | ✔ | ▲ | ▲ | – | – | ▲ | ✔ | ▲ |
| Subscription/billing | – | ✔ | ▲ | – | – | – | – | – | – | – |
| Read-only audit | – | ✔ | ✔ | ▲ | – | – | – | – | ▲ | ✔ |

`✔` full · `▲` scoped/limited · `–` none. Final matrix is configurable per tenant.

---

## 4. Sensitive-action controls

- Refunds, voids, overrides, discounts above a threshold, stock adjustments and cash
  discrepancies require **manager approval or a manager PIN**.
- Role and permission changes are **logged**.
- Deactivate staff without deleting historical transaction records.
- Password reset and session revocation supported.
- Track last login and account status.

---

## 5. Impersonation

When a platform/support user acts as a tenant user:

- **Time-limited** access.
- **Reason required** before starting.
- **Visible impersonation banner** in the UI at all times.
- **Full audit trail** of who impersonated whom, when and why.
- Never grants access to a tenant the operator is not authorized for; never bypasses
  tenant isolation.

---

## 6. Payment safety

- **Idempotency keys** on retried payment and sale requests.
- Internal cash payments: atomic DB writes.
- External gateways: durable **payment state machine**, provider idempotency where
  supported, **verified webhooks**, reconciliation for uncertain outcomes.
- Webhooks: **signature verification** + idempotent processing; store raw events,
  deduplicate.
- **Never mark an order paid because a payment request was sent.**
- Prevent duplicate submissions and double charging.
- Complete a sale only after required transaction writes succeed.

---

## 7. Subscription entitlement enforcement

- **Never trust a plan name or feature flag sent by the browser.**
- Resolve subscription entitlements **on the server** for every gated action.
- Enforce plan limits (branches, users, orders, storage) on the backend.

---

## 8. Data protection

- Secrets kept out of source control; environment-specific configuration.
- Private file storage for sensitive documents; public only for intentionally public assets.
- File upload limits and access control.
- Data export and retention policies.
- Tenant deletion/export procedures defined and audited.
- Backups encrypted, retained per policy and **restore-tested**.

---

## 9. Audit & logging

- Structured logs with **request, tenant, branch and user correlation IDs**.
- Audit log for platform admin actions, permission changes and security events.
- Sensitive maintenance actions are permission-controlled, auditable and safe for
  production data.
- Security event history retained for investigation.

---

## 10. Phase verification checklist

Every phase must include:

- [ ] Cross-tenant access attempt → denied.
- [ ] Cross-branch access attempt → denied.
- [ ] Permission denied path returns no data.
- [ ] Sensitive action requires approval where configured.
- [ ] Sensitive action written to audit log.
- [ ] No secrets or private files exposed.
- [ ] Tenant isolation covered by automated tests.
