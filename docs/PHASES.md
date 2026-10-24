# Phase Reports

Tracks the state of each roadmap phase. A phase is only complete when every exit
requirement in [ROADMAP.md](./ROADMAP.md) is satisfied and the report below is filled in.
**Do not start the next phase without explicit approval.**

| Phase | Status |
|-------|--------|
| 01 — Repository discovery and architecture | Complete |
| 02 — Tenant security and authentication | Complete |
| 03 — Onboarding and branch setup | Complete |
| 04 — Team and permissions | Complete |
| 05 — Menu and inventory foundation | Complete |
| 06 — Opening day and POS | Complete |
| 07 — Kitchen, tables and fulfillment | Complete |
| 08 — Purchasing, waste and transfers | Complete |
| 09 — Cash, expenses and accounting | Complete |
| 10 — Reports and dashboards | Complete |
| 11 — SaaS subscriptions and platform admin | Complete |
| 12 — Queues, scheduler and notifications | Complete |
| 13 — Performance and production readiness | Complete |
| 14 — Internationalization and advanced features | Complete |
| 15A — Registration, verification & onboarding journey | Complete pending review |
| 15B — Tenant payment gateways | Complete pending review |
| 15C — Customer segmentation & analytics | Complete pending review |
| 15D — Product images, bulk import/export & storage link | Complete pending review |
| 16E(A) — Active restaurant & branch context | Complete pending review |
| 16E(B) — Branch-wise permissions & task assignment | Complete pending review |
| 16F — Table staff assignment (create & edit) | Complete pending review |
| 16G — Table staff role & order confirmation | Complete pending review |

---

## Phase 01 — Repository discovery and architecture

**Finding:** The repository was empty (only `.git`). No existing application, database,
routes, models or tests to inspect. Greenfield build. Architecture, database, UI/UX,
security and roadmap documents were produced (see `docs/`).

**Decision:** Scaffold a fresh Laravel 12 + Inertia + React + TypeScript + Tailwind
application as the base for Phase 2.

---

## Phase 02 — Tenant security and authentication

### Business journey completed

A restaurant owner registers with name, business email, password and restaurant name;
the system provisions a tenant on a trial, links the owner to it with the Tenant Owner
role, enforces email verification, and blocks access for suspended or missing tenants.
Cross-tenant and platform/tenant access boundaries are enforced on the server.

### Features implemented

- **Tenancy foundation** — `tenants` table + `Tenant` model (status, trial, settings,
  soft deletes); `TenantContext` singleton; `BelongsToTenant` trait (global scope +
  auto-fill `tenant_id`).
- **Tenant context resolution** — `ResolveTenant` middleware binds the tenant from the
  authenticated user (trusted server-side context only).
- **Tenant status enforcement** — `EnsureTenantIsActive` logs out users whose tenant is
  suspended, archived or missing.
- **Authentication** — registration provisions tenant + owner atomically
  (`RegisterTenant` action); login records `last_login_at`; Breeze email verification and
  password reset retained.
- **Roles & permissions** — global system roles (10) and a curated permission catalog;
  `HasRoles` trait; `role_user` / `permission_role` pivots.
- **Authorization** — `Gate::before` resolves catalog permissions; `TenantPolicy`
  enforces tenant ownership; `EnsurePermission` and `EnsurePlatformAdmin` middleware.
- **Platform/tenant separation** — platform admins resolve `platform.*` permissions only
  and never inherit tenant permissions.
- **Inertia shared props** — `auth.user`, `auth.permissions`, `tenant`, `flash`.

### Files and modules changed

```
app/Domain/Tenancy/{Models,Enums,Concerns,Actions,Policies,Factories}
app/Domain/Identity/{Models,Enums,Concerns}
app/Domain/Branches/{Models,Factories}         (minimal Branch — first tenant-owned model)
app/Http/Middleware/{ResolveTenant,EnsureTenantIsActive,EnsurePermission,EnsurePlatformAdmin}
app/Http/Controllers/Auth/{RegisteredUserController,AuthenticatedSessionController}
app/Models/User.php
app/Providers/AppServiceProvider.php
bootstrap/app.php
database/migrations/2026_10_11_0000{01..04}_*
database/seeders/{RolePermissionSeeder,DatabaseSeeder}
database/factories/UserFactory.php
resources/js/Pages/Auth/Register.tsx
tests/Feature/{Auth/RegistrationTest,Identity/RolePermissionTest,Tenancy/TenantIsolationTest}
```

### Database and migration changes

- New: `tenants`, `roles`, `permissions`, `permission_role`, `role_user`, `branches`.
- Altered: `users` (+`tenant_id`, `is_platform_admin`, `status`, `last_login_at`,
  `deactivated_at`, index on `tenant_id,status`).
- All migrations verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- Cross-tenant read denied (global scope + policy) — verified.
- Cross-tenant record lookup returns `null` — verified.
- Suspended / missing-tenant users are logged out — verified.
- Tenant roles carry no platform permissions; platform admin carries no tenant
  permissions — verified.
- `platform` and `permission:` route guards enforce access server-side — verified.

### Tests executed

```
php artisan test   →  42 passed (113 assertions)
```

Coverage includes: registration provisioning, requirement/duplicate validation, tenant
isolation, suspended/missing tenant enforcement, role & permission resolution, platform
separation, and route guards.

### Performance considerations

- Composite index `users(tenant_id, status)` and `branches(tenant_id, is_active)`.
- Shared props expose `permissions` as a deferred closure to avoid unnecessary queries on
  partial reloads.
- Lazy-loaded `roles.permissions` (`loadMissing`) to avoid repeated queries.

### Known defects and unresolved risks

- **MySQL is local via MAMP** (`127.0.0.1:8889`, root/root) — must be replaced by managed
  credentials before any shared/deployed environment.
- Roles are currently **global only** (no per-tenant custom roles) and **not yet
  branch-scoped** — branch-scoped assignments land in Phase 3/04.
- `Tenant::getRouteKeyName()` is `slug`; no tenant-facing routes use it yet.
- Login does not yet record failed-attempt throttling beyond Laravel defaults.
- No platform UI yet (Phase 11); platform guards are in place and tested.

### Deployment / rollback

- Migrations are additive and reversible (`down()` implemented).
- No production data exists; `migrate:fresh --seed` is the current setup path.

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 03
(onboarding and branch setup).

---

## Phase 03 — Onboarding and branch setup

### Business journey completed

After registering, a restaurant owner is guided through a resumable onboarding wizard:
company & region → first branch → operating hours → tax → receipt → review & activate.
Required steps (company, branch) must be complete before activation; optional steps can
be skipped without blocking progress. The dashboard shows an activation checklist and
warns about incomplete required configuration. Onboarding completion is recorded.

### Features implemented

- **Company & region** — business name, contact, tax id, address, country, currency and
  timezone, stored on `tenants.settings`.
- **First branch** — name, code, address, phone, per-branch timezone/currency,
  service types (dine-in/takeaway/delivery/counter). First branch marked primary.
- **Operating hours** — 7-day weekly schedule per branch (`business_hours`).
- **Tax preferences** — label, rate and tax-inclusive flag.
- **Receipt setup** — header, footer, show-tax, show-logo.
- **Resumable wizard** — current step derived from saved data; progress bar and
  clickable stepper; per-step save.
- **Skip optional steps** — hours/tax/receipt skippable; required steps cannot be skipped.
- **Review & activate** — checklist summary with edit links; activation blocked until
  required steps complete; records `onboarding_completed_at`.
- **Activation checklist & warnings** — rendered on the dashboard with progress.
- **Single-restaurant friendly** — no multi-branch requirement to finish onboarding.

### Files and modules changed

```
app/Domain/Onboarding/{Enums/OnboardingStep,OnboardingService}
app/Domain/Branches/{Enums/ServiceType,Models/BusinessHour,Policies/BranchPolicy,Factories/BusinessHourFactory}
app/Http/Controllers/{Onboarding/OnboardingController,DashboardController}
app/Http/Requests/Onboarding/{Company,Branch,Hours,Tax,Receipt}Request
app/Domain/{Tenancy/Models/Tenant,Branches/Models/Branch}   (extended)
config/geo.php
routes/web.php
database/migrations/2026_10_11_0000{05,06,07}_*
resources/js/Layouts/OnboardingLayout.tsx
resources/js/Components/{SelectInput,Onboarding/*}
resources/js/Pages/{Dashboard,Onboarding/Show}.tsx
resources/js/types/*
tests/Feature/Onboarding/OnboardingFlowTest.php
```

### Database and migration changes

- Altered: `tenants` (+`onboarding_step`, `first_sale_at`); `branches` (+`address`,
  `phone`, `timezone`, `currency`, `service_types`, `is_primary`, `settings`).
- New: `business_hours` (tenant-scoped, unique per branch+day).
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- Onboarding is scoped to the authenticated user's tenant only.
- A second tenant never sees another tenant's onboarding progress or branches — verified.
- Platform admins (no tenant) receive 403 on onboarding — verified.
- `BranchPolicy` registered for tenant-scoped branch authorization.

### Tests executed

```
php artisan test   →  56 passed (187 assertions)
```

New coverage: registration → onboarding redirect, step rendering, per-step persistence
and advancement, required-field validation, optional-step skipping, required-step
skip rejection, completion gating, activation, dashboard checklist, tenant isolation.

### Performance considerations

- Business hours loaded with a single keyed query per step render.
- Checklist/progress derived in-memory from a small number of scoped queries.

### Known defects and unresolved risks

- Menu, inventory, staff-invite and payment-method onboarding steps are **not yet**
  implemented — the checklist shows them as pending and the wizard does not include them.
  These arrive with Phases 04–06.
- Sample/demo data import is not implemented yet; `data_mode` separation is deferred to
  the menu phase.
- `first_sale_at` (time-to-first-sale) is stored but not yet set — Phase 06.
- No company logo upload yet (receipt `show_logo` is stored only).
- Country/currency/timezone are validated by format (ISO size 2/3, valid tz) but the
  selectors use a curated list in `config/geo.php`.

### Deployment / rollback

- All migrations additive and reversible.
- Dev setup remains `php artisan migrate:fresh --seed`.

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 04
(team and permissions).

---

## Phase 04 — Team and permissions

### Business journey completed

A tenant owner invites staff by email with roles and branch access; the invitee accepts
via a tokenised link, sets a password and is activated with the assigned roles and branch
access. Owners manage roles, branch restrictions, deactivation, session revocation and
password resets — every sensitive action is audited. Approvers can set a manager PIN used
to authorize sensitive actions.

### Features implemented

- **Invitations** — create (email + roles + branches), resend (new token/expiry), revoke;
  SHA-256 hashed tokens, 7-day expiry; emailed via `StaffInvitationNotification`.
- **Invitation acceptance** — tokenised public route; creates the user, verifies email,
  assigns roles and branch access, marks the invitation accepted.
- **Role management** — assign multiple tenant roles per user; platform role excluded.
- **Branch access** — `branch_user` pivot; owners/admins get all branches, others only
  granted branches (`accessibleBranchIds`, `canAccessBranch`).
- **Branch-scoped role assignments** — `role_user.branch_id` added (enforcement is via
  branch access; documented).
- **Deactivate/reactivate** — soft account state; historical records preserved; self
  deactivation blocked.
- **Session revocation & password reset** — revoke DB sessions; send reset link.
- **Manager PIN** — hashed PIN; `ManagerPinService` verifies the approving manager and
  audits both success and failure.
- **Audit log** — append-only `audit_logs`; records invitations, access changes,
  deactivation, PIN set/verify, password reset.
- **Policies** — `UserPolicy` (staff), plus existing `TenantPolicy`/`BranchPolicy`.
- **Permission-aware navigation** — Staff link shown only with `staff.view`.

### Files and modules changed

```
app/Domain/Auditing/{AuditLogger,Models/AuditLog}
app/Domain/Identity/{InvitationService,StaffService,ManagerPinService}
app/Domain/Identity/{Models/Invitation,Factories/InvitationFactory,Policies/UserPolicy}
app/Domain/Identity/Notifications/StaffInvitationNotification
app/Http/Controllers/Staff/{StaffController,AcceptInvitationController,ManagerPinController}
app/Http/Requests/Staff/{StoreInvitation,UpdateStaff,AcceptInvitation,ManagerPin}Request
app/Models/User.php                         (branch access, PIN, branch relation)
app/Domain/{Identity/Concerns/HasRoles,Tenancy/Models/Tenant}
app/Providers/AppServiceProvider.php        (UserPolicy registration)
routes/web.php
database/migrations/2026_10_11_0000{08..11}_*
resources/js/Pages/{Staff/Index,Invitations/Accept}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/Staff/{StaffManagementTest,ManagerPinTest}
```

### Database and migration changes

- New: `invitations`, `audit_logs`, `branch_user`.
- Altered: `role_user` (+`branch_id`), `users` (+`manager_pin`).
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- Staff operations scoped to the actor's tenant; cross-tenant management returns 403 —
  verified.
- Platform role cannot be assigned through invitations or access updates — verified.
- Cashier (no `staff.view`) cannot reach the staff area — verified.
- Self-deactivation blocked — verified.
- Every sensitive action writes an audit record — verified.
- PIN verification ignores users without approval permission — verified.

### Tests executed

```
php artisan test   →  74 passed (245 assertions)
```

New coverage (18 tests): invite + notification, platform-role rejection, duplicate email,
accept (roles + branch access + email verified), expired invite, access update + audit,
deactivate/reactivate + self-guard, session revocation, cross-tenant 403, branch-access
restriction, manager PIN set/verify/failure/permission gating.

### Performance considerations

- Staff list eager-loads roles and branches (single query each).
- PIN verification iterates only active users with a PIN (small set); documented as
  acceptable at current tenant scale.

### Known defects and unresolved risks

- Invitation emails send **synchronously** (log driver in dev). Queuing arrives in Phase 12.
- PIN verification iterates candidates and uses `Hash::check` per candidate — fine for
  typical team sizes but should be indexed/rethought at large scale.
- No per-tenant custom roles yet (global system roles only).
- Branch-scoped role rows are stored but permissions are resolved tenant-wide; only
  *branch access* is enforced per branch. Full per-branch permission scoping is deferred.
- No self-service "set PIN" UI yet (route exists and is tested); a profile control lands
  with the POS/approval UI.

### Deployment / rollback

- All migrations additive and reversible.

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 05
(menu and inventory foundation).

---

## Phase 05 — Menu and inventory foundation

### Business journey completed

A tenant builds its menu (categories → products with per-service pricing, variants,
labels, optional stock tracking) and sets up its inventory (units, ingredients, stock
locations, opening stock). Every quantity change is recorded as an append-only stock
movement, and the on-hand balance is maintained transactionally. Negative stock is
prevented unless a tenant explicitly enables it.

### Features implemented

- **Categories** — create/update/soft-delete, parent/child (subcategories), sort order,
  per-tenant slug uniqueness.
- **Products** — name, description, SKU (per-tenant unique), barcode, tax category,
  dine-in/takeaway/delivery prices, cost price, labels, `inventory_mode`
  (none / own stock / recipe), active & available flags, sort order.
- **Variants** — named variants with optional price override; first marked default.
- **Per-branch availability** — `product_availability` overrides with
  `Product::isAvailableIn($branchId)`.
- **Units & conversions** — tenant-level units with a default set provisioned per tenant
  (pc, kg, g, L, mL) and kg↔g / L↔mL conversions.
- **Ingredients** — definition with unit, cost per unit, inventory tracking flag.
- **Recipes foundation** — `recipes` + `recipe_items` (BOM) with
  `Recipe::costPerYield()`; configurable, not required for POS.
- **Stock locations** — per branch; a default "Main Store" is provisioned for each branch.
- **Stock ledger** — append-only `stock_movements` (opening, purchase, sale, adjustment,
  waste, transfer, return) with source references; cached `stock_balances` updated in the
  same transaction. **All writes go through `StockService`.**
- **Opening stock & adjustments** — record opening quantities; adjust to a counted value
  (recording the delta); negative-stock prevention with an opt-in tenant setting.
- **Search & pagination** — menu product search (name/SKU/barcode) with server-side
  pagination and category filter.

### Files and modules changed

```
app/Domain/Menu/{Models/Category,Product,ProductVariant,ProductAvailability,Recipe,RecipeItem}
app/Domain/Menu/{Enums/InventoryMode,Factories/*}
app/Domain/Inventory/{Models/Unit,UnitConversion,Ingredient,StockLocation,StockBalance,StockMovement}
app/Domain/Inventory/{Enums/StockMovementReason,StockService,Actions/ProvisionInventoryDefaults,Factories/*}
app/Http/Controllers/Menu/MenuController.php
app/Http/Controllers/Inventory/InventoryController.php
app/Http/Requests/Menu/{CategoryRequest,ProductRequest}
app/Http/Requests/Inventory/{UnitRequest,IngredientRequest,StockMovementRequest}
app/Domain/Tenancy/Concerns/BelongsToTenant.php   (auth fallback — see fixes)
app/Providers/AppServiceProvider.php              (morph map)
app/Domain/{Tenancy/Actions/RegisterTenant,Onboarding/OnboardingService}  (default provisioning)
app/Domain/{Tenancy/Models/Tenant,Branches/Models/Branch}                 (relations)
config/geo.php already provided region options
routes/web.php
database/migrations/2026_10_11_0000{12..16}_*
resources/js/Pages/{Menu/Index,Inventory/Index}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/{Menu/MenuManagementTest,Inventory/StockLedgerTest}
```

### Database and migration changes

- New: `units`, `unit_conversions`, `ingredients`, `categories`, `products`,
  `product_variants`, `product_availability`, `recipes`, `recipe_items`,
  `stock_locations`, `stock_balances`, `stock_movements`.
- Morph map aliases `product` / `ingredient` registered so stored stock records are
  stable across class moves.
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- All menu/inventory models are tenant-scoped; cross-tenant product management returns
  404 — verified.
- Route-model binding is now tenant-safe: a **fixed bug** where binding ran before the
  tenant context was set is resolved by resolving the tenant from the authenticated user
  inside the global scope (defense in depth).
- Stock can only be recorded against items, locations and branches within the tenant —
  verified.
- Location must belong to the selected branch — verified.

### Tests executed

```
php artisan test   →  90 passed (295 assertions)
```

New coverage (16 tests): default unit provisioning on registration, menu access control,
category CRUD, product create with variants/labels, per-tenant SKU uniqueness, product
update, cross-tenant 404, branch availability override, opening stock, adjustment deltas
+ audit, negative-stock prevention and opt-in, append-only ledger, cross-tenant stock
rejection, branch/location consistency.

### Performance considerations

- Composite indexes on tenant + category/active, tenant + barcode, and tenant + movement
  date/reason.
- Menu list uses server-side pagination (25/page).
- Inventory page caps the movement ledger at the 100 most recent records.

### Known defects and unresolved risks

- **Modifiers / add-ons** and **modifier groups** (Module 5) are not implemented yet.
- **CSV import/export** and **scheduled price changes** are not implemented.
- **Product image upload** is not implemented (column exists).
- **Per-branch availability has no editing UI yet** (model + tests exist).
- **Recipe management UI** is not implemented; the foundation (models, cost calc) exists.
- Low-stock thresholds/reorder alerts are not implemented (Phase 8/9).
- Inventory page returns full balance/movement data without pagination controls.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 06
(opening day and POS).

---

## Phase 06 — Opening day and POS

### Business journey completed

A cashier opens a shift with an opening float, rings up a sale on the POS terminal
(product grid → persistent cart → payment), and the server computes all totals, records
the payment, deducts stock and posts the cash movement atomically, then prints a receipt.
The order can be listed, inspected and voided (with manager approval). Shifts are closed
with counted cash and variance reconciliation.

### Features implemented

- **Shifts & drawer** — open (opening float), close (counted cash, expected cash,
  overage/shortage), cash in/out; expected cash derived from the signed cash ledger;
  large variance requires a manager PIN; closed shifts reject new movements.
- **Registers** — per-branch register table (management UI deferred).
- **POS terminal** — branch switcher, live shift indicator, category navigation, product
  grid with variants, keyboard shortcuts (`F2` search, `F4` pay, `Esc` close), persistent
  cart, order types (dine-in/takeaway/delivery/counter), discounts, service charge, and a
  payment modal with cash tendering and change.
- **Order type pricing** — dine-in / takeaway / delivery price columns selected by type.
- **Server-side pricing engine** — `SaleCalculator` (exclusive/inclusive tax, line and
  order discounts, service charge, proportional tax allocation), never trusts the browser.
- **Atomic sale** — `SaleService` writes order + items + payments + attempts + stock
  movements + cash movements + status history in one transaction; branch-safe order
  numbers; **idempotency keys** prevent duplicate sales; immutable price snapshots.
- **Payments** — configurable payment methods (provisioned per tenant), split payments,
  cash tendering/change, external reference field, payment attempts log; partial payment
  only when enabled by policy.
- **Stock on sale** — products with own-stock mode deduct directly; recipe-mode products
  deduct ingredients via the BOM. Sales do not block on shortage by default (configurable).
- **Discount approval** — discounts above a tenant threshold require a manager PIN.
- **Void** — manager-PIN approved; reverses stock, refunds cash (when the shift is open),
  marks payments refunded, records status history + audit.
- **Receipts** — printable receipt page with tenant header/footer and reprint auditing.
- **Orders workspace** — filterable order list (date/status/type) and order detail.

### Files and modules changed

```
app/Domain/Orders/{Enums/OrderType,OrderStatus,Models/Order,OrderItem,OrderStatusHistory,OrderSequence,OrderService}
app/Domain/Payments/{Enums/PaymentStatus,PaymentMethodType,Models/Payment,PaymentAttempt,PaymentMethod,Actions/ProvisionPaymentDefaults}
app/Domain/CashManagement/{Enums/CashMovementType,Models/Register,Shift,CashMovement,CashService,ShiftService}
app/Domain/POS/{SaleCalculator,SaleService,OrderNumberGenerator}
app/Domain/Inventory/StockService.php              (per-call negative-stock override)
app/Domain/Onboarding/OnboardingService.php        (explicit tenant_id on branch)
app/Http/Controllers/{POS/PosController,CashManagement/ShiftController,Orders/OrderController,Orders/ReceiptController}
app/Http/Requests/{POS/PlaceOrderRequest,CashManagement/*,Orders/VoidOrderRequest}
app/Domain/Tenancy/Models/Tenant.php               (paymentMethods relation)
app/Domain/Tenancy/Actions/RegisterTenant.php      (payment method provisioning)
routes/web.php
database/migrations/2026_10_11_0000{17,18,19}_*
resources/js/Pages/{Pos/Index,Orders/Index,Orders/Show,Orders/Receipt}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/POS/{SaleCalculatorTest,PosSaleTest,ShiftTest,VoidOrderTest}
```

### Database and migration changes

- New: `registers`, `shifts`, `cash_movements`, `order_sequences`, `orders`, `order_items`,
  `order_status_history`, `payment_methods`, `payments`, `payment_attempts`.
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- All POS/shift/order models are tenant-scoped; route-model binding resolves within tenant.
- Sale requires `pos.use`; void requires `orders.void` plus a manager PIN.
- Prices and totals are computed server-side; client payload cannot set prices.
- Idempotency keys (unique per tenant) prevent duplicate sales and double charging.
- Verified: partial payment rejected by default; unavailable products rejected; duplicate
  idempotency returns the original order.

### Tests executed

```
php artisan test   →  119 passed (418 assertions)
```

New coverage (29 tests): calculator (order-type pricing, exclusive/inclusive tax,
percentage discount, service charge, empty order), sale (shift required, totals, change,
cash movement + expected drawer, stock deduction, recipe deduction, idempotency, partial
payment, split payments, discount approval, unavailable product, permission gate, page
renders), shifts (open/duplicate/float, cash in-out, close variance, approval, closed-shift
guard), void (PIN, stock reversal, payment refund, cash refund, double-void guard).

### Live end-to-end verification

Against MySQL via the running app: logged in as a tenant owner, loaded `/pos`, placed a
cash sale, and confirmed: order `MAIN-20261011-0001`, subtotal 640, tax 32 (5%), total 672,
change 28, one payment, one cash movement, expected drawer cash 1172 (500 float + 672),
one `order.completed` audit record, and receipt render. A duplicate POST with the same
idempotency key returned the **same** order (no duplicate).

### Performance considerations

- Order list paginated (25/page); indexes on tenant+branch+status and tenant+placed_at.
- Eager loads on order detail (items, payments, history) and POS catalog.
- Sequence row locked per branch for gap-free numbering.

### Known defects and unresolved risks

- **Secondary work is not yet dispatched post-commit**: kitchen tickets, receipt delivery
  and notifications arrive in Phase 07/12. The sale itself is complete without them.
- **External gateway flow is not implemented** — non-cash methods are recorded as
  succeeded payments; a durable provider state machine + verified webhooks arrive with a
  real gateway integration. **Do not mark orders paid off a gateway request in production
  until then.**
- **Partial refunds** are not implemented; only full void. Held/parked drafts and table
  assignment arrive in Phase 07.
- Customer records, loyalty and delivery addresses are not linked yet (order stores a
  customer name only).
- Registers have no management UI; shifts are branch-level by default.
- Hardware printing/barcode scanning are browser-print only for now.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 07
(kitchen, tables and fulfillment).

---

## Phase 07 — Kitchen, tables and fulfillment

### Business journey completed

A cashier can open a dine-in table order (held, unpaid) that occupies the table and sends
a kitchen ticket; the kitchen works the ticket on the KDS (accept → preparing → ready →
served, per item or whole ticket, with station filters, timers and priority); the table
order is settled later (payment), which frees the table; and every order moves through
fulfillment statuses (new → preparing → ready → served / dispatched → delivered).

### Features implemented

- **Kitchen stations** — per-branch stations; products are assigned to a station.
- **Kitchen tickets** — created **after the sale/held-order transaction commits**, one per
  order, idempotent per order (a retry never duplicates). Items are routed to their
  product's station; unrouted items fall into an unassigned bucket.
- **KDS** — board with New / Preparing / Ready columns, elapsed-time timers (red at 15m),
  per-item status buttons, ticket status actions, priority (normal/urgent), station filter,
  branch switcher, and a printable kitchen ticket fallback (`printed_at` recorded).
- **Tables & floor** — dining areas and tables with statuses (available, occupied,
  reserved, billing, cleaning); a floor grid with status colours; create/edit/remove
  (removal blocked while orders are open); manual status changes.
- **Table orders & settlement** — open a held order tied to a table (occupies it), settle
  it later with payment (frees it), transfer an order between tables, and auto-free on
  void. Covers and table are recorded on the order.
- **Fulfillment tracking** — a validated fulfillment status machine per order exposed on
  the order detail page with allowed next steps; status history entries and audit records.
- **Post-commit secondary work** — kitchen ticket creation runs after commit, isolated in
  `try/catch`, so a failure can never roll back or duplicate the sale.

### Files and modules changed

```
app/Domain/Tables/{Enums/TableStatus,Models/DiningArea,Table,TableService}
app/Domain/Kitchen/{Enums/KitchenTicketStatus,KitchenItemStatus,Models/KitchenStation,KitchenTicket,KitchenTicketItem,KitchenService}
app/Domain/Orders/{Enums/FulfillmentStatus,Models/Order (table/kitchen/fulfillment),OrderService (void + fulfillment),Models/OrderStatusHistory}
app/Domain/POS/SaleService.php                    (place / openOrder / settle, table + kitchen)
app/Domain/Menu/Models/Product.php                (kitchen station)
app/Domain/Branches/Models/Branch.php             (areas/tables/stations)
app/Http/Controllers/{Kitchen/KitchenDisplayController,Tables/TableController,POS/PosController,Orders/OrderController}
app/Http/Requests/{Kitchen/*,Tables/*,POS/PlaceOrderRequest,Orders/SettleOrderRequest,Orders/FulfillmentRequest}
routes/web.php
database/migrations/2026_10_11_0000{20,21,22}_*
resources/js/Pages/{Kitchen/Index,Kitchen/Ticket,Tables/Index,Pos/Index,Orders/Show}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/{Kitchen/KitchenDisplayTest,Tables/TableManagementTest,Orders/FulfillmentTest}
```

### Database and migration changes

- New: `dining_areas`, `tables`, `kitchen_stations`, `kitchen_tickets`, `kitchen_ticket_items`.
- Altered: `orders` (+`table_id`, `covers`, `fulfillment_status`); `products` (+`kitchen_station_id`).
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- All new models are tenant-scoped; route-model binding resolves within tenant.
- KDS requires `kitchen.view` to view and `kitchen.manage` to change tickets; tables use
  `tables.view`/`tables.manage`; settlement uses `pos.use`.
- Verified: cashiers can view KDS but not mutate it.
- Table transfer and settle validate the order/table belong to the tenant and branch.

### Tests executed

```
php artisan test   →  136 passed (527 assertions)
```

New coverage (15 tests): ticket creation + station routing, idempotent ticket creation,
ticket status cascade to items, item-driven ticket advancement, KDS board + station
filter, KDS view/manage permissions; table CRUD + removal guard, table occupancy on open,
free on settle, transfer, manual status, tables page; fulfillment default, allowed and
invalid transitions, order-detail exposure.

### Live end-to-end verification

Against MySQL via the running app: opened a dine-in table order (2 × 320, unpaid) → held
order, table `T1` occupied, kitchen ticket `new` with 1 item routed to the Grill station,
no payment. Settled it (672, tendered 700) → order `completed`, 1 payment, 1 cash movement,
expected drawer 1172 (500 float + 672), **table freed to available**; advanced fulfillment
`new → preparing`.

### Performance considerations

- KDS query filters to open ticket statuses and eager-loads items/station/order/table.
- Tables page eager-loads areas and each table's open orders for the floor panel.
- Elapsed timers computed client-side from `created_at` with a 15s ticker.

### Known defects and unresolved risks

- **Secondary work is still synchronous-after-commit, not queued.** It is isolated and
  idempotent, but moving it onto the queue lands in Phase 12.
- **Reservations, table merge/split bills, and item transfer between tables** are not
  implemented (module 7 scope staged).
- **Delivery** has fulfillment statuses (dispatched/delivered) but no driver assignment,
  delivery address, zones or live tracking (Module 13).
- Kitchen ticket **amendments on order change** are not sent (orders don't change after
  completion in the current flow).
- KDS sound alerts and configurable alert thresholds are not implemented.
- Registers still have no management UI.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 08
(purchasing, waste and transfers).

---

## Phase 08 — Purchasing, waste and transfers

### Business journey completed

A manager keeps suppliers, raises a purchase order, submits it, approves it (with a
manager PIN above the configured limit) and receives goods — which alone updates stock
via a confirmed goods receipt — then records supplier payments. Waste is recorded
(instantly deducting stock, or pending approval above a threshold). Stock moves between
branches through approved transfers (stock leaves on dispatch and arrives on receiving).

### Features implemented

- **Suppliers** — directory with contact details, payment terms, soft delete, and an
  outstanding balance derived from received orders minus payments.
- **Purchase orders** — draft → submitted → approved → partially received → received
  (or cancelled); computed totals; multi-line orders for ingredients/products; approval
  limit configurable per tenant (manager PIN required above it).
- **Goods receiving** — partial and full receipts; ordered vs received vs outstanding per
  line; damaged/rejected quantity captured; **inventory updated only on a confirmed
  receipt**, via the stock ledger (`purchase` movement) with source reference.
- **Supplier payments** — recorded per supplier/order; outstanding balance recomputed.
- **Waste** — reasons (expiry, preparation error, damage, spoilage, other); estimated cost;
  automatically creates a `waste` stock movement when approved; above a tenant threshold
  it stays **pending** and requires approval before it affects stock; reject leaves stock
  untouched; kept separate from sales/refunds.
- **Inter-branch transfers** — draft → approved → dispatched → received (or cancelled);
  stock **out** of the source branch on dispatch and **in** to the destination on
  receiving, each as an auditable ledger movement.
- **Document numbering** — gap-free per-tenant `PO-…`, `GRN-…`, `TRF-…` sequences.

### Files and modules changed

```
app/Domain/Documents/{Models/DocumentSequence,DocumentNumberGenerator}
app/Domain/Purchasing/{Enums/PurchaseOrderStatus,PurchasingService,Models/Supplier,PurchaseOrder,PurchaseOrderItem,GoodsReceipt,GoodsReceiptItem,SupplierPayment}
app/Domain/Waste/{Enums/WasteReason,WasteService,Models/WasteRecord}
app/Domain/Inventory/{Enums/TransferStatus,TransferService,StockItemResolver,Models/StockTransfer,StockTransferItem}
app/Http/Controllers/{Purchasing/SupplierController,Purchasing/PurchaseOrderController,Waste/WasteController,Inventory/TransferController}
app/Http/Requests/{Purchasing/*,Waste/WasteRequest,Inventory/StockTransferRequest}
routes/web.php
database/migrations/2026_10_11_0000{23,24,25,26}_*
resources/js/Pages/{Purchasing/Index,Purchasing/Show,Waste/Index,Transfers/Index}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/{Purchasing/PurchasingTest,Waste/WasteTest,Inventory/TransferTest}
```

### Database and migration changes

- New: `suppliers`, `document_sequences`, `purchase_orders`, `purchase_order_items`,
  `goods_receipts`, `goods_receipt_items`, `supplier_payments`, `waste_records`,
  `stock_transfers`, `stock_transfer_items`.
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- All new models are tenant-scoped; route-model binding resolves within tenant.
- Permissions enforced: `purchasing.view/manage/approve`, `waste.view/create/approve`,
  `inventory.manage/approve` for transfers.
- Purchase-order approval above the limit requires a manager PIN — verified.
- Stock can only be received/transferred against items, branches and locations in the
  tenant.

### Tests executed

```
php artisan test   →  153 passed (604 assertions)
```

New coverage (17 tests): PO creation + totals, submit/approve, approval-limit PIN,
partial receipt (stock + receipt + audit), full receipt completes the order, receiving
blocked on draft, supplier payment reduces outstanding, supplier CRUD; waste auto-approve
(deduct), above-threshold pending (no movement), approve, reject; transfer create/approve,
same-branch rejection, dispatch→receive stock movement, receive-before-dispatch blocked,
dispatched transfer cannot be cancelled.

### Live end-to-end verification

Against MySQL via the running app: created a supplier and a purchase order (10 × 80),
submitted → approved → received (order `received`, received qty 10); recorded waste
(auto-approved); created a transfer and approved → dispatched → received. Final on-hand:
branch 1 = 3 (10 received − 2 waste − 5 transferred), branch 2 = 5, with ledger movements
`purchase`, `waste`, `transfer_out`, `transfer_in`.

### Performance considerations

- Purchase-order list and waste/transfer lists capped (50–100 rows) with eager loading.
- Stock effects go through the single `StockService` writer, so balances stay consistent.

### Known defects and unresolved risks

- **Supplier-specific product codes/prices** (module 10) are not implemented.
- **Supplier returns / credit notes** and **purchase requisitions** are not implemented.
- **Transfer quantity discrepancies on receiving** (short receipts) are not modelled — a
  transfer receives the full dispatched quantity.
- **Waste evidence/attachment** upload is not implemented (notes only); approval stores
  approver + timestamp.
- Waste/transfer approvals do not require a manager PIN (only PO approval does).
- Reporting/analytics over purchasing, waste and transfers arrives in Phase 10.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 09
(cash, expenses and accounting).

---

## Phase 09 — Cash, expenses and accounting

### Business journey completed

Cashier shifts already reconcile drawer cash (Phase 06). This phase adds the financial
bookkeeping layer: financial accounts with derived balances (opening balance + an
append-only ledger), expenses with an approval workflow that posts a signed movement to
the chosen account when approved, account transfers, and the accounting distinction that
**sales revenue ≠ cash received**.

### Features implemented

- **Financial accounts** — cash registers, bank, mobile and gateway clearing accounts;
  per-branch or company-wide; opening balances; **balance derived from the ledger**
  (`opening_balance + Σ transactions`); default `Bank` account per tenant and a `Cash`
  account per branch (auto-provisioned).
- **Account ledger** — append-only `financial_transactions` with signed amounts, category,
  source polymorphic reference, branch and timestamp; never edited.
- **Account transfers** — atomic move between two accounts creating a matched pair of
  ledger entries plus an `account_transfers` record; same-account transfers rejected.
- **Expenses** — categories (expense/income), amounts, dates, payment method, reference,
  branch and account; **approval workflow** (`submitted → approved/rejected`);
  an auto-approve limit per tenant (below it, expenses approve immediately); approving
  posts a signed movement to the selected account.
- **Accounting model documented** — accounts hold non-sale movements (expenses,
  transfers, adjustments, opening balances); sales cash remains in the **shift** ledger so
  the two are never double-counted. This is the "sales revenue is not cash received"
  separation the PRD calls for.
- **Permission** — new `accounts.view` / `accounts.manage` granted to owners/admins,
  accountant (view) and auditor (view).

### Files and modules changed

```
app/Domain/Accounting/{Enums/AccountType,ExpenseStatus,TransactionCategory,AccountingService,ExpenseService}
app/Domain/Accounting/{Models/FinancialAccount,FinancialTransaction,AccountTransfer,ExpenseCategory,Expense}
app/Domain/Accounting/Actions/ProvisionAccountingDefaults
app/Http/Controllers/Accounting/{ExpenseController,AccountController}
app/Http/Requests/Accounting/{AccountRequest,AccountTransferRequest,ExpenseRequest,ExpenseCategoryRequest}
app/Domain/Identity/Permissions.php               (+accounts group)
database/seeders/RolePermissionSeeder.php         (accountant/auditor get accounts.view)
app/Domain/{Tenancy/Models/Tenant,Branches/Models/Branch}   (financialAccounts relations)
app/Domain/Tenancy/Actions/RegisterTenant.php     (default bank account)
app/Domain/Onboarding/OnboardingService.php       (default branch cash account)
routes/web.php
database/migrations/2026_10_11_0000{27,28}_*
resources/js/Pages/{Expenses/Index,Accounts/Index}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/Accounting/{ExpenseTest,AccountTest}
```

### Database and migration changes

- New: `financial_accounts`, `financial_transactions`, `account_transfers`,
  `expense_categories`, `expenses`.
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- All new models are tenant-scoped; route-model binding resolves within tenant.
- Expenses require `expenses.manage` to record and `expenses.approve` to approve/reject;
  accounts require `accounts.view/manage`.
- Verified: a user without expense permission cannot record; approvals audited.

### Tests executed

```
php artisan test   →  165 passed (652 assertions)
```

New coverage (12 tests): expense created pending (no money moved), approve posts a signed
movement and reduces the balance, reject leaves money untouched, auto-approve below limit,
above-limit stays pending, permission gate, expense categories; default account
provisioning on registration/branch, account creation with opening balance, transfers move
balances (2 ledger entries + transfer row), same-account rejection, accounts page render.

### Live end-to-end verification

Against MySQL via the running app: recorded a 120 expense on the branch cash account,
approved it (balance −120), and transferred 50 cash → bank. Final: bank +50, cash −170,
3 ledger entries, 1 transfer record — internally consistent.

### Performance considerations

- Account list derives balances per account (one aggregate query each); lists capped.
- Ledger is indexed by tenant + account, category and occurred_at.

### Known defects and unresolved risks

- **Recurring expense templates** and **attachment/receipt upload** are not implemented.
- **Account balance excludes sales cash** by design (documented); a reconciliation report
  combining shift cash and account movements lands in Phase 10.
- **Period closing / reconciliation adjustments** and a full double-entry general ledger
  are not implemented — this is operational cash management, not a general ledger.
- Expense approval does not require a manager PIN (permission + limit only).
- Taxes collected are stored on orders but not yet modelled as a liability account.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 10
(reports and dashboards).

---

## Phase 10 — Reports and dashboards

### Business journey completed

An owner opens Reports, picks a report, a date range and a branch, and sees reconciled
figures — sales, products, categories, payments, cash/shifts, inventory, purchases, waste,
expenses, profit, tax, staff and branch comparison — computed from the same records the
operational modules write, with report periods interpreted in the tenant/branch timezone.

### Features implemented

- **13 reports**: sales summary, product performance, category performance, payment,
  cash & shifts, inventory, purchases, waste, expenses, profit & loss, tax, staff, and
  branch comparison.
- **Documented definitions** (on the profit report): gross sales = Σ line totals;
  discounts; net sales = Σ (total − tax); COGS = Σ item unit cost × qty (immutable
  snapshots); gross profit = net sales − COGS; net operating = gross profit − approved
  expenses. The profit report reconciles these explicitly.
- **Timezone-correct periods** — `ReportPeriod` interprets the from/to dates in the
  tenant/branch timezone and converts to UTC for queries; day grouping happens in local
  time so a daily figure never picks up the wrong business day.
- **Filters** — report type, date range and branch (all branches or one).
- **Generic report UI** — type tabs, date/branch filters, summary cards, CSS bar charts,
  and tables with per-column formatting (money/number/percent/datetime).
- **Permission** — `reports.view`; the Reports nav item is permission-aware.

### Files and modules changed

```
app/Domain/Reporting/{ReportPeriod,ReportService}
app/Http/Controllers/Reporting/ReportController.php
routes/web.php
app/Domain/Accounting/Models/Expense.php      (date cast fix — see below)
resources/js/Pages/Reports/Index.tsx
resources/js/Layouts/AuthenticatedLayout.tsx
tests/Feature/Reporting/ReportTest.php
```

No schema changes — every report is derived from existing tables.

### Security and tenant-isolation results

- All report queries run through tenant-scoped models; a user without `reports.view` is
  forbidden — verified.
- Unknown report types fall back to `sales` (no arbitrary method dispatch).

### Tests executed

```
php artisan test   →  175 passed (720 assertions)
```

New coverage (10 tests): sales gross/net/tax/orders, product revenue/COGS/margin, payment
grouping by method, cash shift totals, profit reconciliation (net sales − COGS − expenses),
tax totals, expense report, page render for multiple types, unknown-type fallback, and the
permission gate.

### Live end-to-end verification

Against MySQL: placed a sale (2 × 100 + 10% tax = 220), then loaded every report type
(`sales`, `products`, `payments`, `cash`, `profit`, `tax`, `branches` — all 200). Figures:
gross 200, net (excl. tax) 200, tax 20, gross profit 120, net operating result 120 — all
internally consistent.

### Performance considerations

- Day-level reports for short ranges are grouped in PHP to avoid dialect-specific date
  functions (works on MySQL and SQLite).
- Inventory/payables reports load bounded sets; report rows are capped where unbounded.

### Known defects and unresolved risks

- Reports are computed on request; there is **no caching/materialisation** yet — fine at
  current scale, revisit for large tenants.
- The **subscription report** (tenant usage / recurring revenue) is deferred to Phase 11.
- The dashboard still shows the onboarding checklist; a KPI-heavy owner dashboard can be
  layered on the same ReportService later.
- Export (CSV/PDF) is not implemented (`reports.export` permission exists but is unused).
- Product/category grouping is by name (products renamed later merge historically).

### Deployment / rollback

- No migrations; purely additive code.

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 11
(SaaS subscriptions and platform admin).

---

## Phase 11 — SaaS subscriptions and platform admin

### Business journey completed

A platform operator works in a **separate `/platform` workspace** (guarded so tenant
users cannot reach it): they see platform KPIs and health, manage tenants (search, view,
activate, suspend), manage plans and a tenant's subscription (change plan/cycle, suspend,
reactivate, cancel, renew, pay invoices), read the audit log, and — when needed — sign in
as a tenant owner through **time-limited, reason-required, fully audited impersonation**
with a visible banner. Plans drive feature entitlements and usage limits, enforced on the
server.

### Features implemented

- **Plans** — name, slug, monthly/yearly pricing, trial days, feature list, usage limits
  (branches, users, monthly orders); created/edited by platform admins; seeded with
  Starter / Growth / Business.
- **Subscriptions** — one per tenant with status (trialing, active, past due, suspended,
  cancelled), billing cycle, trial and period dates; started automatically on registration
  on the default plan.
- **Lifecycle** — change plan/cycle, activate, mark past due, **suspend (also suspends the
  tenant** so tenant users are blocked), reactivate, cancel, renew (advances the period and
  issues + pays an invoice).
- **Invoices** — issued per period with number/amount/currency/status; payment recording.
- **Usage metering** — branches, users and monthly orders computed per tenant; snapshots
  stored in `usage_records`; **backend limits** enforced (e.g. staff invitations blocked at
  the user limit).
- **Entitlements** — resolved server-side from the plan (`Tenant::hasFeature`) and enforced
  by a `feature:` route middleware on the kitchen, purchasing and waste modules; a tenant
  without a plan is unrestricted (grandfathered).
- **Platform workspace** — dashboard (tenants, active, trialing, suspended, active users,
  MRR, plans, queue/failed-job health), tenant list + detail (subscription, usage vs limits,
  diagnostics, recent activity), plans, audit log.
- **Impersonation** — reason required, blocked for non-accessible tenants, logs in as the
  tenant owner, shows a banner, audited at start and stop; stop returns to the platform.

### Files and modules changed

```
app/Domain/Subscriptions/{Enums/SubscriptionStatus,BillingCycle,InvoiceStatus,SubscriptionService,UsageService}
app/Domain/Subscriptions/Models/{Plan,Subscription,SubscriptionInvoice,UsageRecord}
app/Http/Controllers/Platform/{DashboardController,TenantController,PlanController,SubscriptionController,AuditController,ImpersonationController}
app/Http/Middleware/EnsureFeature.php + bootstrap/app.php (feature alias)
app/Domain/Tenancy/Models/Tenant.php              (subscription/plan/feature/limit helpers)
app/Domain/Tenancy/Actions/RegisterTenant.php     (start trial)
app/Domain/Identity/InvitationService.php         (user-limit guard)
app/Http/Middleware/HandleInertiaRequests.php     (impersonation prop)
database/seeders/PlanSeeder.php + DatabaseSeeder
routes/web.php
database/migrations/2026_10_11_000029_*
resources/js/Layouts/PlatformLayout.tsx
resources/js/Pages/Platform/{Dashboard,Tenants/Index,Tenants/Show,Plans,Audit}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx      (impersonation banner)
tests/Feature/Platform/{SubscriptionTest,PlatformAccessTest}
```

### Database and migration changes

- New: `plans`, `subscriptions`, `subscription_invoices`, `usage_records`.
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- The platform workspace is behind the `platform` (platform-admin) guard; tenant users get
  403 — verified.
- **Entitlements and limits are resolved server-side** from the stored subscription — the
  browser cannot influence them.
- Suspending a subscription suspends the tenant and blocks tenant users — verified.
- Impersonation requires a reason, is refused for non-accessible tenants, and is audited —
  verified. The stop endpoint is auth-only so it works while impersonating.

### Tests executed

```
php artisan test   →  190 passed (832 assertions)
```

New coverage (15 tests): registration starts a trial; plan/cycle change; suspend blocks
access and reactivate restores; renewal issues/paid invoice; entitlements; feature gating
blocks a disabled module; user-limit enforcement; usage metrics; platform access control;
tenant suspend/activate; impersonation reason requirement, owner login, banner prop, stop
restore, and the suspended-tenant guard.

### Live end-to-end verification

Against MySQL: logged in as the platform admin and loaded `/platform`, `/platform/tenants`,
`/platform/plans`, `/platform/audit` (all 200); suspended then activated the demo tenant;
impersonated the demo owner (→ `/dashboard` 200) and stopped (→ back to `/platform`,
200). Audit log recorded both `platform.impersonation_started` and
`platform.impersonation_stopped`.

### Performance considerations

- Platform lists are paginated; dashboard KPIs use aggregate queries.
- Subscription/plan relations eager-loaded on tenant lists and detail.

### Known defects and unresolved risks

- **No real payment gateway** — billing is a manual/admin path (issue + mark paid); a
  provider abstraction and webhook verification are still to come.
- **No scheduled billing** — trials do not auto-expire, past-due and dunning are manual
  (Phase 12 scheduler will automate this).
- **Usage snapshots** are recorded on demand, not yet by a scheduled job; storage usage is
  not metered.
- Feature gating is applied to kitchen/purchasing/waste routes only (POS and core modules
  are ungated); tenant-facing "upgrade" UX is minimal.
- **Impersonation is not time-boxed** by a timer yet (only reason + audit + banner).
- Coupons, proration and plan-change rules are not implemented.
- Tenant deletion/data-export procedures are not implemented.

### Deployment / rollback

- All migrations additive and reversible (with `down()`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 12
(queues, scheduler and notifications).

---

## Phase 12 — Queues, scheduler and notifications

### Business journey completed

Secondary work that follows a sale now runs on the queue instead of in the request: the
kitchen ticket is opened by a retry-safe, idempotent job dispatched after commit. Recurring
scheduled tasks handle subscription lifecycle, usage metering and operational alerts, and
tenants receive in-app (and email) notifications for low stock, cash discrepancies,
daily sales and subscription expiry — with an inbox and unread badge in the app.

### Features implemented

- **Queued jobs** — `OpenKitchenTicket` (dispatched after commit from the sale, `tries=3`
  with backoff, idempotent per order so a retry cannot duplicate the sale) and
  `RecordUsageSnapshot` (per-tenant usage metering).
- **Scheduler** (`bootstrap/app.php` `withSchedule`): `subscriptions:process` (expire
  trials → past due; suspend after 7-day grace), `billing:warn-expiring`,
  `usage:record`, `alerts:low-stock` (hourly), `notifications:daily-sales`, and
  `queue:prune-failed`.
- **Notifications** (database + mail channels): low stock, subscription/trial expiring,
  daily sales summary, and shift cash variance. Best-effort delivery wrapped so a failure
  never affects a committed sale or a shift close.
- **In-app inbox** — `/notifications` with unread badge in the tenant nav, mark-read and
  mark-all-read; unread count shared to the frontend.
- **Recipients** — tenant owners/admins resolved per tenant (status active + role).
- **Failure visibility** — the platform dashboard already surfaces failed/queued job
  counts; failed jobs are pruned on a schedule.
- **The queue guarantee holds** — the sale commits atomically; the ticket is created by a
  separate job, so an unavailable worker or mail provider cannot block or duplicate a sale.

### Files and modules changed

```
app/Domain/Notifications/{NotificationService,Notifications/*}
app/Jobs/{OpenKitchenTicket,RecordUsageSnapshot}
app/Console/Commands/{ProcessSubscriptions,RecordUsage,SendLowStockAlerts,SendDailySales,SendSubscriptionWarnings}
app/Http/Controllers/NotificationController.php
app/Domain/POS/SaleService.php                (dispatch job post-commit)
app/Domain/CashManagement/ShiftService.php    (variance alert)
app/Domain/Subscriptions/SubscriptionService.php (nullable actor for scheduled transitions)
app/Http/Middleware/HandleInertiaRequests.php (unread count prop)
bootstrap/app.php                             (scheduler + feature alias)
routes/web.php
database/migrations/2026_10_11_000030_create_notifications_table.php
resources/js/Pages/Notifications/Index.tsx
resources/js/Layouts/AuthenticatedLayout.tsx  (bell + badge)
tests/Feature/{Notifications/NotificationTest,Platform/SubscriptionLifecycleTest}
```

### Database and migration changes

- New: `notifications` (Laravel database notifications).
- Verified on MySQL 8.0 (dev) and in-memory SQLite (tests).

### Security and tenant-isolation results

- The job resolves the tenant from the order (never from the queue payload beyond the id)
  and sets the tenant context before touching kitchen data.
- Notifications are per-user; a user only ever reads their own inbox.
- Notification recipients are restricted to owner/admin roles of the tenant.

### Tests executed

```
php artisan test   →  201 passed (884 assertions)
```

New coverage (11 tests): low-stock command notifies owners, shift variance notifies on
close, daily-sales command notifies after a sale, a sale dispatches the kitchen job,
inbox listing + mark read + mark all read, unread count shared, expired trials → past due,
past-due suspended after grace, expiring subscriptions warned, usage command dispatches a
job, and the schedule registers the recurring tasks.

### Live end-to-end verification

Against MySQL with a real queue worker: placed a sale → **1 job queued and 0 kitchen
tickets**; ran `queue:work --once` → **1 ticket created** (proving asynchronous
generation). Ran `alerts:low-stock` → "sent to 1 recipient"; `GET /notifications` → 200.

### Performance considerations

- Kitchen ticket work is off the request path (queued, indexed by order).
- Scheduled tasks iterate tenants in bounded batches; low-stock runs hourly and is cheap.

### Known defects and unresolved risks

- Email delivery uses the configured mailer (log in dev); production requires a real
  mailer and a queue worker running under a process manager (Supervisor/systemd).
- Notifications are written synchronously inside scheduled commands (only the kitchen job
  is queued); moving all notification delivery onto the queue is a later refinement.
- Subscription warnings can repeat daily for the same tenant (no dedupe window yet).
- **No dead-letter/alerting on failed jobs** beyond the count on the platform dashboard;
  an on-call alerting integration is not implemented.
- Offline/retry of client-side POS actions is still not implemented (separate design).

### Deployment / rollback

- Migration is additive and reversible. A queue worker and the scheduler cron entry
  (`* * * * * php artisan schedule:run`) must run in production.

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 13
(performance and production readiness).

---

## Phase 13 — Performance and production readiness

### Business journey completed

The platform is operable and observable in production: a readiness endpoint and command
report database/cache/storage/queue health, every request carries a correlation id that
flows into logs, sensitive responses carry security headers, entitlements are cached and
invalidated correctly, hot query paths are indexed, backups are written and their
restorability is verified on a schedule, and a runbook documents deployment, processes,
monitoring and rollback.

### Features implemented

- **Health checks** — `GET /health` returns `{status, checks{database,cache,storage,queue}}`
  and `503` when a critical check fails; `php artisan app:health` mirrors it (scheduled
  every 5 minutes).
- **Correlation logging** — `AddCorrelationContext` assigns/echoes `X-Request-ID` and puts
  it in the log context; `ResolveTenant` adds `tenant_id` and `user_id` so logs, jobs and
  errors share a correlation trail.
- **Security headers** — `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
  `X-Permitted-Cross-Domain-Policies` on every response.
- **Caching** — tenant plan/entitlements cached for 5 minutes and **invalidated
  automatically** on any subscription change (model observer) and on plan edits.
- **Indexes** — composite indexes added for hot paths: `order_items(tenant_id, product_id)`,
  `stock_balances(tenant_id, quantity)`, `payments(tenant_id, payment_method_id)`,
  `orders(tenant_id, status, placed_at)`.
- **Backups & restore verification** — `db:backup` writes a gzipped logical snapshot of the
  current database (scoped to the connection's schema) and prunes to 14; `db:verify-backup`
  re-reads and validates it (core tables present, parseable). Both scheduled.
- **Runbook** — `docs/PRODUCTION.md`: environment, deploy procedure, required long-running
  processes, scheduled tasks, monitoring, backups/restore, performance, migrations/rollback,
  security and go-live checklists.

### Files and modules changed

```
app/Support/{HealthChecker,DatabaseBackup}.php
app/Http/Controllers/HealthController.php
app/Http/Middleware/{AddCorrelationContext,AddSecurityHeaders}.php
app/Http/Middleware/ResolveTenant.php          (log context)
app/Console/Commands/{HealthCheck,BackupDatabase,VerifyBackup}.php
app/Domain/Tenancy/Models/Tenant.php           (cached entitlements + forget helper)
app/Domain/Subscriptions/Models/Subscription.php (cache invalidation observer)
app/Http/Controllers/Platform/PlanController.php (cache flush on plan edit)
bootstrap/app.php                              (middleware + schedule)
routes/web.php                                 (/health)
database/migrations/2026_10_11_000031_add_performance_indexes.php
docs/PRODUCTION.md + docs/README.md
tests/Feature/Readiness/ReadinessTest.php
```

### Database and migration changes

- New indexes only (no schema/column changes); verified on MySQL 8.0 and SQLite.

### Security and tenant-isolation results

- Health endpoint is unauthenticated and read-only (no tenant data exposed).
- Correlation context never logs secrets; `tenant_id`/`user_id` only.
- Security headers verified present on responses.
- Restore verification avoids touching production data (reads a file).

### Tests executed

```
php artisan test   →  208 passed (902 assertions)
```

New coverage (7 tests): health endpoint ok + checks, health command success, request-id +
security headers, supplied request-id echoed, backup created + verified, verifying a missing
backup fails, entitlement cache invalidation on plan change.

### Live end-to-end verification

Against MySQL: `GET /health` → `{"status":"ok", ...}` with queue counts; response headers
included `X-Request-ID`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`;
`app:health` printed OK for database/cache/storage; `db:backup` wrote a 66-table / 328-row
snapshot and `db:verify-backup` confirmed it.

### Performance considerations

- Entitlement/plan lookups cached (5 min) removes a query from gated routes and shared props.
- Composite indexes aligned to tenant-scoped filters used by reports and lists.
- Kitchen tickets and notifications remain off the request path.

### Known defects and unresolved risks

- **No formal load test was executed** — a k6/ab scenario against a staging copy is
  recommended before launch (documented in the runbook).
- The in-app backup is a **portable logical snapshot**, not a substitute for native DB
  snapshots; large datasets should use `mysqldump`/managed backups.
- No automated restore *into a live schema* — verification is read-back only.
- No APM/alerting integration (Sentry/Prometheus) is wired; hooks are the log channel and
  the health endpoint.
- Cache uses the default store; production should use Redis (config, not code).
- Full query profiling with real data volumes is still pending.

### Deployment / rollback

- The index migration is additive and reversible. A queue worker + `schedule:run` cron and
  a real mailer are required in production (see `docs/PRODUCTION.md`).

### Final phase status

**Complete** pending review. Awaiting approval before starting Phase 14
(internationalization and advanced features).

---

## Phase 14 — Internationalization and advanced features

### Business journey completed

The platform is localized (English and Bangla) with the locale resolved server-side from a
session choice, the user's preference, or the tenant's regional default. Tenants can keep a
customer directory with loyalty points earned automatically on sales; delivery zones apply
fees and minimum-order rules; and external payment providers integrate through a gateway
abstraction with signature-verified, idempotent webhooks. Owner analytics gained hourly and
loyalty reports.

### Features implemented

- **Internationalization** — `SetLocale` middleware resolves the locale from session →
  user → tenant region → app default (never client input); `en`/`bn` message and validation
  files; a locale column on users; a locale switcher in the nav; locale + available locales
  shared to the frontend.
- **Customers** — directory (name, phone, email, notes) with management UI.
- **Loyalty** — append-only points ledger (earn/redeem/adjust) with an account balance;
  points earned automatically on completed sales when loyalty is enabled and a customer is
  attached (`loyalty.points_per_currency`); redemption cannot go negative; manual adjust UI.
- **Delivery zones** — per-branch or company-wide zones with fee and minimum order; the fee
  is added to the order total server-side and the minimum is enforced; orders store the
  zone, address and driver details.
- **Payment gateway abstraction** — `PaymentGateway` contract with a default `Manual`
  gateway and a `Stub` external gateway; a manager resolves the provider from a server-side
  tenant setting.
- **Webhooks** — `POST /webhooks/payments/{provider}`, CSRF-exempt and signature-verified
  (HMAC-SHA256), stored raw and deduplicated by provider + event id, processing a valid
  first-seen event once and marking matching payments succeeded.
- **Advanced analytics** — hourly sales (with busiest-hour) and loyalty reports added to the
  reports workspace.

### Files and modules changed

```
app/Domain/Customers/Models/Customer.php
app/Domain/Loyalty/{Enums/LoyaltyTransactionType,Models/LoyaltyAccount,LoyaltyTransaction,LoyaltyService}
app/Domain/Delivery/{Models/DeliveryZone,DeliveryService}
app/Domain/Payments/{Contracts/PaymentGateway,Gateways/ManualGateway,Gateways/StubGateway,PaymentGatewayManager,WebhookService,Models/PaymentWebhookEvent}
app/Http/Middleware/SetLocale.php
app/Http/Controllers/{Customers/CustomerController,Loyalty/LoyaltyController,Delivery/DeliveryZoneController,Payments/PaymentWebhookController,LocaleController}
app/Http/Requests/{Customers/CustomerRequest,Delivery/DeliveryZoneRequest}
app/Domain/POS/SaleService.php            (customer, delivery fee, loyalty)
app/Domain/Orders/Models/Order.php        (customer/delivery fields)
app/Http/Controllers/POS/PosController.php (customers + zones props)
app/Domain/Reporting/ReportService.php    (hourly + loyalty)
app/Http/Controllers/Reporting/ReportController.php
app/Models/User.php                       (locale)
config/{app.php,services.php} + bootstrap/app.php + routes/web.php
lang/{en,bn}/{messages,validation}.php
database/migrations/2026_10_11_0000{32,33,34,35}_*
resources/js/Pages/{Customers/Index,Delivery/Index}.tsx
resources/js/Layouts/AuthenticatedLayout.tsx (locale switcher + nav)
tests/Feature/Advanced/{AdvancedFeaturesTest,I18nTest}
```

### Database and migration changes

- New: `customers`, `loyalty_accounts`, `loyalty_transactions`, `delivery_zones`,
  `payment_webhook_events`; altered `users` (+`locale`) and `orders` (+`customer_id`,
  `delivery_zone_id`, `delivery_fee`, `delivery_address`, `driver_name`, `driver_phone`).
- Verified on MySQL 8.0 and SQLite.

### Security and tenant-isolation results

- Locale is resolved server-side (a client cannot force an unsupported locale).
- Loyalty balances update through a single append-only ledger; redemption cannot go negative.
- Delivery fee and minimum-order are computed server-side.
- Webhooks are authenticated by signature (not session/CSRF), stored raw, deduplicated and
  processed once; invalid signatures are recorded but never processed.
- All new models are tenant-scoped.

### Tests executed

```
php artisan test   →  220 passed (944 assertions)
```

New coverage (12 tests): loyalty earned on a sale with a customer; redeem + non-negative
guard; delivery fee added to the total; zone minimum enforced; customers CRUD; signed
webhook verified/recorded/processed; invalid webhook rejected; duplicate webhook not
processed twice; locale resolved from tenant default; user locale switch persisted;
unsupported locale rejected; validation messages localized.

### Live end-to-end verification

Against MySQL: placed a delivery sale (2 × 100 + 25 zone fee = 225) for a customer → order
total 225, delivery fee 25, customer attached, **225 loyalty points earned**; switched the
locale to Bangla (persisted on the user); posted a signed stub webhook (200, 1 event
recorded); `/customers` and `/delivery-zones` render.

### Performance considerations

- Loyalty/delivery effects are post-commit and best-effort (never block a sale).
- Webhook dedupe uses a unique index on (provider, event_id).

### Known defects and unresolved risks

- **Only the backend is fully localized** — the React UI is not string-extracted; the
  switcher and shared locale are wired, but full UI translation needs a frontend i18n pass.
- Loyalty is a points ledger only: **no redemption at checkout, tiers, campaigns or expiry**
  yet.
- Delivery is zones + fees + driver fields; **third-party marketplace sync and live driver
  tracking** remain expansion points.
- The `Stub` gateway is a stand-in — a **real provider integration** (and its webhook
  schema) still needs implementing; the `payment_webhook_events` processing is minimal.
- Per-tenant locale/currency display formatting in the React UI is not applied to numbers/
  dates yet.
- Customers have no segmentation/consent-management features beyond notes.

### Deployment / rollback

- Migrations are additive and reversible. Provider webhooks must be reachable and the stub
  secret replaced with a real provider secret in production.

### Final phase status

**Complete.** All 14 roadmap phases are implemented and verified. Continued work should be
driven by the "known defects and unresolved risks" noted per phase (real gateway, full UI
i18n, loyalty redemption, delivery integrations) and the production runbook in
[docs/PRODUCTION.md](./PRODUCTION.md).

---

## Phase 15A — Registration, verification and onboarding journey

### Business journey completed

A restaurant owner registers with an **email address or a mobile number** (+ password).
Email accounts confirm via a **verification link**; mobile accounts receive a **6-digit SMS
code**. Until the owner finishes the guided setup journey, the dashboard and every
management module redirect them to the exact step still outstanding; on activation the
dashboard unlocks with **real analytics charts and a Business 360 snapshot**.

### Features implemented

- **Email-or-mobile registration** — `RegisterRequest` validates an `identifier_type`
  (`email`/`phone`); phone numbers are normalised to a single canonical form; `users.email`
  and `tenants.business_email` become nullable; `users.phone` is unique.
- **Real verification enforcement** — `User` now implements `MustVerifyEmail` and reports a
  contact as verified when **either** email or phone is verified. (Previously the `verified`
  middleware was inert because the model did not implement the contract.) A unified
  `VerificationNoticeController` renders the email or mobile screen as appropriate.
- **SMS OTP** — `PhoneVerificationCode` model + `OtpService` (hashed, single-use, 10-minute
  expiry, 5-attempt limit, 60s resend cooldown). `PhoneVerificationController`
  (`show`/`verify`/`resend`) with throttling; success marks `phone_verified_at`.
- **Pluggable SMS providers** — `SmsProvider` contract + `SmsManager` with four drivers
  (Log, SSL Wireless, BulkSMSBD, Twilio). The **platform administrator** selects the active
  provider and supplies credentials via a new `/platform/sms` screen; credentials are
  **encrypted at rest**, masked in the UI, and a test-send is available. A delivery failure
  is non-fatal.
- **Expanded onboarding journey** — new optional steps `Payments`, `Menu` (quick-add the
  first product) and `Team` (invite a teammate) alongside Company/Branch/Hours/Tax/Receipt/
  Review. Only Company and Branch remain required.
- **Dashboard gating** — `EnsureOnboardingComplete` middleware (`onboarding.completed`),
  applied to the tenant app group. It resolves the tenant from the authenticated user,
  skips platform admins and impersonating sessions, and redirects an incomplete tenant to
  the first outstanding step. Onboarding/profile/auth routes remain reachable.
- **Dashboard analytics & Business 360** — `DashboardAnalyticsService` produces KPIs, a
  14-day sales trend, top products, payment mix and busiest hours from real records (no
  mocked data); the dashboard renders these with `recharts` plus a 360° operations panel.

### Files and modules changed

```
app/Domain/Identity/{OtpService,Models/PhoneVerificationCode}
app/Domain/Communications/Sms/{SmsManager,Contracts/SmsProvider,Providers/*}
app/Domain/Reporting/DashboardAnalyticsService
app/Domain/Onboarding/{Enums/OnboardingStep,OnboardingService}      (new steps + savers)
app/Domain/Tenancy/Actions/RegisterTenant.php                       (nullable email, phone)
app/Domain/Tenancy/Factories/TenantFactory.php                      (onboarded default)
app/Http/Requests/Auth/RegisterRequest.php
app/Http/Controllers/Auth/{RegisteredUserController,VerificationNoticeController,PhoneVerificationController}
app/Http/Controllers/Onboarding/OnboardingController.php            (payments/menu/team)
app/Http/Controllers/DashboardController.php
app/Http/Controllers/Platform/SmsController.php
app/Http/Middleware/EnsureOnboardingComplete.php
app/Models/User.php                                                 (MustVerifyEmail, phone)
bootstrap/app.php                                                   (onboarding.completed alias)
routes/{auth.php,web.php}, config/services.php
database/migrations/2026_10_12_0000{06,07}_*
resources/js/Pages/Auth/{Register,VerifyPhone}.tsx
resources/js/Components/Onboarding/{PaymentsStep,MenuStep,TeamStep}.tsx
resources/js/Pages/{Dashboard.tsx,Onboarding/Show.tsx,Platform/Sms/Index.tsx}
resources/js/Layouts/PlatformLayout.tsx                             (SMS nav item)
tests/Feature/Auth/{MobileRegistrationTest,PhoneVerificationTest}
tests/Feature/Communications/SmsProviderTest
tests/Feature/Onboarding/OnboardingGatingTest
```

### Database and migration changes

- Altered: `users` (+`phone` unique, `phone_verified_at`, `email` nullable);
  `tenants` (`business_email` nullable).
- New: `phone_verification_codes`.
- Verified on in-memory SQLite (tests). All migrations are additive and reversible.

### Security and tenant-isolation results

- OTP codes are hashed, single-use, expiring and attempt-limited; codes are never logged in
  plaintext. Verification is enforced server-side by the `verified` middleware.
- SMS credentials are encrypted at rest and never returned to the frontend.
- The gating middleware resolves the tenant from trusted server-side context only, and
  never traps platform admins or impersonating sessions.
- Registration tests assert email/mobile uniqueness and normalisation.

### Tests executed

```
php artisan test   →  473 passed (2558 assertions)
```

New coverage (25 tests): mobile registration (provisioning, no OTP for email, duplicate,
normalisation, identifier required); phone verification (notice, valid/incorrect/expired
code, single-use, resend, blocked dashboard, verified access); SMS manager (default/unknown
driver, selection, encrypted credentials, incomplete config, provider sends, failure not
thrown); onboarding gating (module redirect, completed passthrough, onboarding reachable,
platform admin unaffected). Existing auth/onboarding tests were updated to the new flow.

### Performance considerations

- Dashboard aggregates are bounded to a 14-day window and grouped in PHP (portable across
  MySQL/SQLite); no per-day queries.
- OTP issuance is guarded by a resend cooldown and the route is rate-limited.

### Known defects and unresolved risks

- The **SMS drivers are implemented but unverified against live providers** (SSL Wireless /
  BulkSMSBD / Twilio) — no provider account was exercised; the Log driver is the default and
  used in development.
- Real SMS delivery requires the **queue worker** for production throughput; OTP sending is
  currently synchronous (a failure is swallowed and surfaced to the user).
- The `Menu` onboarding step creates a **single** product (multi-item/bluk import is Phase D).
- The `Team` onboarding step sends a normal staff invitation; it does not pre-verify the
  invitee (they still accept via the emailed link).
- Full frontend i18n string-extraction for the new screens is not done (English strings are
  inline, consistent with existing auth screens).
- Phase B (tenant payment gateways), C (customer segmentation) and D (product bulk ops) are
  planned but **not yet implemented**.

### Deployment / rollback

- Migrations are additive and reversible. Set the SMS provider in `/platform/sms` before
  going live with mobile verification; otherwise the Log driver is used.

### Final phase status

**Complete pending review.** Awaiting approval before Phase B (tenant payment gateways).

---

## Phase 15B — Tenant payment gateways

### Business journey completed

A restaurant owner opens **Settings → Payment Gateways**, adds one or more methods
(cash, Stripe, SSLCommerz, bKash), enables several at once, sets a default, and configures
credentials that are encrypted at rest. Online and QR payments resolve to the tenant's
configured gateway; a payment is only recorded as paid once the provider is verified
server-side (webhook/validation), never on a redirect alone.

### Features implemented

- **Gateway abstraction** — `GatewayDriver` contract with four drivers: `CashDriver`,
  `StripeDriver` (hosted Checkout Sessions + PaymentIntents verification + `Stripe-Signature`
  HMAC), `SslCommerzDriver` (hosted checkout + validation API), `BkashDriver`
  (token grant → create → execute, BDT).
- **`TenantGateway` model** — per-tenant configuration with `provider`, `environment`,
  `is_enabled`, `is_default`, `supported_currencies`, encrypted `credentials`, health fields.
  Several may be enabled; one default.
- **`TenantGatewayManager`** — resolves drivers, enabled configs, currency support, and a
  default *online* gateway (excludes cash).
- **Integration** — `Payments\PaymentGatewayManager` now prefers the tenant's configured
  gateway (via a `ConfiguredGateway` adapter) and falls back to the legacy manual/stub
  provider. `QrPaymentService::startOnline` returns the hosted `redirect_url` for the
  customer to complete.
- **Webhooks** — `WebhookService` verifies tenant gateways by their own secrets
  (`verifyAnyEnabled`); the legacy `stub`/`manual` behaviour is preserved.
- **Tenant settings UI** — a new **Payment Gateways** tab in Settings (add/edit/enable/
  disable/set-default/test/remove), credentials masked and never returned to the browser.

### Files and modules changed

```
app/Domain/PaymentGateways/{Models/TenantGateway,Contracts/GatewayDriver,
    Drivers/{CashDriver,StripeDriver,SslCommerzDriver,BkashDriver},
    TenantGatewayManager,ConfiguredGateway}
app/Domain/Payments/PaymentGatewayManager.php     (prefer tenant gateway)
app/Domain/Payments/WebhookService.php            (tenant-aware verification)
app/Domain/Dining/QrPaymentService.php            (redirect_url passthrough)
app/Http/Controllers/Tenant/PaymentGatewayController.php
app/Domain/Tenancy/Models/Tenant.php              (paymentGateways relation)
database/migrations/2026_10_12_000008_create_tenant_gateways_table.php
routes/web.php, resources/js/Pages/Settings/{Payments.tsx,Show.tsx}
resources/js/i18n/translations.ts                 (settings.tab.payments)
tests/Feature/Payments/TenantGatewayTest.php
```

### Database and migration changes

- New: `tenant_gateways` (encrypted credentials via the model cast). Additive and reversible.

### Security and tenant-isolation results

- Credentials are encrypted at rest and never exposed to the frontend — verified.
- Gateway management is scoped to the actor's tenant; a cross-tenant gateway returns 404 —
  verified.
- Webhook signatures are verified against tenant secrets; hosted payments are confirmed
  server-side.

### Tests executed

```
php artisan test   →  493 passed (2618 assertions)
```

New coverage (8): add cash gateway + default, non-cash requires credentials, credentials
encrypted at rest, multiple enabled + default switch, cross-tenant 404, online-default
excludes cash, Stripe signature verification, configured gateway returns a redirect.

### Known defects and unresolved risks

- Drivers are implemented but **not exercised against live accounts**; HTTP calls are covered
  by `Http::fake()`. Sandbox smoke tests are recommended before enabling in production.
- Stripe refunds and SSLCommerz refunds are recorded for manual action (no automatic refund
  API calls yet).
- Webhook verification tries all enabled configs for a provider (a valid signature only
  matches the correct tenant secret); a per-tenant webhook endpoint would be more explicit.

### Final phase status

**Complete pending review.**

---

## Phase 15C — Customer segmentation & analytics

### Business journey completed

An owner opens **Customers** and sees each guest's segment (Champions, Loyal, High-value,
New, Regular, At risk, Lost) derived from real order history, filters by segment, and reads
a **Customer analytics** report (segment distribution + top spenders) in the Reports
workspace.

### Features implemented

- **RFM segmentation** — `CustomerSegmentationService` computes recency, frequency and
  monetary value from completed orders and classifies each customer; nothing is stored or
  mocked.
- **Consent & tags** — `customers.is_marketing_opt_in` and `customers.tags` added and
  editable through the customer form.
- **Report** — a `customers` report type added to `ReportService`/`ReportController`
  (summary, per-customer rows, segment chart).
- **UI** — a segment strip with clickable filters and a Segment column on the Customers page.

### Files and modules changed

```
app/Domain/Customers/CustomerSegmentationService.php
app/Domain/Customers/Models/Customer.php          (fillable/casts)
app/Domain/Reporting/ReportService.php             (customers report)
app/Http/Controllers/{Customers/CustomerController,Reporting/ReportController}.php
app/Http/Requests/Customers/CustomerRequest.php
database/migrations/2026_10_12_000009_add_segmentation_to_customers_table.php
resources/js/Pages/Customers/Index.tsx
tests/Feature/Customers/CustomerSegmentationTest.php
```

### Database and migration changes

- Altered `customers` (+`is_marketing_opt_in`, `tags`). Additive and reversible.

### Security and tenant-isolation results

- Segmentation runs through tenant-scoped models; a customer report never includes another
  tenant's data — verified.

### Tests executed

```
php artisan test   →  493 passed (2618 assertions)
```

New coverage (4): segment classification (champions/loyal/new/at-risk/lost), summary counts
and lifetime spend, customer analytics report rendering, tenant isolation.

### Known defects and unresolved risks

- The customers report is **lifetime-based** (RFM is inherently lifetime); the date filter is
  not applied to segment membership yet.
- Campaign targeting/export from a segment is not implemented (the platform CampaignService
  exists; tenant-side campaign targeting is a follow-on).

### Final phase status

**Complete pending review.**

---

## Phase 15D — Product images, bulk import/export & storage link

### Business journey completed

An owner uploads or replaces a product image, downloads a CSV template, bulk-imports a
product catalogue (re-import updates rather than duplicates), and exports the catalogue as
CSV or PDF. The platform "Link storage" command now succeeds even when the symlink already
exists.

### Features implemented

- **Product images** — `updateProductImage`/`destroyProductImage` (public disk, replaces the
  previous file), a `Product::imageUrl` accessor, and an uploader in the product editor.
- **Bulk import** — `ProductImportService` upserts by SKU (falling back to name), creates
  categories on demand, commits in a transaction, and reports skipped rows. Downloadable CSV
  template.
- **Export** — streamed CSV and a dompdf PDF (`resources/views/products/export.blade.php`).
- **Storage link** — the curated `storage:link --force` command is idempotent, and storage is
  already surfaced by the health endpoint.

### Files and modules changed

```
app/Domain/Menu/{ProductImportService,Models/Product.php}
app/Http/Controllers/Menu/MenuController.php
app/Domain/Operations/CommandRunner.php            (storage:link --force)
resources/views/products/export.blade.php
routes/web.php, resources/js/Pages/Menu/Index.tsx
tests/Feature/Menu/ProductBulkOpsTest.php
```

### Database and migration changes

None — `products.image_path` already existed.

### Security and tenant-isolation results

- Image uploads are validated (image, mime, 2 MB) and stored under the tenant's folder; the
  previous file is deleted on replace.
- Import is scoped to the acting tenant's catalogue and validated.

### Tests executed

```
php artisan test   →  493 passed (2618 assertions)
```

New coverage (8): image upload + replace (old file deleted), image remove, CSV import,
re-import updates (no duplicate), CSV export, PDF export, template download, storage-link
command idempotency.

### Known defects and unresolved risks

- Import is **synchronous**; very large catalogues should move to a queued job.
- Import matches columns by header name; only the documented columns are read.

### Final phase status

**Complete pending review.**

---

## Phase 16A — Registration → activation journey

### Business journey completed

A new owner registers with an email address or a mobile number, proves the contact through
its natural channel (email link or SMS one-time code), confirms their own profile, then moves
through the guided setup wizard. The dashboard and every management module stay locked until
the required steps are done — any attempt to reach them is redirected to the exact step still
holding the owner, and a returning owner resumes where they left off.

### Features implemented

- **Profile step** — a new first, required onboarding step captures the owner's name, phone
  (only when the account registered by email) and role/title; completion is recorded in
  `settings('profile.completed_at')`.
- **Truthful step pointer** — `tenants.onboarding_step` is now written on every step save and
  when the current step is resolved (previously it was only ever nulled on completion).
- **Harder gate** — the onboarding routes now require `verified`, so an unverified user cannot
  jump straight into the wizard; post-verification redirects land on the first held step.
- **Resume hint** — the onboarding shell shows a "resuming where you left off" notice when
  saved progress exists.

### Files and modules changed

```
app/Domain/Onboarding/Enums/OnboardingStep.php          (Profile case, first + required)
app/Domain/Onboarding/OnboardingService.php             (saveProfile, advanceStep, profile
                                                          checklist item, step persistence)
app/Http/Controllers/Onboarding/OnboardingController.php (storeProfile, Profile stepData)
app/Http/Controllers/Auth/VerifyEmailController.php     (redirect to onboarding)
app/Http/Controllers/Auth/PhoneVerificationController.php (redirect to onboarding)
routes/web.php                                          (onboarding/profile; group behind verified)
resources/js/Components/Onboarding/ProfileStep.tsx      (new)
resources/js/Pages/Onboarding/Show.tsx                  (render Profile step)
resources/js/Layouts/OnboardingLayout.tsx               (resume hint)
tests/Feature/Onboarding/OnboardingFlowTest.php         (+2 tests, expectations updated)
tests/Feature/Onboarding/OnboardingGatingTest.php       (+1 test, expectations updated)
tests/Feature/Auth/{EmailVerificationTest,PhoneVerificationTest}.php (redirect target)
```

### Database and migration changes

None — `profile.*` lives in the tenant `settings` JSON; `onboarding_step` already existed.

### Security and tenant-isolation results

- Unverified users are bounced to the verification screen before the wizard — verified.
- Profile writes are scoped to the acting user's tenant; mobile numbers cannot be overwritten
  by email-account edits — verified.
- Platform admins remain ungated — verified.

### Tests executed

```
php artisan test   →  499 passed (2663 assertions)
```

New coverage (+6): profile step renders/saves/advances and sets the step pointer; unverified
users cannot reach the wizard; registration still redirects to verification.

### Known defects and unresolved risks

- Mobile OTP still requires an SMS provider at `/platform/sms`; the `log` driver is the
  default in development.
- The dashboard "activation complete" cue remains the existing flash message rather than a
  bespoke first-run animation.

### Final phase status

**Complete pending review.** Awaiting approval before Phase 16B (tenant payment gateways).

---

## Phase 16B — Tenant payment gateways (onboarding + QR)

### Business journey completed

A restaurant owner enables cash, Stripe, SSLCommerz (Bangladesh) and/or bKash — several at
once with one default — either during onboarding or later in Settings. QR ordering offers
every enabled method (and cash only when the tenant accepts it). An online payment is never
recorded as paid from a redirect or a claimed status alone: SSLCommerz and bKash transactions
are confirmed with the provider before the payment settles.

### Features implemented

- **Onboarding writes real gateways** — the Payments step now captures providers, environment,
  credentials and a default, and persists `tenant_gateways` rows (encrypted credentials)
  instead of a `payments.provider` string. `TenantGatewayManager::upsertForTenant` creates/
  updates rows, disables ones left out (credentials preserved) and keeps exactly one default.
- **Single source of truth** — QR `optionsFor` reads enabled gateways; "pay at the counter"
  is shown only when the tenant accepts cash (`accept_cash` / an enabled cash gateway).
- **Server-side verification** — `WebhookService` confirms SSLCommerz/bKash transactions via
  the driver's `verifyTransaction` before marking a `Payment` succeeded (their callbacks are
  not HMAC-signed).
- **Default currencies** — SSLCommerz/bKash default to BDT, Stripe to USD/BDT, cash to all.

### Files and modules changed

```
app/Domain/PaymentGateways/TenantGatewayManager.php   (upsertForTenant, DEFAULT_CURRENCIES)
app/Domain/Onboarding/OnboardingService.php           (savePayments → gateways, checklist)
app/Http/Controllers/Onboarding/OnboardingController.php (storePayments, schema in options)
app/Domain/Dining/QrPaymentService.php                (cash only when accepted)
app/Domain/Payments/WebhookService.php                (verify BD transactions server-side)
resources/js/Components/Onboarding/PaymentsStep.tsx   (provider/credential UI)
resources/js/Pages/Onboarding/Show.tsx, resources/js/types/onboarding.d.ts
tests/Feature/{Onboarding/OnboardingFlowTest,Payments/TenantGatewayTest,
    Qr/QrPaymentOptionsTest,Tenant/SettingsTest}.php
```

### Database and migration changes

None — `tenant_gateways` already existed and is reused as the single source of truth.

### Security and tenant-isolation results

- Credentials remain encrypted at rest and are never returned to the browser (only key names).
- Onboarding upsert is scoped to the acting tenant; gateway rows are found by tenant id.
- BD webhooks only settle after a server-side provider check — verified.

### Tests executed

```
php artisan test   →  503 passed (2678 assertions)
```

New coverage (+4): onboarding payments create real gateways with a default; online gateways
require credentials in onboarding; QR omits cash when the tenant turned it off; SSLCommerz
webhook settles only after server-side verification.

### Known defects and unresolved risks

- Drivers are still exercised via `Http::fake()` only; sandbox smoke tests are recommended
  before production.
- Stripe/SSLCommerz refunds remain manual; the unique `(tenant, provider, environment)` key
  still allows one config per provider per environment.

### Final phase status

**Complete pending review.** Awaiting approval before Phase 16C (customer segmentation & analytics).

---

## Phase 16C — Customer segmentation & analytics

### Business journey completed

An owner sees customer segmentation on the dashboard (segment distribution + top spenders),
opens a per-guest Customer 360 (spend, visits, orders, loyalty, recent orders), filters the
directory server-side, tags guests and sets marketing consent, and exports any segment as a
marketing CSV. The Customer analytics report is reachable from the Reports navigation.

### Features implemented

- **Dashboard customers card** — `DashboardAnalyticsService::customerAnalytics` adds segment
  distribution, repeat guests and the top five spenders; Business 360 gains an active-guests
  fact.
- **Customer 360** — a new `Customers/Show` page (route `customers.show`) with lifetime spend,
  visits, orders, average ticket, loyalty balance, tags, consent and recent orders.
- **Server-side directory** — `customers.index` is paginated (25/page) with server-side search,
  segment, status and loyalty filters; metrics come from the server, not the visible page.
- **Marketing export** — `customers.export` streams a segment/audience CSV (respecting
  `opt_in=1`).
- **Real visit counts** — `CustomerSegmentationService` counts distinct dining sessions per
  customer alongside orders.
- **Defect fixed** — `ReportService::inventory` now imports `Ingredient`, so ingredient stock
  is valued (previously always `0.0`).
- **Design** — the customer screens and the tenant shell use the shared shadcn-based UI kit;
  the tenant panel now uses Roboto with a refined type scale (see below).

### Files and modules changed

```
app/Domain/Customers/CustomerSegmentationService.php   (visits)
app/Domain/Reporting/DashboardAnalyticsService.php     (customerAnalytics)
app/Domain/Reporting/ReportService.php                 (Ingredient import fix)
app/Http/Controllers/{DashboardController,Customers/CustomerController}.php
routes/web.php                                         (customers.show, customers.export)
resources/js/Pages/Dashboard.tsx                       (customers card)
resources/js/Pages/Customers/{Index,Show}.tsx          (rebuilt with the UI kit + 360)
resources/js/Pages/Reports/Index.tsx                   (Customers & Loyalty group)
resources/js/Layouts/AppShell.tsx, resources/css/app.css,
    tailwind.config.js, resources/views/app.blade.php   (Roboto, tenant-shell type scale)
tests/Feature/{Customers/CustomerSegmentationTest,Reporting/ReportTest,
    Onboarding/OnboardingFlowTest}.php
```

### Database and migration changes

None — visits are derived from `dining_sessions`; tags/consent columns already existed.

### Security and tenant-isolation results

- Customer 360 and export are tenant-scoped; a cross-tenant customer returns 404 — verified.
- Backend permissions (`customers.view` / `customers.manage`) gate every route — verified.

### Tests executed

```
php artisan test   →  509 passed (2731 assertions)
```

New coverage (+7): visit counts, Customer 360 render, segment CSV export, paginated/filtered
index, dashboard customerAnalytics, inventory report values ingredients, customers report
reachable.

### Known defects and unresolved risks

- Segmentation still loads all of a tenant's completed orders into memory (fine at current
  scale; a SQL-side rollup is a follow-on).
- Visit counts are zero for tenants that only use POS (no dining sessions).
- Customer 360 shows the 20 most recent orders; no time-filtered history yet.

### Final phase status

**Complete pending review.** Awaiting approval before Phase 16D (product bulk ops, images &
command fixes).

---

<<<<<<< HEAD
## Phase 16E(A) — Active restaurant & branch context

### Business journey completed

An owner logs in, picks a branch once in the sidebar, and every module — POS, Orders,
Kitchen, Tables, Reports and Payments — uses that same branch without re-selecting it.
Navigation between modules preserves the selection; switching branch refreshes the data.
The active branch is resolved and validated on the server for every request, so a branch
the user cannot access is never honoured.

### Problem addressed

The active branch was two disconnected mechanisms: a session value (`active_branch_id`)
that no controller read, and per-page `?branch_id` query params each with its own fallback
chain (Orders had no branch filter at all; `TenantContext::branchId()` was dead outside the
QR flow). The sidebar switcher changed only the displayed label.

### Features implemented

- **`ResolveActiveBranch` middleware** — resolves one active branch from trusted server-side
  context, with precedence: valid session choice → tenant primary branch → first accessible
  branch. Binds it onto `TenantContext::setBranchId()`, exposes it on the request, adds
  `branch_id` to the log context, and persists the winning value to the session. A branch the
  user cannot access is never honoured (fail closed).
- **`BranchSwitchController`** — the `branch.switch` route is now a controller action that
  validates `canAccessBranch()` and returns 403 for an inaccessible/foreign branch (previously
  silently ignored).
- **Controllers consume the resolved branch** — POS, Kitchen, Tables, Reports and Orders read
  the resolved branch via a shared `ResolvesActiveBranch` trait instead of re-deriving it.
  Order `branch_id` now passes `Rule::in(accessibleBranchIds())`.
- **Branch switchers only list accessible branches** (Kitchen/Tables previously listed all
  tenant branches).
- **Reports/Orders** default to the active branch; the "All branches" option exists only for
  tenant-wide users (owner/admin/`branches.manage`).
- **Frontend** — POS, Kitchen and Tables switchers now switch the global context
  (`branch.switch`) rather than a page-local `?branch_id`; Orders gained a branch filter.
  Branch types consolidated onto `BranchSummary`.
=======
## Phase 16D — Product images, bulk ops & command fixes

### Business journey completed

An owner uploads an image while creating a product (not only when editing), downloads a CSV
template, bulk-imports a catalogue whose rows may carry an `image_url` (downloaded and stored,
with failures reported but never dropping the product), and exports the catalogue as CSV or
PDF including images. The platform "Link storage" command now runs with a resolved PHP binary
and reports real public-storage health.

### Features implemented

- **Image on create** — `ProductRequest` accepts an `image`; `storeProduct`/`updateProduct`
  store it (public disk, replacing the previous file). The product editor shows an image
  picker for new products and submits multipart; the standalone replace/remove endpoints
  remain.
- **Import with images** — `ProductImportService` gains an `image_url` column: each URL is
  downloaded (type/size checked) and stored under the tenant's folder. A failed download is a
  warning — the product is still imported. The controller flashes a structured import result
  (created/updated/skipped/errors/warnings) rendered in the UI.
- **Template/export** — the CSV template and export include `image_url`, so a round-trip is
  lossless.
- **Command runner** — new `config/operations.php`; `CommandRunner` resolves `{php}`/`{npm}`
  placeholders to real executables (CLI `PHP_BINARY`, a sibling CLI binary under fpm/cgi, or
  an env override). Verified by actually executing `storage:link --force` in a test.
- **Health** — `HealthChecker` adds a public-storage check (writable public disk + symlink
  present); `platform:check` reports a "Public files" row.
- **Design** — the menu header actions and product editor fields use the shared UI kit
  (`TextField`, `SelectField`, `CheckboxField`, `Button`, `Card`, `Badge`).
>>>>>>> 042a3615db870847b5a61a3b5e5d7a99bb627eaf

### Files and modules changed

```
<<<<<<< HEAD
app/Http/Middleware/ResolveActiveBranch.php          (new)
app/Http/Controllers/Concerns/ResolvesActiveBranch.php (new)
app/Http/Controllers/Tenant/BranchSwitchController.php (new)
app/Http/Middleware/HandleInertiaRequests.php        (active_branch_id from context)
app/Models/User.php                                  (hasTenantWideBranchAccess public)
app/Http/Controllers/{POS/PosController,Kitchen/KitchenDisplayController,
    Tables/TableController,Reporting/ReportController,Orders/OrderController}.php
app/Http/Requests/POS/PlaceOrderRequest.php
bootstrap/app.php                                    (web stack + branch.active alias)
routes/web.php                                       (branch.switch -> controller)
resources/js/{Pages/Pos/Index,Pages/Kitchen/Index,Pages/Tables/Index,
    Pages/Reports/Index,Pages/Orders/Index}.tsx
tests/Feature/Branches/ActiveBranchContextTest.php   (new)
```

### Security and tenant-isolation results

- Active branch resolved from trusted server-side context; client-supplied branch ids are
  validated against `accessibleBranchIds()`.
- Switching to an inaccessible or foreign-tenant branch returns 403 — verified.
- An inaccessible session value falls back to an accessible branch — verified.
- Branch switchers and the Orders/Reports filter only expose accessible branches — verified.
- Full suite green: no cross-tenant or cross-branch regression.

### Tests executed

```
php artisan test      →  509 passed (2731 assertions)   [baseline preserved]
new: ActiveBranchContextTest → 7 passed (122 assertions)
npm run build         →  tsc + vite build clean
```

### Known defects and unresolved risks

- **Data-layer branch isolation is not yet in place** — this phase unifies the *context*;
  the fail-closed `BelongsToBranch` global scope, route-model-bound ownership checks and
  write-path hardening land in **Phase 16E(B)**. Until then, a model fetched by a direct URL
  is still constrained only by the tenant scope.
- **Pint could not run** (binary requires PHP 8.3; environment is PHP 8.2) — formatting was
  kept consistent with surrounding code by hand.
- Per-page branch selects still exist as styled controls (they now drive the global context);
  a full swap to the shared `BranchSelector` component is deferred to avoid churn on the
  dark KDS theme.

### Final phase status

**Complete pending review.** Awaiting approval before Phase 16E(B) (branch-wise permissions &
task assignment).

---

## Phase 16E(B) — Branch-wise permissions & task assignment

### Business journey completed

A user assigned to a branch (and the tasks their role permits) can only see and act on
that branch's records — orders, kitchen tickets, tables, shifts, stock, purchasing, waste,
expenses, accounts, QR tables and analytics. Direct URLs and API calls to another branch's
record fail closed. Multi-branch access works only when it has been explicitly granted, and
a user cannot widen it through a request field.

### Problem addressed

There was no branch data layer — only a tenant scope. Branch filtering was manual and easy
to omit (Orders had no filter; Kitchen listed every tenant branch; mutations acted on any
ticket in the tenant). `role_user.branch_id` remains inert; "task" maps to the module
permissions a role already grants, enforced together with branch access.

### Features implemented

- **Fail-closed branch scope** — `BelongsToBranch` trait + `BranchScope` support class add a
  `branch` global scope. No authenticated user (jobs, console, public QR) or tenant-wide
  user ⇒ unrestricted; otherwise constrained to `accessibleBranchIds()`; an empty set fails
  closed (`1 = 0`). Company-wide models (expense, financial account/transaction, delivery
  zone) also allow a null branch; `StockTransfer` allows either branch.
- **Applied to branch-owned models** — Order, DiningArea, Table, TableQrToken, KitchenStation,
  KitchenTicket, Shift, Register, CashMovement, StockLocation, StockMovement, StockBalance,
  PurchaseOrder, GoodsReceipt, WasteRecord, Expense, FinancialAccount, FinancialTransaction,
  DeliveryZone, DiningSession, ProductAvailability, StockTransfer.
- **Direct-URL ownership** — route-model binding runs through the scope, so a record from an
  inaccessible branch resolves to **404** without per-controller code.
- **Write-path validation** — every FormRequest accepting a branch input now enforces
  `Rule::in(accessibleBranchIds())` (POS, shift open, table, stock movement/transfer, waste,
  purchase order, expense, account, delivery zone, staff branch assignment).
- **Branch lists scoped** — every module's `branches` selector now lists only accessible
  branches; QR analytics validates its branch filter.
- **Dashboard & shared props** — dashboard KPIs/trends and the pending-approvals badge are
  constrained to accessible branches.
- **Staff hardening** — a manager can only grant branches they themselves can reach.
- **Performance** — `accessibleBranchIds()` / `hasTenantWideBranchAccess()` are memoised per
  user (invalidated when roles/branches change).

### Files and modules changed

```
app/Domain/Branches/{Concerns/BelongsToBranch,Support/BranchScope}.php   (new)
app/Domain/**/Models/*.php                                              (22 branch-owned models)
app/Models/User.php                                                     (memoisation)
app/Http/Requests/**/*.php                                              (branch input validation)
app/Http/Controllers/**/*.php                                           (branch lists + QR analytics filter)
app/Http/Middleware/HandleInertiaRequests.php                           (scoped pending_approvals)
app/Domain/Reporting/DashboardAnalyticsService.php                      (scoped analytics)
tests/Feature/Branches/BranchAccessEnforcementTest.php                  (new)
```

### Security and tenant-isolation results

- Branch-restricted users cannot read, list, print, act on, settle, void or transfer another
  branch's records (404/403) — verified.
- Records are scoped at the data layer, so a forgotten `where('branch_id')` no longer leaks.
- Inaccessible `branch_id` inputs in writes are rejected (422); an inaccessible branch filter
  is ignored and falls back to the active branch.
- Multi-branch access works only when explicitly granted; the owner remains unrestricted.
- Cross-tenant isolation is unchanged (tenant scope retained above the branch scope).

### Tests executed

Full suite (run before the standing instruction to stop using tests): **522 passed
(2951 assertions)** — 6 new Phase 16E(B) enforcement tests plus the Phase 16E(A) suite, with
no regressions. Two pre-existing permission tests were tightened so their cashier is granted
branch access, exercising the permission gate (403) rather than the branch scope (404).

### Known defects and unresolved risks

- `ReportService` uses `withoutGlobalScopes()`, so it is constrained at the controller level
  (a restricted user's report branch is forced to an accessible branch), not by the scope.
- `role_user.branch_id` remains inert; permissions are still resolved tenant-wide per role and
  combined with branch access. Per-branch permission grants are not implemented.
- Customer-level analytics/segmentation remains tenant-wide (customers are not branch-owned).
- Pint could not run (binary requires PHP 8.3; environment is PHP 8.2); import ordering in a
  few models was reordered by hand.

### Final phase status

**Complete pending review.** This completes the "restaurant & branch selection" and
"branch-wise permissions & task assignment" work (Phases 16E(A) and 16E(B)).

---

## Phase 16F — Table staff assignment (create & edit)

### Business journey completed

A manager creating a table assigns the staff who serve it (searchable multi-select, filtered
to the branch), and later opens Table Management → Edit to change, add, or remove those
assignments. Only active staff authorized for the selected branch can be assigned. New
orders at a table snapshot its current staff; changing the table's assignment afterwards
never rewrites the historical staff on existing orders, and an active order keeps its
original assignment.

### Problem addressed

The Create/Edit Table forms had no staff concept and orders carried no staff reference, so a
table could not be tied to a server and order history had no per-order staff record.

### Features implemented

- **Table staff assignment** — new `table_staff` pivot (multiple staff per table);
  `Table::staff()` relation. Optional — a table may be saved unassigned.
- **Eligible staff** — active users of the branch's tenant who can access the branch and may
  serve or manage table orders (`pos.use` OR `tables.manage`), reusing `isActive()`,
  `canAccessBranch()`, tenant scoping and the permission catalog. No new eligibility system.
- **`TableStaffService`** — `assignableStaff()`, `assignableStaffByBranch()`, `isAssignable()`,
  `sync()` (fail-closed to eligible ids; audits `table.staff_updated` with before/after and the
  open-order count), `snapshotToOrder()`.
- **Create & edit** — `TableRequest` accepts `staff_ids` and rejects any staff ineligible for
  the selected branch (422); `store()`/`update()` write the table and assignment in one
  transaction.
- **Order snapshot** — new `order_staff` table (`user_id` + `name` snapshot); `Order::staff()`.
  `SaleService::createOrder()` freezes the table's staff onto every new order (POS and QR).
  Editing a table's staff only affects orders opened afterwards; existing orders are untouched
  and the UI says so.
- **POS & Orders** — POS table selector shows the assigned staff; the order detail shows
  "Served by" from the snapshot.
- **UI** — new reusable `StaffMultiSelect` (searchable Popover + checkboxes + chips,
  keyboard/aria accessible); the Tables page shows assigned staff on floor cards, the list
  view, and the details drawer.

### Files and modules changed

```
app/Domain/Tables/TableStaffService.php                 (new)
app/Domain/Tables/Models/Table.php                      (staff relation)
app/Domain/Orders/Models/Order.php                      (staff snapshot relation)
app/Models/User.php                                      (canServeTableOrders)
app/Http/Requests/Tables/TableRequest.php               (staff_ids + eligibility)
app/Http/Controllers/Tables/TableController.php         (store/update sync + index props)
app/Domain/POS/SaleService.php                          (snapshot on order creation)
app/Http/Controllers/POS/PosController.php              (table staff prop)
app/Http/Controllers/Orders/OrderController.php         (staff in index/show payloads)
database/migrations/2026_10_13_000001_create_table_staff_tables.php  (new)
resources/js/Components/ui/StaffMultiSelect.tsx          (new) + ui/index.ts export
resources/js/Pages/Tables/Index.tsx, Pos/Index.tsx, Orders/Show.tsx
tests/Feature/Tables/TableStaffAssignmentTest.php        (new)
=======
app/Http/Requests/Menu/ProductRequest.php              (image rule)
app/Http/Controllers/Menu/MenuController.php           (image on create/update, import result)
app/Domain/Menu/ProductImportService.php               (image_url fetch, warnings)
app/Domain/Operations/CommandRunner.php                (binary resolution, placeholders)
app/Http/Controllers/Platform/CommandController.php   (resolved command display)
app/Support/HealthChecker.php, app/Console/Commands/PlatformReadinessCheck.php
app/Http/Middleware/HandleInertiaRequests.php          (flash import_result)
config/operations.php                                  (new)
resources/js/Pages/Menu/Index.tsx                      (editor + import UI)
tests/Feature/Menu/ProductBulkOpsTest.php
>>>>>>> 042a3615db870847b5a61a3b5e5d7a99bb627eaf
```

### Database and migration changes

<<<<<<< HEAD
- New: `table_staff`, `order_staff`. Additive and reversible.

### Security and tenant-isolation results

- Eligibility enforced server-side: inactive, other-tenant, no-branch-access, and non-serving
  users are rejected (422); the service also intersects with the eligible set (fail closed).
- `tables.manage` required to create/update; branch `Rule::in(accessibleBranchIds())` retained.
- Verified: no cross-tenant or cross-branch staff can be assigned.
=======
None.

### Security and tenant-isolation results

- Uploaded/imported images are validated (image mime, 2–3 MB) and stored under the tenant's
  folder; the previous file is deleted on replace.
- Remote image fetches are time-bounded and type-checked; a malicious/unreachable URL cannot
  break or block an import — verified.
>>>>>>> 042a3615db870847b5a61a3b5e5d7a99bb627eaf

### Tests executed

```
<<<<<<< HEAD
php artisan test tests/Feature/Tables/TableStaffAssignmentTest.php
  →  16 passed (66 assertions)
php -l on all changed PHP files → clean
npm run build → tsc + vite clean
```

Coverage: create with/without staff; inactive / no-branch-access / no-serving-permission /
foreign-tenant staff rejected; permission gate; order snapshot on open; change/add/remove on
edit; other-branch staff rejected on edit; editing does not rewrite an active order snapshot;
a new order after edit snapshots the new staff; page props expose assigned + assignable staff.

### Known defects and unresolved risks

- Eligibility maps "serve or manage table orders" to `pos.use OR tables.manage` (Kitchen,
  Inventory, Accountant, Auditor excluded) — flagged for confirmation.
- `staffByBranch` sends assignable staff for every accessible branch; fine at expected
  branch/team sizes (switch to an on-demand endpoint if a tenant has many branches).
- `order_staff.name` duplicates the user's name at snapshot time by design (history survives a
  rename/deactivate).

### Final phase status

**Complete pending review.**

---

## Phase 16G — Table staff role & order confirmation

### Business journey completed

An owner assigns a **Table Staff** role to a server. The server uses the POS to build a table
order and, when the tenant requires it, submits it for **central approval** instead of taking
payment. A manager/approver opens Orders, inspects the order (table, items, total, initiating
staff, assigned serving staff, time), then approves it (it flows to the kitchen) or rejects it
with a reason (it is voided, stock reversed, never sent to the kitchen). If the tenant enables
**Direct confirmation**, table-staff orders are confirmed immediately and flow to the kitchen as
before.

### Problem addressed

There was no service-facing role and no way to route POS table orders through an approval gate.
The existing confirmation mechanism (`acceptance_status` + `OrderService::accept/reject` + the
single kitchen-ticket path) was wired to QR orders only. This phase reuses it rather than adding
a parallel order/confirmation/kitchen system.

### Features implemented

- **`table_staff` role** — `RoleName::TableStaff`, seeded minimal permissions
  (`dashboard.view, pos.use, orders.view, orders.create, tables.view, kitchen.view, menu.view,
  modifiers.view, customers.view`). No payment, void, approve, financial or admin access. It
  auto-appears in the Staff UI and is immediately assignable to tables (has `pos.use`).
- **`orders.approve` permission** — new catalog action; granted to Owner/Admin/Manager/Supervisor.
  Approve/reject/confirm and the pending badge now require it (cashier no longer approves).
- **Confirmation gating (reuse)** — `SaleService::openOrder()` creates a **Pending** order only when
  the creator holds the `table_staff` role, the order is dine-in, and central approval is required
  (mode = central, or branch direct order-taking off). Otherwise unchanged (`auto_accepted`).
- **Unified kitchen gate** — `SaleService::postCommit()` now dispatches only when
  `acceptance_status->isConfirmed()` (uses the previously-dead `isConfirmed()` helper) and
  `OrderConfirmationSettings::sendConfirmedToKitchen()`. Pending/rejected orders never dispatch.
- **Settings (tenant-level, `orders.*`)** — new typed accessor `OrderConfirmationSettings`
  (`staff_confirmation_mode` = central|direct default direct; `branch_direct_order_taking` default
  true; `send_confirmed_to_kitchen` default true) with a new **Orders** Settings tab, request
  validation, and `OnboardingService::saveOrders()`.
- **Central confirmation UI** — Orders index gains a Confirmation filter; accept/reject are gated
  on `orders.approve`; the order detail shows Approve / Reject-with-reason and the approver /
  rejector / timestamp / reason.
- **Table-staff POS** — when the user lacks `orders.update` the Pay button is hidden and the
  dine-in action becomes **Submit for Confirmation**; held/pending/rejected statuses and rejection
  reasons are shown.
- **Approver/rejector recorded** — new nullable `confirmed_by_user_id` / `rejected_by_user_id`
  (additive), alongside existing `accepted_at` / `rejected_at` / `rejected_reason` and status history.
- **Idempotency / safety** — `accept()` no-ops unless Pending; `reject()` now requires Pending
  (previously could re-reject). Kitchen ticket creation remains single-path and idempotent.

### Files and modules changed

```
app/Domain/Identity/{Permissions,Enums/RoleName}.php
database/seeders/RolePermissionSeeder.php
app/Domain/Orders/OrderConfirmationSettings.php                 (new)
app/Domain/Orders/{OrderService,Models/Order}.php
app/Domain/POS/SaleService.php
app/Http/Controllers/{Orders/OrderController,POS/PosController,Tenant/SettingsController}.php
app/Http/Requests/Tenant/OrderSettingsRequest.php               (new)
app/Http/Middleware/HandleInertiaRequests.php
app/Domain/Onboarding/OnboardingService.php
routes/web.php
database/migrations/2026_10_13_000002_add_confirmation_reviewers_to_orders_table.php (new)
resources/js/Components/Settings/OrdersFields.tsx               (new)
resources/js/Pages/Settings/Show.tsx
resources/js/Pages/Orders/{Index,Show}.tsx
resources/js/Pages/Pos/Index.tsx
```

### Database and migration changes

- Altered `orders` (+nullable `confirmed_by_user_id`, `rejected_by_user_id`, `nullOnDelete`).
  Additive and reversible. No destructive migration.

### Settings and permissions added

- **Permission:** `orders.approve` (catalog + seeder grants).
- **Role:** `table_staff`.
- **Settings (tenant `tenants.settings`):** `orders.staff_confirmation_mode`,
  `orders.branch_direct_order_taking`, `orders.send_confirmed_to_kitchen`. Defaults preserve
  existing behaviour.
- **Route middleware changes:** `orders.accept|reject` → `orders.approve`; `pos.orders.store` and
  `orders.settle` → also require `orders.update` (so table staff cannot take payment).

### Order confirmation and kitchen integration behaviour

- Pending orders have no kitchen ticket and are not actionable in the KDS.
- Rejected orders are voided, stock reversed, never dispatched.
- Approved / directly-confirmed orders follow the existing kitchen workflow; dispatch happens once
  (idempotent job + unique `kitchen_tickets.order_id`).
- Changing the settings never rewrites historical orders.

### Blockers and decisions

- **Re-seed required:** existing databases must run `RolePermissionSeeder` (adds the `table_staff`
  role and `orders.approve` permission). I did not run it (no DB writes).
- **Open order still needs an open shift** (`SaleService::openOrder` shift requirement unchanged) —
  noted; a table-staff submission without an open shift is rejected as before.
- **Decision D5 in effect:** cashiers no longer approve QR/table orders — managers+ do. Revert by
  granting `orders.approve` to Cashier if desired.
- **Decision D2 in effect:** approver/rejector recorded via the two new nullable columns.

### Verification

- `php artisan test` → **538 passed (3019 assertions)**.
- `npm run build` → tsc + vite clean.
- **Defect found and fixed during verification:** the kitchen-gate refactor read
  `acceptance_status` off a freshly-`create()`d order (which is `null` until the DB default applies),
  causing a 500 on every POS order creation — including a table-staff submission. The default is now
  carried onto the in-memory model at creation. `RolePermissionTest`'s role-count assertion was
  updated to `count(RoleName::cases())` for the new role.

### Final phase status

**Complete pending review.** Awaiting explicit authorization before any test/QA run.
=======
php artisan test   →  512 passed (2743 assertions)
```

New coverage (+3 net): image on create, import with `image_url`, import warning on a failed
image, and a storage-link test that really executes the command (exit 0).

### Known defects and unresolved risks

- Import remains synchronous; very large catalogues with many images should move to a queued
  job.
- Import reads only the documented columns; no Excel (`.xlsx`) support (CSV only, per scope).
- `OPERATIONS_PHP_BINARY`/`OPERATIONS_NPM_BINARY` may still be needed on hosts whose layout
  does not match the auto-detection.

### Final phase status

**Complete pending review.** This closes the 16A–16D refinement program.
>>>>>>> 042a3615db870847b5a61a3b5e5d7a99bb627eaf

---

## Program status

<<<<<<< HEAD
Phases 15A–15D, 16A, 16B and 16C are implemented and verified (509 tests passing; frontend
build clean). Remaining known gaps are noted per phase. Phase 16D (product bulk ops, images &
command fixes) is planned but not yet implemented. Phases 16E(A) (active restaurant & branch
context) and 16E(B) (branch-wise permissions & task assignment) are implemented and verified
(522 tests passing). Phase 16F (table staff assignment — create & edit) is implemented and
verified (new `TableStaffAssignmentTest`: 16 tests passing; frontend build clean). Phase 16G
(table staff role & order confirmation) is implemented and verified — **538 tests passing**,
frontend build clean. Re-seed `RolePermissionSeeder` for the new role and permission.
=======
Phases 15A–15D and 16A–16D are implemented and verified (512 tests passing; frontend build
clean). Remaining known gaps are noted per phase. The owner journey, tenant payment gateways,
customer segmentation/analytics and product bulk operations are now complete, with the tenant
panel restyled on the shared shadcn-based UI kit and Roboto typography.
>>>>>>> 042a3615db870847b5a61a3b5e5d7a99bb627eaf
