# Demo data

Every new owner can start in a **fully populated workspace** instead of an empty one. The demo
is real application data — created through the same services as live trade — plus a ledger that
makes it **exactly removable**.

- **Offered by default** on the wizard's Review step (uncheck to start empty).
- **Built after activation** on `/demo/setup`, one step per request, with visible progress.
- **Managed** from **Settings → Demo data** (status, coverage, run history, rebuild, remove) and
  from the banner on the dashboard.

Code lives in `app/Domain/Demo/` (service, steps, catalogs) with the UI in
`resources/js/Pages/Demo/Setup.tsx`, `resources/js/Pages/Settings/Demo.tsx` and
`resources/js/Components/Demo/DemoBanner.tsx`.

## What it creates

| Area | Content |
|---|---|
| Team & roles | ~12 staff with real names and role assignments, 2 tenant-defined roles, branch access, manager PINs for approvals |
| Branch | A second branch with mirrored hours, till, stock location and cash account (the owner's own branch is untouched) |
| Menu | 8–9 categories, ~50 products with prices, costs, labels, size variants, modifier groups, recipes and per-branch availability |
| Floor | Dining areas, ~20 tables with mixed covers, QR token per table, table staff |
| Kitchen | Stations per branch; a ticket per order with a realistic lifecycle, the newest few left live |
| Sales | 15–60 days (default **21**) of orders through the POS engine: shifts, payments, cash movements, invoices, kitchen history, voids |
| QR dining | Closed sessions with participants and feedback, plus live sessions with orders awaiting approval |
| Guests | ~38 customers (repeat visits weighted), loyalty accrual and redemptions |
| Inventory | ~40 ingredients, recipes, opening stock, low-stock items, suppliers, purchase orders at every lifecycle stage, stock transfers |
| Back office | Waste (including records awaiting approval), expenses across categories, account ledger entries |
| Images | Flat menu illustrations copied to `storage/app/public/demo/menu/` and attached per product |

Region decides the catalog: `BDT`/`BD` tenants get the Bangladeshi menu, names and prices;
everyone else gets the international bistro catalog.

## Removing it

**Settings → Demo data → Remove all demo data** (or the dashboard banner). The action requires
typing the workspace slug.

Removal replays the ledger — a table of every row each run created — children first, in chunks:

- Only demo rows are deleted. The owner's own orders, staff, branches, settings and the **audit
  trail** are not touched.
- **Numbering counters are kept** (orders, purchase orders, receipts, transfers). They are
  counters rather than records: resetting them would restart numbering at 0001 and collide with
  real orders that kept their own numbers. Generation also lifts a counter to the highest number
  already in use, so a demo can never collide with real trade.
- Settings the demo changed (loyalty, low-stock threshold, waste approval threshold) are restored
  from the values captured when the run started.
- Notifications and usage snapshots created while demo data existed are cleared.
- Batches keep a `removed` record, so the run history and the fact that data was removed stay
  auditable.

Two honest consequences:

- A **real** record created while the demo existed keeps its own name/price snapshots but loses
  the link to a deleted demo product (deleting the real record would be worse).
- Demo rows do **not** count toward plan limits (branches, users, orders); usage and limits show
  real numbers only.

## Command line

```bash
php artisan demo:seed 1 --days 15      # generate (or resume) for tenant 1
php artisan demo:seed owner --fresh    # remove previous demo data, then generate
php artisan demo:purge 1 --force       # remove all demo data, no prompt
```

Both commands are also available in **Platform → Operations → Commands** (`demo_seed`,
`demo_purge`), which is the route to use on hosts without SSH.

## Host notes

- **No queue worker is required.** Generation is driven by HTTP requests from the progress
  screen, or by the artisan command; nothing is pushed to a queue.
- **Menu images** need the public storage link (`php artisan storage:link`, also available as the
  *Link storage* command). Without it images are skipped and products fall back to the branded
  tile — nothing breaks.
- Generation writes a large amount of data (~20k traced rows for 15 days). One day of trade is
  one request, which keeps each call well inside normal PHP limits; a failed step is resumable
  and never duplicates orders (deterministic idempotency keys).
- The current day only covers the hours that have already elapsed, so a fresh demo generated
  before the restaurant opens has no "today" figures — the last 15–21 days are complete.

## Known limitations

- Staff created by the demo cannot sign in (random password); they exist to show roles, staff
  lists and attribution. Invite real staff from Staff after removing the demo.
- The demo does not touch billing, subscriptions or platform-level records.
- Per-row `data_mode` separation is not used; provenance and removal are handled by the ledger.
