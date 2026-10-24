# Marketing catalog: Products and Solutions

Source of truth: `resources/js/Components/Marketing/Catalog/catalog.ts`. Slugs are also whitelisted in
`MarketingController::productPage()` and `::solution()`, so add a slug in both places.

## Products (`/products/{slug}`), each mapped to shipped functionality
| Slug | Backed by |
|---|---|
| qr-ordering | `routes/web.php` qr.* and qr-dining.* routes, `AcceptanceStatus`, `BillRequestStatus` |
| digital-menu | menu.*, modifiers.* routes, `RecipeItem`, CSV import and export |
| table-management | tables.* routes, `TableStatus`, table transfer |
| order-management | orders.* routes, `OrderType`, `AcceptanceStatus`, `FulfillmentStatus` |
| kitchen-display | kitchen.* routes, `KitchenTicketStatus`, `KitchenItemStatus`, priority |
| billing-payments | settle, receipt, shifts, `PaymentMethodType`, SSLCommerz and bKash gateways |
| reports | `ReportService` (sales, collected, orders, products), presets today/week/month, CSV |
| branch-management | branches.*, branch switch, transfers (`TransferStatus`) |
| staff-roles | staff.*, roles.*, invitations, revoke sessions |
| inventory | inventory.*, purchasing.*, waste.* (plan features) |

## Solutions (`/solutions/{slug}`)
Workflow solutions live in `SOLUTION_WORKFLOWS` and render `Solutions/Workflow.tsx`. The older business-type
solutions (restaurants, cafes, and so on) still render `Solutions/Show.tsx`.

## Motion
`Scenes/blocks.tsx` (SceneHost, Phone, Panel, Chip), `Scenes/productScenes.tsx` (one scene per product),
`Scenes/Flow.tsx` (swimlane and comparison flows for solutions). Scenes play once when visible, then rest
on their final frame. Reduced-motion visitors get the final frame.

## Redirects
`/product` goes to `/products`. `/features/{kitchen-display, table-management, menu-management,
order-management, reports-analytics, staff-management, multi-branch-management, inventory-management}`
301 to the matching product page.
