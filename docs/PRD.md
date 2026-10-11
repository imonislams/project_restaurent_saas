# Product Requirements Document (PRD)
## Multi-Tenant Restaurant POS SaaS

**Status:** Draft for approval
**Version:** 1.0
**Owner:** Platform team
**Related docs:** [ARCHITECTURE.md](./ARCHITECTURE.md) · [DATABASE.md](./DATABASE.md) · [UI-UX.md](./UI-UX.md) · [SECURITY.md](./SECURITY.md) · [ROADMAP.md](./ROADMAP.md)

---

## 1. Overview

A production-ready, multi-tenant Restaurant POS SaaS with a professional
desktop-application-style interface. It serves single restaurants, multi-branch
businesses, cloud kitchens and growing restaurant groups from one core platform.

The product has **three distinct workspaces** over one core platform:

1. **Restaurant POS workspace** — for cashiers and restaurant staff.
2. **Restaurant management workspace** — for owners and managers.
3. **SaaS owner control center** — for the platform operator.

### 1.1 Product priorities

1. A genuinely fast desktop POS that a cashier can learn quickly.
2. A trustworthy business core connecting orders, payments, inventory, cash and reporting.
3. A manageable SaaS platform with strong tenant isolation, subscriptions, diagnostics
   and automated operations.

### 1.2 Build philosophy

Develop as a sequence of completed **business journeys**, not as a collection of
screens. The definition of done is a verified end-to-end journey, not a finished UI
page or a successful code-generation response.

---

## 2. Goals & success metrics

| Goal | Metric |
|------|--------|
| Fast onboarding | Tenant reaches first successful sale within the first session |
| Cashier efficiency | Common sale (search → cart → payment) in minimal clicks and keystrokes |
| Transaction integrity | Zero duplicate sales from repeated clicks or retries |
| Data isolation | Zero cross-tenant data leakage (verified by tests) |
| Financial trust | Reports reconcile; sales revenue ≠ cash received is modeled correctly |
| Operational resilience | A queue/email/print failure never blocks a committed sale |

### 2.1 North-star milestone (MVP)

> A tenant can **register**, **configure a branch**, **add products**, **open a shift**,
> **complete a sale**, **receive payment**, **update stock**, **close the shift** and
> **reconcile the day's numbers**.

Everything else is expanded module by module after this journey is proven.

---

## 3. Personas & workspaces

### 3.1 POS workspace (cashiers & staff)

- Product grid and category navigation
- Persistent cart and fast checkout
- Keyboard shortcuts and barcode input
- Table orders, takeaway and delivery
- Payment, receipt and shift management

### 3.2 Management workspace (owners & managers)

- Sales, profit and stock overview
- Menu, inventory and suppliers
- Expenses, accounts and reports
- Staff, branches and permissions
- Settings and business controls

### 3.3 SaaS owner control center (platform operator)

- Tenant and subscription management
- Plans, feature limits and billing
- System health, queues and scheduled jobs
- Tenant diagnostics and support
- Security logs, backups and maintenance

### 3.4 Workspace separation rule (critical)

> A cashier must not see SaaS billing or platform maintenance, and a SaaS
> administrator must not automatically gain unrestricted access to tenant business
> data.

- Platform access, tenant business access and support access are **separate permissions**.
- Impersonation must **never** become a hidden way to bypass tenant isolation.
- Enforce restrictions on the **backend**, not only by hiding frontend buttons.

---

## 4. Roles

Predefined roles with configurable permissions:

| Role | Main responsibilities |
|------|----------------------|
| SaaS Super Admin | Platform operations and tenant administration |
| Tenant Owner | Full access to their own restaurant company |
| Tenant Admin | Company configuration and delegated management |
| Branch Manager | Assigned branch operations, reports and approvals |
| Supervisor | Order oversight, voids and operational approvals |
| Cashier | POS, payments, receipts and assigned shift |
| Kitchen Staff | Kitchen tickets and preparation statuses |
| Inventory Manager | Stock, purchases, transfers and adjustments |
| Accountant | Expenses, accounts, settlements and financial reports |
| Auditor | Read-only access to explicitly authorized records |

Granular permission actions: **view, create, update, delete, approve, refund,
export, manage**. Access is additionally restricted by branch.

---

## 5. Functional requirements by module

### Module 1 — SaaS platform administration (platform owner only)

| Feature | Requirements |
|---------|-------------|
| Platform dashboard | Total tenants, active branches, active users, orders, MRR, churn, trials, system health |
| Tenant management | Create, search, view, verify, activate, suspend, archive tenant accounts |
| Tenant details | Company info, branches, users, usage, plan, recent activity, support history |
| Subscription plans | Monthly/yearly pricing, trial period, feature access, usage limits |
| Subscription management | Trial, active, past due, suspended, cancelled, renewal states |
| Usage metering | Branches, users, orders, storage and other billable usage |
| Feature management | Enable/disable modules by plan, tenant or controlled rollout |
| Platform settings | Branding, email, regional defaults, maintenance mode, security settings |
| Support center | Tickets, internal notes, tenant context, issue status |
| Tenant diagnostics | Recent errors, failed jobs, configuration, safe operational metrics |
| Impersonation | Time-limited, reason required, visible banner, audit trail |
| System monitoring | Queue health, scheduled jobs, DB latency, storage, application errors |
| Audit log | Platform admin actions, permission changes, security events |
| Billing overview | Payments, failed renewals, invoices, refunds, revenue summaries |
| Maintenance center | Backups, restore verification, cleanup tasks, maintenance history |

**Design rule:** Platform access, tenant business access and support access are separate
permissions. Impersonation must never become a hidden bypass of tenant isolation.

### Module 2 — Tenant registration and onboarding

This is the first experience a restaurant owner encounters.

**Must:**
- Register using name, business email, password and restaurant/company name.
- Verify email and activate the account.
- Create the tenant and assign the default subscription or trial.
- Start an onboarding wizard with a progress indicator.
- Configure company info, country, timezone, currency and tax preferences.
- Create the first branch; configure operating hours, receipt details and service types.
- Create menu categories and products, or import sample data.
- Configure inventory and opening stock.
- Invite staff and assign roles.
- Set up payment methods and receipt printing.
- Complete a guided test sale.
- Show an activation checklist on the dashboard.

**Also:**
- Save progress so owners can resume onboarding.
- Allow skipping optional steps without blocking the first sale.
- Show incomplete-configuration warnings.
- Provide sample/demo data **separately** from live transactions.
- Record onboarding completion and time to first successful sale.
- Make the wizard usable for a single restaurant without forcing multi-branch configuration.

### Module 3 — Company, branches and business settings

- Company profile, logo, contact details and business address.
- Multiple branches under one tenant.
- Branch-specific managers, cashiers and permissions.
- Branch timezone, currency display, tax configuration and receipt numbering.
- Business hours, holidays, weekly closing days and special schedules.
- Dine-in, takeaway, delivery and counter-service configuration.
- Branch-specific menus, prices, taxes and product availability.
- Branch-specific stock locations, suppliers, cash accounts and expenses.
- Inter-branch stock transfers and transfer approval.
- Branch switching based on user permissions.
- Consolidated and individual branch reports.
- Branch activation, closure and historical data retention.

**Data rule:** Branch-level operational records must reference the authorized branch.
The server must validate both `tenant_id` and `branch_id` for every applicable operation.

### Module 4 — Users, teams and permissions

- Invite staff by email; accept invitation and activate account.
- Assign multiple roles where appropriate.
- Configure granular permissions (view, create, update, delete, approve, refund, export, manage).
- Restrict access by branch.
- Reset passwords and revoke sessions.
- Deactivate staff without deleting historical transaction records.
- Log role and permission changes.
- Require approval or a manager PIN for sensitive actions.
- Track last login and account status.
- Use Laravel authorization policies and gates, not just hidden frontend buttons.

### Module 5 — Menu and product management

**Menu catalog**
- Categories, subcategories and category sorting.
- Product names, descriptions, SKU and barcode.
- Product images and display ordering.
- Dine-in, takeaway and delivery prices.
- Product availability by branch and schedule.
- Variants (size, serving) and modifiers/add-ons (required and optional).
- Modifier groups with minimum and maximum selections; modifier pricing.
- Tax category and applicable tax rules.
- Labels: popular, new, unavailable, seasonal.
- Search, filters, bulk editing, CSV import/export.
- Duplicate products and copy menus between branches.
- Scheduled price changes and menu availability.

**Recipe and costing foundation**
- Ingredient definitions and units of measurement.
- Recipe/BOM for products; ingredient quantities per serving.
- Recipe cost calculation based on ingredient cost.
- Expected stock deduction when an order is fulfilled.
- Ingredient substitutions where permitted.
- Recipe version history and cost-change tracking.

> Recipe-based inventory must be **configurable**. Do not force a simple retail-style
> restaurant to create recipes for every product before it can use POS.

### Module 6 — Desktop-style POS terminal

The most important daily-use screen. Optimize for speed, minimal clicks and reliable
transaction processing. See [UI-UX.md](./UI-UX.md) for the full layout.

**Layout:** top bar (branch, shift, connection, user, clock) · left panel (categories,
favorites, filters) · center panel (searchable product grid) · right panel (persistent
cart) · bottom action area (hold, customer, payment, print, complete).

**Order creation**
- Start/hold/resume/cancel order; park multiple orders and switch between them.
- Order types: dine-in, takeaway, delivery, counter.
- Table selection and optional customer assignment.
- Product search, category filtering, barcode input.
- Add items, change quantities, edit modifiers, add notes.
- Item-level and order-level discounts; tax and service charge.
- Duplicate previous order or reorder a customer's purchase.
- Display stock warnings and unavailable products.
- Order notes and kitchen instructions.
- Unique order numbers with branch-safe sequencing.

**Payment and completion**
- Cash, card, mobile financial service and configurable methods.
- Split payment across methods; partial payment / outstanding balance only when policy allows.
- Cash received and change due.
- Authorized discounts and complimentary items.
- Manager approval for refunds, voids and overrides.
- Prevent duplicate submissions and double charging.
- Store external payment references and idempotency keys.
- Print/reprint receipts with audit history; send via supported channels.
- Complete a sale only after required transaction writes succeed.

**Keyboard shortcuts (configurable, documented)**
`F2` product search · `F4` payment · `F6` hold order · `F8` resume order ·
`Esc` close dialog/cancel interaction · `Ctrl/Cmd+K` global search.
Avoid conflicts with browser/OS controls. Every critical action must also be reachable
by mouse and touch.

**Desktop-app-like behavior:** full-height workspace, compact navigation, persistent
sidebar, full-screen POS mode, resizable panels, keyboard navigation with visible focus,
fast search, minimal reloads, toasts and inline validation, modal/side-panel editing,
confirmations for destructive actions, session-expiry warning and draft recovery,
responsive fallback for tablets.

> A desktop-first browser app is **not** automatically an offline app. Offline
> transactions require a separate synchronization, conflict-resolution and
> payment-safety design.

### Module 7 — Table and restaurant floor management

- Visual floor plan with configurable areas and tables.
- Table status: available, occupied, reserved, billing, cleaning.
- Assign an order to a table; move orders between tables.
- Merge tables and split bills; transfer items between tables.
- Guests/cover count; track occupancy and elapsed dining time.
- Reservations (date, time, party size, contact) and waitlist with table assignment.
- Table-specific service charge rules.
- Record who opened, transferred or closed a table.
- Keep table management **optional** so cloud kitchens and takeaway businesses can use
  the same POS without unnecessary screens.

### Module 8 — Kitchen Display System (KDS)

- Receive kitchen tickets when orders are accepted.
- Route items to kitchen stations (grill, drinks, desserts).
- Ticket statuses: new, accepted, preparing, ready, served.
- Prioritize delayed and urgent orders.
- Display order number, items, modifiers, notes, elapsed time.
- Update individual item status or the entire ticket.
- Send amendments when an order changes.
- Notify front-of-house when an order is ready.
- Track preparation duration and missed service targets.
- Configure sound and visual alerts.
- Filter by station, branch, order type.
- Maintain a printable kitchen ticket fallback.

> Kitchen ticket generation can run **asynchronously after the core sale transaction
> commits**. A queue failure must not duplicate the sale.

### Module 9 — Inventory and stock control

**Stock operations:** opening stock and valuation · goods received and purchase
receipts · stock movement ledger · deduction based on configured sale/recipe rules ·
manual adjustments with reasons and permissions · wastage/spoilage/breakage/complimentary
consumption · supplier returns and customer-related returns · inter-branch transfers with
dispatch and receiving confirmation · stock reservations · low-stock thresholds and
reorder alerts · batch/expiry/lot tracking (advanced) · unit conversion (kg↔g, L↔mL) ·
physical stock counts and variance reports · negative-stock prevention or controlled
overrides · movement history with source transaction references.

**Inventory dashboard:** current quantity and valuation · below reorder threshold ·
expiring soon · unusual adjustment/waste trends · stockouts by branch · theoretical vs
actual usage (when recipes configured) · purchase and consumption trends.

**Engineering rule:** Maintain an **auditable stock movement ledger**. Do not
independently edit stock balances in multiple modules without a consistent transaction
and reconciliation strategy.

### Module 10 — Purchasing and supplier management

Supplier directory and contacts · supplier-specific product codes and prices · purchase
requisitions · purchase orders (draft, submitted, approved, cancelled) · approval limits
by role/amount · partial and full goods receiving · ordered vs received comparison ·
record damaged/missing/rejected goods · **update inventory only for confirmed receipts** ·
supplier invoices and due dates · supplier payments and outstanding balances · supplier
returns and credit notes · purchase history and cost comparisons · reorder suggestions ·
import/export and printable purchase documents.

### Module 11 — Waste, spoilage and operational loss

- Make waste recording part of the daily workflow.
- Record product or ingredient wastage: quantity, reason, branch, date, responsible employee.
- Reasons: expiry, preparation error, damage, spoilage, other.
- Require approval above configurable thresholds; attach notes/evidence when required.
- Automatically create the corresponding **stock movement**.
- Calculate estimated waste cost.
- Separate waste from sales, refunds and complimentary orders.
- Report waste by product, branch, category and employee; compare trends with stock
  usage and sales.
- Maintain **immutable adjustment history** with correction entries instead of silently
  rewriting old movements.

### Module 12 — Customers, loyalty and CRM

Customer profiles and contacts · purchase history and order lookup · notes and
preferences with access controls · optional loyalty points and rewards · groups and
segments · birthday/promotional offers with consent management · discount eligibility
and coupon redemption · customer credit only if explicitly enabled with strict limits
and accounting · feedback and satisfaction records · repeat-order shortcuts ·
import/export with permissions · marketing consent, unsubscribe and communication
preferences.

> Keep the MVP customer feature **simple**. Add advanced loyalty campaigns only after
> the core sales and refund workflows are reliable.

### Module 13 — Delivery and takeaway management

Takeaway and delivery order types · customer delivery addresses · delivery zones and
fees · minimum order value · preparation and promised delivery times · statuses
(pending, preparing, ready, dispatched, delivered) · assign delivery employee · delivery
instructions · third-party delivery integration points · payment collection and
settlement status · cancellation and refund rules · delivery performance reports.

> Online ordering, third-party marketplace sync and live driver tracking are **separate
> expansion modules**.

### Module 14 — Cash register and shift management

Open/close cashier shifts · opening cash float · assign registers to branches and
authorized cashiers · cash sales, refunds, cash in/out · petty cash and authorized cash
expenses · expected closing balance · actual counted cash · overage/shortage ·
manager approval for discrepancies above a threshold · non-cash payments tracked
separately from physical cash · cashier handover · shift summary and printable closing
report · reconcile payment methods against gateway settlements · prevent unauthorized
edits to closed shifts · reopen only with permission and an audit trail.

> A cashier's **shift** is not the same as a calendar **business day**. Support both
> concepts explicitly.

### Module 15 — Expenses, accounts and financial reporting

**Expenses:** categories and accounts · branch-level and company-level · date, amount,
payment method, reference · attach receipts/supporting documents · recurring templates ·
draft/submitted/approved/rejected states · approval workflows and spending limits ·
resulting cash/bank movement · search, filter, export.

**Financial accounts:** cash registers and bank accounts · mobile financial service
clearing accounts · gateway clearing and settlement accounts · account transfers ·
income/expense categories · refunds, supplier payments, customer receipts · opening
balances and reconciliation adjustments · period closing and audit history.

**Profit and loss:** net sales · discounts and refunds · taxes collected and payable ·
cost of goods sold · gross profit and margin · operating expenses · net operating result ·
branch comparisons and period trends.

> **Sales revenue is not the same as cash received.** Taxes collected are not
> necessarily revenue, and gross sales minus expenses is not reliable profit unless COGS
> and other adjustments are included. Define a consistent accounting model before
> implementing financial dashboards. Add a full double-entry general ledger only if the
> platform is intended to serve as an accounting system.

### Module 16 — Reports and owner analytics

| Report | Key information |
|--------|-----------------|
| Sales summary | Gross sales, discounts, refunds, net sales |
| Product performance | Best-selling, low-selling, unsold items |
| Category performance | Sales and contribution by category |
| Payment report | Sales by payment method and settlement status |
| Cash report | Opening cash, inflows, outflows, closing variance |
| Shift report | Cashier activity, transactions, discrepancies |
| Inventory report | On-hand stock, valuation, movements |
| Purchase report | Supplier purchases, receipts, cost changes |
| Waste report | Quantity, value, reason, trend |
| Expense report | Spending by category, branch, period |
| Profit report | Revenue, COGS, gross profit, operating result |
| Staff report | Sales activity and authorized actions |
| Branch comparison | Sales, margin, waste, operating trends |
| Tax report | Taxable sales, tax collected, adjustments |
| Subscription report | Tenant usage, plan status, recurring revenue |

All reports must support appropriate date ranges, branch filters, pagination, export
permissions and clearly defined calculations. Use tenant/branch timezones so a daily
report does not include orders from the wrong local business day.

### Module 17 — Subscription and SaaS billing

Free trial configuration and expiry · monthly and annual plans · plan comparison and
upgrade/downgrade flows · feature entitlements and usage limits · payment provider
abstraction · payment attempts, receipts, billing history · renewal reminders and
failed-payment recovery · grace period and past-due state · suspension and reactivation ·
cancellation and plan-change rules · proration where supported · coupons and promotional
periods · tenant usage dashboards · **backend plan-limit enforcement** · webhook
signature verification and idempotent processing · platform revenue and churn reports.

> Never trust a plan name or feature flag sent by the browser. Resolve subscription
> entitlements **on the server**.

### Module 18 — Notifications and communication

In-app notifications · email verification and password reset · staff invitations ·
low-stock and expiry alerts · purchase approval notifications · shift closing and cash
discrepancy alerts · failed payment and renewal reminders · subscription expiry
warnings · order-ready notifications · scheduled sales summaries · configurable
recipient preferences · retry policies and failed-delivery monitoring · templates and
delivery logs.

> Use queues for non-critical delivery. Do not let an unavailable email provider block a
> successfully committed sale.

### Module 19 — Internationalization and Bangladesh readiness

Configurable currency and display formats · tenant/branch timezone support ·
localization-ready labels · regional tax rules and rounding policies · configurable
invoice/receipt requirements · payment-provider interface for cards, cash and regional
services · provider-specific webhook verification · localized dates, numbers and
reports · multiple languages including **Bangla and English** · country-specific company
and tax settings · configurable service charges and tips · data export and retention
policies.

> Do not hard-code a single currency, tax rate, payment gateway or country's invoice
> rules into core business logic.

### Module 20 — SaaS maintenance, operations and audit

Application and API error monitoring · structured logs with request/tenant/branch/user
correlation IDs · queue depth, failed jobs and retry monitoring · scheduler execution
monitoring · database performance and connection health · cache and storage health ·
automated database backups · backup retention and **restore testing** · file upload
limits and access control · security event history · tenant-aware support diagnostics ·
dependency and deployment health · migration tracking · incident history and recovery
runbooks · data retention and tenant deletion/export procedures.

> Maintenance actions must be permission-controlled, auditable and safe for production data.

---

## 6. Key user journeys

### 6.1 Onboarding → first sale (MVP journey)

Register → verify email → tenant created with trial → onboarding wizard →
company + first branch → menu/products → opening stock → invite staff →
payment/receipt setup → guided test sale → activation checklist complete.

### 6.2 The POS transaction that must never break

1. **Validate sale** — tenant, branch, cashier, product availability, prices, tax, permissions.
2. **Calculate and persist order** — server-calculated totals, immutable price snapshots, unique order identifier.
3. **Process payment safely** — atomic DB writes for internal cash payments; idempotent provider workflow for external payments.
4. **Commit confirmed business state** — payment record, order status, required stock/cash movements.
5. **Trigger secondary work** — kitchen tickets, receipt delivery, notifications, analytics jobs.

> External gateways require special treatment: a network request cannot participate in a
> DB transaction. Use a durable payment state machine, provider idempotency, verified
> webhooks and reconciliation for uncertain outcomes. **Do not mark an order paid simply
> because a payment request was sent.**

### 6.3 Shift close → daily reconciliation

Open shift with float → sales/payments accrue → cash movements → close shift with
counted cash → overage/shortage → shift summary → reconcile payment methods against
settlements → day's numbers match reports.

---

## 7. Non-functional requirements

- **Performance:** POS product search and cart interactions feel instant; server-side
  pagination for large tables; query profiling before optimization.
- **Reliability:** critical state changes confirmed before reporting success; retry-safe
  jobs; no duplicate sales or charges.
- **Security:** tenant/branch isolation on every endpoint, query, job, export and file op;
  secrets and private files protected.
- **Auditability:** traceable stock and financial movements with source references;
  immutable history for finalized transactions.
- **Accessibility:** accessible contrast, visible focus states, keyboard navigation.
- **Localization:** no hard-coded currency/tax/gateway/locale in core logic.
- **Maintainability:** modular monolith; business logic in services, not giant controllers.

---

## 8. Explicitly out of scope (initial release)

Staged for later phases (see [ROADMAP.md](./ROADMAP.md)):

- Offline-first POS with synchronization and conflict resolution.
- Full double-entry general ledger.
- Advanced loyalty campaigns and segmentation.
- Live driver tracking and third-party marketplace sync.
- Batch/expiry/lot tracking (unless a tenant requires it early).
- Microservices split — this is a modular monolith by design.

---

## 9. Definition of done (per phase)

Every phase must finish with:

- Verified end-to-end business journey.
- Permission and tenant-isolation tests.
- Validation, error and rollback tests.
- Automated regression coverage.
- Responsive and desktop UX review.
- Query/performance review appropriate to the feature.
- Audit log verification for sensitive operations.
- Migration and rollback assessment.
- A concise report of changes, test results and remaining risks.

> Do not proceed automatically to the next phase. Confirm the current phase is complete,
> document remaining issues and wait for explicit approval.

---

## 10. Open questions

1. Database: MySQL or PostgreSQL? (Deployment/team expertise dependent.)
2. Permission package: Spatie Laravel Permission vs. bespoke tables?
3. Accounting depth for MVP: operational cash management vs. full double-entry ledger?
4. Primary payment provider(s) — especially for Bangladesh regional services?
5. Default languages/locales and currency set at launch?
