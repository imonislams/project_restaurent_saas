# UI/UX Specification

**Related docs:** [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md)

> Build a **real business application**, not a generic AI-generated dashboard. The main
> application should feel like a professional Windows/macOS business application, not a
> marketing website or mobile dashboard stretched across a monitor.

---

## 1. Application shell (tenant)

### 1.1 Layout rules

- Fixed or collapsible left sidebar.
- Compact top navigation with branch switcher and global search.
- Main content area fills available viewport height.
- Consistent page titles, breadcrumbs and primary actions.
- Compact, readable tables with server-side pagination.
- Professional typography, restrained colors, subtle borders.
- Consistent modal, drawer, confirmation and notification patterns.
- No excessive gradients, oversized cards or unnecessary animation.
- Keyboard navigation, accessible contrast, visible focus states.
- Proper loading, empty, error and success states on every major screen.

### 1.2 Sidebar navigation (conceptual)

```
Restaurant Workspace
Branch: Main Restaurant
  Overview
  POS Terminal
  Kitchen Display
  Tables & Orders
  Menu & Products
  Inventory
  Purchases & Suppliers
  Customers & Staff
  Cash & Expenses
  Reports & Analytics
  Subscription
  Settings
```

> Permission-aware navigation: users see only the modules relevant to their role.
> Hide in UI **and** enforce on the server.

---

## 2. Screen-by-screen requirements

| Screen | Required UI components |
|--------|------------------------|
| Login | Email/password, validation, recovery, session handling |
| Onboarding | Stepper, progress, save/resume, setup checklist |
| Dashboard | Today's KPIs, sales trend, payment breakdown, stock alerts, recent activity |
| POS | Product grid, search, cart, order types, discounts, payment, receipt |
| Orders | Filterable order table, status, payment, refund, receipt actions |
| Tables | Floor layout, occupancy, table details, order assignment |
| Kitchen | Ticket columns, timers, station filters, status actions |
| Menu | Category navigation, product list, pricing editor, availability |
| Inventory | Stock summary, movement ledger, adjustment form, low-stock alerts |
| Purchasing | Supplier selector, purchase order, receive goods, payment status |
| Cash | Open shift, cash movements, expected balance, closing reconciliation |
| Expenses | Category filters, entry form, approvals, attachments |
| Reports | Date/branch filters, summary cards, charts, detailed tables, exports |
| Team | Staff directory, invitations, role editor, branch restrictions |
| Settings | Company, branches, taxes, receipt, payment, operational configuration |
| SaaS admin | Tenant table, subscription details, health monitoring, audit logs |

---

## 3. POS terminal layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ Top bar: Branch ▾ | Shift | ● Connection | User ▾ | Clock             │
├────────────┬────────────────────────────────────┬────────────────────┤
│ Left panel │ Center panel                       │ Right panel        │
│            │                                    │ (persistent cart)  │
│ Categories │ Searchable product grid            │  Items + qty       │
│ Favorites  │ (price · image · availability)     │  Modifiers         │
│ Filters    │                                    │  Discounts         │
│            │                                    │  Totals            │
├────────────┴────────────────────────────────────┴────────────────────┤
│ Bottom action area: Hold | Customer | Payment | Print | Complete sale │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 4. POS interaction principles

1. The cashier must reach product selection **immediately** after entering POS.
2. Product selection must **not** require opening a new page per item.
3. The cart remains **visible** during ordering.
4. Common actions use clear, consistent **keyboard shortcuts**.
5. Payment displays the **full breakdown** before final confirmation.
6. Success is shown **only after the server confirms** the transaction.
7. Repeated clicks must **not** create duplicate sales or charges.
8. If printing fails after a sale, the sale remains recorded and the cashier can **retry
   printing without repeating payment**.
9. If the connection fails, the app must clearly distinguish a **failed request** from an
   **unknown transaction outcome**.
10. The application should retain a recoverable draft where safe, but must **never invent
    a successful payment**.

---

## 5. Keyboard shortcuts

| Key | Action |
|-----|--------|
| `F2` | Product search |
| `F4` | Payment |
| `F6` | Hold order |
| `F8` | Resume order |
| `Esc` | Close dialog / cancel current interaction |
| `Ctrl/Cmd + K` | Global search (where appropriate) |

Rules:

- Configurable and documented.
- Avoid shortcuts that conflict with browser or OS controls.
- Every critical action must **also** remain accessible by mouse and touch.

---

## 6. Desktop-app-like behavior

- Full-height workspace with compact navigation.
- Persistent sidebar for management modules.
- Full-screen POS mode.
- Resizable panels where useful.
- Keyboard navigation and visible focus states.
- Fast search and minimal page reloads.
- Toast notifications and inline validation.
- Modal or side-panel editing for frequent actions.
- Confirmation dialogs for destructive or irreversible actions.
- Session-expiry warning and safe recovery of unfinished drafts.
- Responsive fallback for tablets and smaller screens.

> A desktop-first browser app is **not** automatically an offline app. Offline
> transactions need a separate synchronization, conflict-resolution and payment-safety
> design.

---

## 7. Visual system

- **Typography:** one professional sans-serif family; clear hierarchy (page title,
  section, body, meta).
- **Color:** restrained palette; a single primary accent; semantic colors for
  success/warning/danger; sufficient contrast.
- **Spacing:** consistent 4/8px scale; compact density suited to data-heavy screens.
- **Borders:** subtle; separate regions without heavy shadows.
- **Components:** one set of buttons, inputs, selects, dialogs, drawers, tables, toasts
  reused everywhere.
- **Focus:** always visible; never remove focus outlines.

---

## 8. States checklist (every major screen)

- **Loading** — skeleton or spinner, no layout jump.
- **Empty** — explanation + primary action.
- **Error** — clear message + recovery action.
- **Success** — confirmation (toast/inline) tied to server confirmation.
- **Permission denied** — clear message, no data leak.
