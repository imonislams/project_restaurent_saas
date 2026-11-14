import type { DocGuide } from '../types';

const shot = (name: string) => `/documentation/screens/${name}.jpg`;

/**
 * Full documentation for every module in the build.
 *
 * Labels, routes and permissions were verified against the current codebase and
 * against live captures from the demo restaurant. Screenshots under
 * /documentation/screens are real captures, not mockups.
 */
export const GUIDES: DocGuide[] = [
    // ---------------------------------------------------------------------
    // Start here
    // ---------------------------------------------------------------------
    {
        slug: 'getting-started',
        title: 'Getting Started',
        group: 'start',
        icon: 'book',
        summary: 'The first five things to do in a new Touch Dine workspace, in the order that avoids rework.',
        featured: true,
        popular: true,
        readMinutes: 7,
        sections: [
            {
                id: 'before-you-start',
                title: 'Before you start',
                body: 'A workspace is ready to use once onboarding has created the restaurant profile, one branch and at least one payment method. If you were invited by an owner you can skip straight to the Dashboard.',
                bullets: [
                    'You need the Owner or Admin role to change company-wide settings.',
                    'Branch staff only see the branches they are assigned to, plus the modules their role permits.',
                    'The plan must include a module before it appears in the sidebar — Kitchen Display requires the kitchen feature, for example.',
                ],
            },
            {
                id: 'first-five',
                title: 'The first five steps',
                steps: [
                    {
                        title: '1. Finish onboarding',
                        detail: 'Complete Restaurant profile, Company details, first Branch, Opening hours, Tax, Receipt, Payments, initial Menu and Team. The wizard resumes at the first incomplete step until it is finished.',
                    },
                    {
                        title: '2. Check your branch',
                        detail: 'Open Branches and confirm the primary branch, timezone and currency. Every order, table, stock balance and report is scoped to a branch.',
                    },
                    {
                        title: '3. Build the menu',
                        detail: 'Open Menu & Products, create categories first, then products with prices for Dine-in, Takeaway and Delivery. Import CSV is available if you already have a product list.',
                    },
                    {
                        title: '4. Add your team',
                        detail: 'Open Staff and invite each person, choosing Roles & Privileges and the branches they may work in. Owners and Admins can switch branch; everyone else is limited to their assignments.',
                    },
                    {
                        title: '5. Open a shift and sell',
                        detail: 'Open POS Terminal, open a cash register shift with an opening float, then build an order and complete payment. Kitchen Display and Table QR Codes can be enabled alongside.',
                    },
                ],
            },
            {
                id: 'workspace',
                title: 'How the workspace is organised',
                body: 'The sidebar is grouped by job rather than by department. Only modules your role and plan allow are rendered, so two team members can see different menus on the same restaurant.',
                table: {
                    columns: ['Sidebar group', 'What lives there'],
                    rows: [
                        ['Overview', 'Dashboard and the current trading summary'],
                        ['Operations', 'POS Terminal, Orders, Tables & Floor, Kitchen Display, Table QR Codes, QR Designer, QR Analytics'],
                        ['Menu Management', 'Menu & Products, Modifiers & Add-ons'],
                        ['Business Management', 'Customers, Staff, Roles & Permissions, Inventory, Purchasing, Waste & Loss, Stock Transfers, Expenses, Accounts, Bills & Invoices, Reports'],
                        ['Settings', 'Branches, Delivery Zones, Subscription, Settings'],
                        ['Resources', 'This Documentation centre'],
                    ],
                },
                callout: {
                    tone: 'info',
                    title: 'Search anything with ⌘K / Ctrl+K',
                    body: 'The command palette in the top bar jumps to any page you have access to. It is the fastest way to reach a module when the sidebar is collapsed.',
                },
            },
            {
                id: 'dashboard-tour',
                title: 'Your landing page',
                body: 'Every tenant role lands on the Dashboard after signing in. It opens on the Overview group and shows the restaurant name, timezone and currency above the analytics.',
                screenshot: {
                    src: shot('dashboard'),
                    alt: 'Dashboard with KPI cards and sales performance charts',
                    caption: 'Dashboard captured on the demo restaurant for a 30-day period.',
                },
            },
            {
                id: 'how-to-read',
                title: 'How to use this centre',
                body: 'Every module page follows the same shape: what the screen is for, an annotated screenshot of the real screen, the step-by-step actions, and the permission each action needs. Screenshots are live captures from this application.',
                callout: {
                    tone: 'info',
                    title: 'Video walkthroughs are included',
                    body: 'The Video Tutorials section plays short recorded walkthroughs captured from this application, with chapters and fullscreen playback.',
                },
            },
        ],
        related: ['orders', 'menu-products', 'staff', 'settings'],
    },
    {
        slug: 'dashboard',
        title: 'Dashboard',
        group: 'start',
        icon: 'grid',
        summary: 'Read the trading snapshot, change the reporting period, and print or export the overview.',
        permission: 'dashboard.view',
        routeName: 'dashboard',
        readMinutes: 4,
        sections: [
            {
                id: 'what-it-shows',
                title: 'What the dashboard shows',
                body: 'The Overview page renders the restaurant name as its heading and the workspace timezone and currency underneath. The analytics body covers sales performance, top products, busiest hours, payment mix, order source, order type, order status, profitability, customer segments, top customers, branch comparison and staff performance.',
                screenshot: {
                    src: shot('dashboard'),
                    alt: 'Dashboard analytics with KPI cards and charts',
                    caption: 'Demo restaurant, 20 October to 11 November.',
                },
            },
            {
                id: 'period',
                title: 'Changing the period',
                steps: [
                    { title: 'Pick a preset', detail: 'Today, This Week, This Month or Custom. Each reloads the analytics for that range.' },
                    { title: 'Compare', detail: 'The subtitle shows the period being compared with the previous equal-length period.' },
                    { title: 'Read the KPIs', detail: 'Primary and secondary KPI grids sit above the charts; every block below is scoped to the same range.' },
                ],
            },
            {
                id: 'header-actions',
                title: 'Header actions',
                table: {
                    columns: ['Control', 'What it does', 'Permission'],
                    rows: [
                        ['Print', 'Opens the browser print dialog with the document title set to Overview.', 'dashboard.view'],
                        ['Export CSV', 'Downloads the current period as overview-{from}-to-{to}.csv.', 'dashboard.view'],
                        ['Continue setup', 'Only while onboarding is incomplete; links back into the wizard.', 'settings.manage'],
                    ],
                },
            },
            {
                id: 'scope',
                title: 'Branch and permission scope',
                body: 'A user without tenant-wide branch access only sees branches they are assigned to, and a user without dashboard.view cannot open the page at all. Branch comparison lists only branches in that scope.',
            },
        ],
        related: ['getting-started', 'reports'],
    },
    {
        slug: 'restaurant-setup',
        title: 'Restaurant Setup',
        group: 'start',
        icon: 'store',
        summary: 'The onboarding wizard: profile, company, branch, hours, tax, receipt, payments, menu and team.',
        permission: 'settings.manage',
        routeName: 'onboarding.index',
        readMinutes: 6,
        sections: [
            {
                id: 'steps',
                title: 'Wizard steps',
                body: 'Signing in to a workspace that has not finished setup redirects to the first incomplete onboarding step. Steps can be completed in any order once the required fields for that step are supplied.',
                steps: [
                    { title: 'Profile', detail: 'Your name and contact details as the workspace owner.' },
                    { title: 'Company', detail: 'Legal restaurant name, currency, timezone and locale.' },
                    { title: 'Branch', detail: 'First location: name, code, address and service types.' },
                    { title: 'Hours', detail: 'Opening hours used for service reporting and storefront messaging.' },
                    { title: 'Tax', detail: 'Default tax name, rate and whether prices include tax.' },
                    { title: 'Receipt', detail: 'Receipt header, footer and the details printed on customer copies.' },
                    { title: 'Payments', detail: 'Enable the payment methods the branch accepts.' },
                    { title: 'Menu', detail: 'Seed categories and a starter product list, or skip and import later.' },
                    { title: 'Team', detail: 'Invite the first staff members and assign their roles.' },
                ],
            },
            {
                id: 'after-onboarding',
                title: 'Changing setup later',
                body: 'Once onboarding is complete the same fields live in Settings. Company & Region, Branch, Team, Opening Hours, Tax and Receipt each have their own tab, and Payment Gateways has a dedicated screen.',
                screenshot: {
                    src: shot('settings'),
                    alt: 'Settings screen with tab navigation',
                    caption: 'Settings → Company & Region, where post-onboarding changes are made.',
                },
            },
        ],
        related: ['settings', 'branches', 'menu-products'],
    },

    // ---------------------------------------------------------------------
    // Daily operations
    // ---------------------------------------------------------------------
    {
        slug: 'orders',
        title: 'Orders',
        group: 'operations',
        icon: 'receipt',
        summary: 'Find, filter, confirm, settle and void orders across every channel, with the exact buttons and their behaviour.',
        featured: true,
        popular: true,
        readMinutes: 9,
        permission: 'orders.view',
        routeName: 'orders.index',
        roles: ['tenant_owner', 'tenant_admin', 'branch_manager', 'supervisor', 'cashier', 'table_staff', 'auditor'],
        sections: [
            {
                id: 'overview',
                title: 'Where orders come from',
                body: 'The Orders page is the shared ledger for every sales channel. An order can be created by the POS Terminal, parked as a held ticket, generated by a QR dining session, or created for delivery with a zone and driver.',
                bullets: [
                    'POS orders are created either as a settled sale (Pay & complete) or a parked kitchen ticket (F8).',
                    'QR orders start as Awaiting confirmation when the branch requires staff approval.',
                    'Held orders remain open and settle later from the Orders list or the POS Held Orders panel.',
                ],
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'Click any numbered marker, or the matching explanation below it, to see exactly what the control does, where it navigates and what result to expect. The screenshot is a live capture from the demo restaurant.',
                annotated: 'orders-list',
            },
            {
                id: 'filters',
                title: 'Filtering and finding an order',
                steps: [
                    { title: 'Pick a period', detail: 'Today, Yesterday, Last 7 Days or Last 30 Days. The preset re-queries the list immediately.' },
                    { title: 'Narrow by confirmation', detail: 'All confirmation, Awaiting confirmation, Confirmed, Rejected or Auto-accepted — the fastest way to find QR orders waiting on staff.' },
                    { title: 'Search quickly', detail: 'Type an order number or table into Quick filter (Order #, table).' },
                    { title: 'Use the detailed filters', detail: 'From Date, To Date, Status, Order Channel and Branch. Press Apply Filters to run them together.' },
                ],
                callout: {
                    tone: 'info',
                    title: 'Branch filter and branch access',
                    body: 'The Branch filter only lists branches your account can access. Staff without tenant-wide access see their assigned branches by default.',
                },
            },
            {
                id: 'accepting',
                title: 'Accepting or rejecting an order',
                body: 'Orders that need confirmation show Accept and Reject on the row. Accepting moves the order into the kitchen workflow. Rejecting requires a reason and is recorded in the audit trail.',
                steps: [
                    { title: 'Accept', detail: 'Confirm & Send to Kitchen on the order page, or Accept on the list. Requires orders.approve.' },
                    { title: 'Reject', detail: 'Opens the Reject Order dialog. A reason is required; the order is marked Rejected and stays in the ledger.' },
                ],
            },
            {
                id: 'detail-actions',
                title: 'Actions on the order page',
                table: {
                    columns: ['Control', 'What it does', 'Permission'],
                    rows: [
                        ['Receipt', 'Opens the printable receipt for the order.', 'orders.view'],
                        ['Confirm & Send to Kitchen', 'Accepts a pending order and sends tickets to the KDS.', 'orders.approve'],
                        ['Reject', 'Opens the rejection dialog and requires a reason.', 'orders.approve'],
                        ['Settle Order ({total})', 'Opens Settle Order Balance for an open, unsettled order.', 'orders.update'],
                        ['Void Order', 'Opens the irreversible void confirmation. Manager PIN required.', 'orders.void'],
                        ['Mark {status} →', 'Advances the fulfillment status (e.g. Mark Preparing →).', 'orders.update'],
                    ],
                },
            },
            {
                id: 'settle',
                title: 'Settling a balance',
                body: 'Settle Order Balance shows the outstanding total. Choose a payment method, enter the cash received (or use an exact-amount preset), confirm the calculated change, and add a Manager PIN when the amount or discount policy requires approval.',
                bullets: [
                    'Cash Received and Quick Denominations fill the tender amount.',
                    'Change Due recalculates as the tender changes.',
                    'Complete Payment posts the settlement and returns to the order, where Payments Tendered and Financial Reconciliation update.',
                ],
            },
            {
                id: 'void',
                title: 'Voiding an order',
                body: 'Voiding is irreversible. The confirmation dialog repeats the order number, shows the Irreversible Action warning, and requires a Manager PIN. Use Reject for orders that never entered production; use Void for orders that were already rung up.',
                callout: {
                    tone: 'warning',
                    title: 'Void needs the permission and the PIN',
                    body: 'The Void Order button only renders when you hold orders.void and the order can still be voided. The PIN is validated server-side by the manager approval service.',
                },
            },
            {
                id: 'permissions',
                title: 'Who can do what',
                table: {
                    columns: ['Permission', 'Unlocks'],
                    rows: [
                        ['orders.view', 'Orders list and order detail'],
                        ['orders.create', 'Creating orders through the order endpoints'],
                        ['orders.update', 'Settlement, fulfillment transitions and edits'],
                        ['orders.approve', 'Accept and Reject on pending orders'],
                        ['orders.void', 'Void Order'],
                        ['orders.refund', 'Refund flows on settled payments'],
                    ],
                },
            },
        ],
        related: ['pos-checkout', 'kitchen-display', 'qr-ordering', 'button-reference'],
    },
    {
        slug: 'pos-checkout',
        title: 'POS & Checkout',
        group: 'operations',
        icon: 'cart',
        summary: 'Open a shift, build a cart, apply discounts, split payments and close the drawer to the penny.',
        featured: true,
        popular: true,
        readMinutes: 10,
        permission: 'pos.use',
        routeName: 'pos.index',
        roles: ['tenant_owner', 'tenant_admin', 'branch_manager', 'supervisor', 'cashier'],
        sections: [
            {
                id: 'before-you-sell',
                title: 'Before the first sale',
                steps: [
                    { title: 'Confirm the branch', detail: 'The POS header shows the branch and lets you switch it. Products, prices, tables and stock all follow that branch.' },
                    { title: 'Open a shift', detail: 'Click No open shift · Open Shift, enter the Opening Float Amount, then Open Shift. A shift is required before payment can complete.' },
                    { title: 'Check the drawer', detail: 'The shift badge shows the shift number, who opened it and the expected cash. Drawer / Movements records cash in and cash out with a reason.' },
                ],
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'The real terminal with an open shift. Markers point at the header controls, the order-type panel, the catalog and the two primary actions.',
                annotated: 'pos-terminal',
            },
            {
                id: 'build-cart',
                title: 'Building a cart',
                bullets: [
                    'Pick a category on the left, or search by name, SKU or barcode. F2 focuses search.',
                    'Tapping a product tile adds it; a product with variants opens a chooser.',
                    'Sold-out products are shown as Sold out and cannot be added when stock tracking blocks them.',
                    'Use − / + or the quantity field to change counts, Remove to delete a line, and + Note for kitchen instructions.',
                ],
            },
            {
                id: 'order-types',
                title: 'Order types',
                table: {
                    columns: ['Type', 'Required fields'],
                    rows: [
                        ['Dine-in', 'Table and Covers. Payment is blocked until a table is selected.'],
                        ['Takeaway', 'Optional customer name.'],
                        ['Delivery', 'Customer name, zone, street address, driver name and driver phone.'],
                        ['Counter', 'Optional customer name.'],
                    ],
                },
            },
            {
                id: 'discounts',
                title: 'Discounts, service charge and totals',
                body: 'The discount control offers No Discount, Discount (%) and Discount (currency), with 5/10/15/20 percent presets. Service charge is a checkbox at the configured rate. Totals show Subtotal, Discount, Delivery Fee, Tax, Service and Total Due.',
                callout: {
                    tone: 'warning',
                    title: 'High discounts need approval',
                    body: 'When the discount exceeds the configured threshold, the checkout dialog asks for a Manager PIN. Without it the sale cannot be completed.',
                },
            },
            {
                id: 'checkout',
                title: 'Checkout and payment',
                steps: [
                    { title: 'Pay & complete (F4)', detail: 'Opens Payment & Checkout. Blocked when the cart is empty, no shift is open, or a dine-in order has no table.' },
                    { title: 'Choose single or split', detail: 'Single Payment uses one method. Split Payment adds rows with + Add Method and shows Split Total and Remaining to cover.' },
                    { title: 'Tender the amount', detail: 'For cash, enter Cash Received or tap a quick denomination; Change Due updates automatically.' },
                    { title: 'Complete Sale (Enter)', detail: 'Posts the order and payment. Offline, the sale is queued in the local outbox and synced when the connection returns.' },
                ],
            },
            {
                id: 'held-orders',
                title: 'Parking tickets and held orders',
                body: 'Park / Kitchen Ticket (F8) saves the cart as an open order and sends it to the kitchen when your role may update orders. Roles without orders.update see Submit for Confirmation (F8) instead, which creates the order for a supervisor to accept.',
                bullets: [
                    'Held Orders opens a panel listing open tickets with View / Settle →.',
                    'Clear cart asks for confirmation before emptying the current sale.',
                ],
            },
            {
                id: 'shift-close',
                title: 'Closing the drawer',
                steps: [
                    { title: 'Count the cash', detail: 'Open the shift panel and enter Counted Cash in Close Shift & Reconcile.' },
                    { title: 'Read the variance', detail: 'Calculated Variance compares counted cash to expected cash after recorded movements.' },
                    { title: 'Close Register & Reconcile Shift', detail: 'Requires a Manager PIN. The closure is written to the shift and cash movement ledger.' },
                ],
            },
            {
                id: 'shortcuts',
                title: 'Keyboard shortcuts',
                table: {
                    columns: ['Key', 'Action'],
                    rows: [
                        ['F2', 'Focus product search / barcode'],
                        ['F4', 'Open payment and checkout'],
                        ['F8', 'Park the cart as a kitchen ticket'],
                        ['Esc', 'Close the current dialog'],
                        ['Enter', 'Confirm the active dialog'],
                    ],
                },
            },
        ],
        related: ['orders', 'kitchen-display', 'payments', 'tables-floor'],
    },
    {
        slug: 'tables-floor',
        title: 'Tables & Floor',
        group: 'operations',
        icon: 'table',
        summary: 'Build the dining room, change table status, follow open tabs and move an order between tables.',
        readMinutes: 7,
        permission: 'tables.view',
        routeName: 'tables.index',
        roles: ['tenant_owner', 'tenant_admin', 'branch_manager', 'supervisor', 'table_staff', 'cashier'],
        sections: [
            {
                id: 'views',
                title: 'Floor grid and list view',
                body: 'Tables & Floor Plan opens on the floor grid: one card per table showing its area, status, capacity and any active tab. Floor Grid and List View switch the presentation without changing the data.',
                bullets: [
                    'KPI cards summarise Total Tables, Available Now, Occupied, Turnaround and the Active Tabs Pipeline.',
                    'Area tabs filter the room (All Areas plus one tab per dining area).',
                    'Status pills filter by table status, and the search box matches table or area names.',
                ],
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'Live floor with three dining areas. Markers cover creating a table, switching views, filtering, and the actions on a table card.',
                annotated: 'tables-floor',
            },
            {
                id: 'add-table',
                title: 'Adding or editing a table',
                steps: [
                    { title: 'Add Table', detail: 'Opens the Add New Table drawer. Requires tables.manage.' },
                    { title: 'Fill the fields', detail: 'Table Name / Identifier, Seat Capacity, Sort Order, Dining Area, Branch and Assigned Staff.' },
                    { title: 'Save', detail: 'Create Table posts the new table; Edit Table reuses the same drawer and saves with Save Changes.' },
                ],
            },
            {
                id: 'status',
                title: 'Managing table status',
                body: 'Open Details & Status on a table card to change its state. Set Table Status writes the new status immediately and updates the floor grid for every user on that branch.',
            },
            {
                id: 'tabs',
                title: 'Open tabs and transfers',
                steps: [
                    { title: 'Open Orders & Tabs', detail: 'Lists the open orders attached to the table, each linking to the order page with View & Settle →.' },
                    { title: 'Transfer Order to this Table', detail: 'Choose the order to move and press Move Order Here. The table changes on both orders and the floor updates.' },
                    { title: 'Remove Table', detail: 'Available from the detail drawer and the trash icon. A confirmation dialog is shown before the table is deleted.' },
                ],
                callout: {
                    tone: 'warning',
                    title: 'Removing a table with history',
                    body: 'Deleting a table is permanent. Close and settle any open tab first so the order keeps a valid table reference.',
                },
            },
        ],
        related: ['pos-checkout', 'qr-ordering', 'orders'],
    },
    {
        slug: 'kitchen-display',
        title: 'Kitchen Display',
        group: 'operations',
        icon: 'fire',
        summary: 'Run the line from New to Handed Over, with station filters, urgency flags, item-level readiness and ticket printing.',
        featured: true,
        readMinutes: 8,
        permission: 'kitchen.view',
        routeName: 'kitchen.index',
        roles: ['tenant_owner', 'tenant_admin', 'branch_manager', 'supervisor', 'kitchen_staff'],
        sections: [
            {
                id: 'opening',
                title: 'Opening the KDS',
                body: 'Kitchen Display opens in its own browser tab so it can run full screen on the line without disturbing the admin workspace. The header shows Live KDS, a branch selector and the station tabs.',
                callout: {
                    tone: 'info',
                    title: 'One tab per kitchen screen',
                    body: 'The sidebar link reuses a single named browser tab, so opening the KDS twice does not create duplicate windows on the same terminal.',
                },
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'A live board with tickets in New, In Preparation and Ready for Pickup. Markers follow a ticket from start to hand-over.',
                annotated: 'kitchen-board',
            },
            {
                id: 'columns',
                title: 'The four columns',
                table: {
                    columns: ['Column', 'Meaning', 'Moving out'],
                    rows: [
                        ['New Tickets', 'Accepted orders not yet started.', 'Start Preparing →'],
                        ['In Preparation', 'Items being cooked.', 'Mark Ready →'],
                        ['Ready for Pickup', 'Plated and waiting for the pass.', 'Hand Over → or Serve & Bump →'],
                        ['Handed Over', 'Delivered to the table or counter.', 'End state for the ticket'],
                    ],
                },
            },
            {
                id: 'ticket-actions',
                title: 'Ticket actions',
                bullets: [
                    '☆ Urgent / ★ URGENT flags a ticket so it sorts to the front; the ★ Urgent counter in the header shows the total.',
                    'The ○ / ✓ control on each item marks that item ready or back to preparing without moving the whole ticket.',
                    '← New, ← Prep and ← Ready move a ticket backwards when something was tapped by mistake.',
                    '🖨 Print opens a printable Kitchen Order Ticket with the order number, table and notes.',
                    'All Stations or a named station filters the board to that station.',
                ],
            },
            {
                id: 'display-controls',
                title: 'Display controls',
                body: 'The header carries the operational switches: Sync {n}s toggles the 60-second auto-refresh, the bell toggles sound on new tickets, the sun/moon toggles the dark line theme, ⛶ toggles fullscreen (F11), and POS → returns to the terminal.',
            },
        ],
        related: ['orders', 'pos-checkout'],
    },
    {
        slug: 'qr-ordering',
        title: 'QR Ordering',
        group: 'operations',
        icon: 'qr',
        summary: 'Generate per-table QR codes, take app-free customer orders, approve them and hand off to the kitchen.',
        readMinutes: 7,
        permission: 'qr.view',
        routeName: 'qr-dining.tables.index',
        sections: [
            {
                id: 'table-codes',
                title: 'Table QR codes',
                body: 'Table QR Codes lists every table with its code, scan count and dining status. Each card offers Preview, PNG, SVG and Print card, plus Regenerate and Revoke for users holding qr.manage.',
                screenshot: {
                    src: shot('qr-tables'),
                    alt: 'Table QR codes screen with a card per table',
                    caption: 'Table QR Codes for the demo branch, with per-table status and scan counts.',
                },
                steps: [
                    { title: 'Print all', detail: 'Prints the cards for the whole branch in one job.' },
                    { title: 'Regenerate', detail: 'Asks for confirmation and issues a new token. The previous code stops working immediately.' },
                    { title: 'Revoke', detail: 'Disables the code without deleting the table.' },
                ],
            },
            {
                id: 'customer-flow',
                title: 'Customer journey',
                body: 'Scanning opens the branded menu in the browser — no app install. The guest starts a dining session, adds products, submits the order, can request the bill, and can pay online when the gateway allows it. Tracking shows live status after submission.',
            },
            {
                id: 'staff-flow',
                title: 'Staff side',
                body: 'Depending on the branch approval setting, QR orders either enter the kitchen automatically or wait as Awaiting confirmation. Pending orders appear with an approval badge on the Orders sidebar item and are accepted or rejected from the Orders list.',
                callout: {
                    tone: 'info',
                    title: 'Approval is a permission',
                    body: 'Accept and Reject require orders.approve, so a waiter without approval rights can take orders but cannot confirm them.',
                },
            },
            {
                id: 'designer',
                title: 'Designer and analytics',
                body: 'QR Designer controls the branded menu/card artwork, including logo, colours and call to action. QR Analytics reports scans, sessions and conversion per table and per design.',
                screenshot: {
                    src: shot('qr-analytics'),
                    alt: 'QR analytics dashboard with scan and session metrics',
                    caption: 'QR Analytics for the demo branch.',
                },
            },
        ],
        related: ['orders', 'tables-floor', 'kitchen-display'],
    },

    // ---------------------------------------------------------------------
    // Menu & catalog
    // ---------------------------------------------------------------------
    {
        slug: 'menu-products',
        title: 'Products & Menu',
        group: 'catalog',
        icon: 'book',
        summary: 'Create categories and products, price every channel, track stock and import an existing catalog.',
        readMinutes: 9,
        permission: 'menu.view',
        routeName: 'menu.index',
        roles: ['tenant_owner', 'tenant_admin', 'branch_manager', 'supervisor'],
        sections: [
            {
                id: 'catalog',
                title: 'The product catalog',
                body: 'Menu & Products lists every product with its category, per-channel prices, cost price, stock mode and status. Search matches name, SKU or barcode, and category pills filter the table.',
                table: {
                    columns: ['Column', 'Meaning'],
                    rows: [
                        ['Dine-In / Takeaway / Delivery', 'Channel prices. An empty price hides the product on that channel.'],
                        ['Cost Price', 'Used for margin reporting; can be pulled from the recipe builder.'],
                        ['Stock Mode', 'Whether the product tracks stock, is always available, or is recipe-based.'],
                        ['Status', 'Active in catalog and available on POS (in stock).'],
                    ],
                },
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'The live catalog with 52 products. Markers cover bulk tools, categories, creating a product, filtering, and the two row actions.',
                annotated: 'menu-catalog',
            },
            {
                id: 'create-product',
                title: 'Creating a product',
                steps: [
                    { title: 'New product', detail: 'Opens Create New Menu Product.' },
                    { title: 'Describe it', detail: 'Product name, category, SKU and barcode, plus an optional image (Choose image, Replace image, Clear selection).' },
                    { title: 'Price the channels', detail: 'Set Dine-In, Takeaway and Delivery prices in Multi-Channel Pricing. Leave a channel blank to exclude it.' },
                    { title: 'Add variants', detail: '+ Add Variant creates size or option rows, each with its own price; ✕ removes one.' },
                    { title: 'Stock and recipe', detail: 'Choose the stock tracking mode. With recipe tracking, + Add ingredient builds the bill of materials and Use as cost price copies the computed cost.' },
                    { title: 'Publish', detail: 'Tick Active in catalog and Available on POS, then Create Product.' },
                ],
            },
            {
                id: 'categories',
                title: 'Managing categories',
                body: 'Categories (16) opens Manage Menu Categories. Add New Category creates a group, Edit renames it, Delete asks for confirmation. Categories drive both the POS category rail and the menu ordering.',
            },
            {
                id: 'import-export',
                title: 'Import and export',
                bullets: [
                    'Template downloads the CSV template with the expected columns.',
                    'Export CSV and Export PDF download the current catalog.',
                    'Import CSV uploads a filled template; the result card reports created, updated, skipped and image issues.',
                ],
                callout: {
                    tone: 'info',
                    title: 'Import is additive',
                    body: 'Rows are matched by SKU. Existing SKUs are updated rather than duplicated, and skipped rows are listed in the import result so nothing fails silently.',
                },
            },
        ],
        related: ['modifiers', 'inventory', 'pos-checkout'],
    },
    {
        slug: 'modifiers',
        title: 'Modifiers & Add-ons',
        group: 'catalog',
        icon: 'tag',
        summary: 'Reusable option groups (size, milk, extras) with min/max rules and per-option pricing.',
        readMinutes: 4,
        permission: 'modifiers.view',
        routeName: 'modifiers.index',
        sections: [
            {
                id: 'groups',
                title: 'Groups and options',
                body: 'Modifier groups are reusable across products. Each group holds options with a price delta, and can require a minimum or enforce a maximum number of selections. Attaching a group to a product makes the chooser appear when the item is added on the POS.',
                screenshot: {
                    src: shot('modifiers'),
                    alt: 'Modifiers and add-ons management screen',
                    caption: 'Modifiers & Add-ons for the demo restaurant.',
                },
            },
            {
                id: 'usage',
                title: 'Where modifiers appear',
                bullets: [
                    'On the POS, choosing a product with attached groups opens Configure modifiers with Cancel and Add to order.',
                    'Kitchen tickets print the chosen options with the item so the line sees them without opening the order.',
                ],
            },
        ],
        related: ['menu-products', 'pos-checkout'],
    },

    // ---------------------------------------------------------------------
    // Team & access
    // ---------------------------------------------------------------------
    {
        slug: 'staff',
        title: 'Staff & Permissions',
        group: 'team',
        icon: 'user',
        summary: 'Invite team members, assign roles and branches, resend invitations and revoke access.',
        readMinutes: 6,
        permission: 'staff.view',
        routeName: 'staff.index',
        sections: [
            {
                id: 'invite',
                title: 'Inviting a team member',
                steps: [
                    { title: '+ Invite Team Member', detail: 'Opens the invite drawer.' },
                    { title: 'Contact details', detail: 'Full name, email address and an optional password with Show/Hide and Generate.' },
                    { title: 'Roles & Privileges', detail: 'One or more roles. Only roles assignable to your restaurant are listed.' },
                    { title: 'Branch Access', detail: 'Leave empty for all branches, or select the specific branches the person may work in.' },
                    { title: 'Send invitation', detail: 'Emails the join link. Pending invitations can be resent or revoked from the list above the team table.' },
                ],
                screenshot: {
                    src: shot('staff'),
                    alt: 'Staff and Permissions screen with team table',
                    caption: 'Staff & Permissions with pending invitations and the team directory.',
                },
            },
            {
                id: 'manage',
                title: 'Managing existing staff',
                table: {
                    columns: ['Action', 'Effect'],
                    rows: [
                        ['Edit Access', 'Changes roles and branch assignments; Save Changes applies immediately'],
                        ['Deactivate', 'Blocks sign-in while preserving history and audit references'],
                        ['Reactivate', 'Restores sign-in for a deactivated account'],
                        ['Revoke Sessions', 'Signs the person out of every active session'],
                    ],
                },
                callout: {
                    tone: 'warning',
                    title: 'Deactivation is not deletion',
                    body: 'Orders, shifts and audit entries keep pointing at the deactivated user, so historical reporting stays intact.',
                },
            },
        ],
        related: ['roles-permissions', 'role-guides', 'branches'],
    },
    {
        slug: 'roles-permissions',
        title: 'Roles & Permissions',
        group: 'team',
        icon: 'key',
        summary: 'How the permission model works, the ten built-in tenant roles, and how to create or customise a role safely.',
        featured: true,
        readMinutes: 9,
        permission: 'roles.view',
        routeName: 'roles.index',
        roles: ['tenant_owner', 'tenant_admin'],
        sections: [
            {
                id: 'model',
                title: 'The permission model',
                body: 'Permissions are slugs written as group.action, for example orders.view or inventory.adjust. Roles are bundles of slugs. A person holds one or more roles, and their effective permissions are the union of every role they hold. Nothing is role-name based: a custom role with the right slugs behaves exactly like a built-in one.',
                table: {
                    columns: ['Tenant permission group', 'Actions'],
                    rows: [
                        ['orders', 'view, create, update, void, refund, approve'],
                        ['pos', 'use'],
                        ['tables / kitchen', 'view, manage'],
                        ['menu / modifiers', 'view, manage'],
                        ['qr', 'view, manage, settings, analytics'],
                        ['inventory', 'view, manage, adjust, approve'],
                        ['purchasing', 'view, manage, approve'],
                        ['waste', 'view, create, approve'],
                        ['customers / accounts / invoices', 'view, manage'],
                        ['expenses', 'view, manage, approve'],
                        ['reports', 'view, export'],
                        ['staff / roles / branches', 'view, manage'],
                        ['settings / subscription', 'view, manage'],
                    ],
                },
            },
            {
                id: 'built-in',
                title: 'Built-in tenant roles',
                table: {
                    columns: ['Role', 'Designed for', 'Locked'],
                    rows: [
                        ['Tenant Owner', 'Full control of the restaurant workspace', 'Yes'],
                        ['Tenant Admin', 'Day-to-day administration, same permissions as Owner', 'Yes'],
                        ['Branch Manager', 'Running one location end to end', 'No'],
                        ['Supervisor', 'Shift supervision and approvals', 'No'],
                        ['Cashier', 'POS, settlement, receipts and customers', 'No'],
                        ['Table Staff', 'Tables, orders and bill requests', 'No'],
                        ['Kitchen Staff', 'Kitchen Display and order status', 'No'],
                        ['Inventory Manager', 'Stock, purchasing and transfers', 'No'],
                        ['Accountant', 'Expenses, accounts, invoices and reports', 'No'],
                        ['Auditor', 'Read-only across every module', 'No'],
                    ],
                },
                callout: {
                    tone: 'info',
                    title: 'Owner and Admin are locked',
                    body: 'These two roles cannot be renamed, edited or deleted, which prevents a workspace from locking itself out of administration. Custom roles also appear in this list, so the total can exceed ten.',
                },
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'The Accountant role selected, showing the grouped permission matrix and its slugs. Markers cover creating a role, selecting one, granting permissions and saving.',
                annotated: 'roles-permissions',
            },
            {
                id: 'create',
                title: 'Creating a custom role',
                steps: [
                    { title: '+ Create Role', detail: 'Opens the Create Role drawer.' },
                    { title: 'Name it', detail: 'Give the role a name and optional description. Names must be unique within the restaurant.' },
                    { title: 'Grant permissions', detail: 'Tick individual permissions or use Select all / Clear all per group. Save with Create Role.' },
                    { title: 'Assign it', detail: 'Roles are assigned on the Staff page under Roles & Privileges. The role card links to Assign on Staff page.' },
                ],
            },
            {
                id: 'customise',
                title: 'Customising a built-in role',
                body: 'Opening a system role shows its permissions read-only until you save a change. Saving creates a restaurant-specific copy of that role, moves the assigned users onto the copy, and leaves the global definition untouched. The role badge then reads Customized.',
                bullets: [
                    'Reset to default discards the copy and moves people back to the system role.',
                    'Delete is only offered for custom roles that are not in use.',
                    'You cannot grant a permission you do not hold yourself; those checkboxes render disabled.',
                ],
                callout: {
                    tone: 'warning',
                    title: 'Frontend visibility is not security',
                    body: 'Hiding a button is a convenience. Every route enforces its permission server-side, so a hidden action still returns 403 if called directly.',
                },
            },
        ],
        related: ['staff', 'role-guides', 'branches'],
    },
    {
        slug: 'branches',
        title: 'Branch Management',
        group: 'team',
        icon: 'building',
        summary: 'Create and switch locations, set the primary branch, and understand how branch scoping filters data.',
        readMinutes: 5,
        permission: 'branches.view',
        routeName: 'branches.index',
        sections: [
            {
                id: 'create',
                title: 'Creating a branch',
                steps: [
                    { title: 'Add Branch', detail: 'Opens the New Branch drawer. Disabled when the plan branch limit is reached.' },
                    { title: 'Details', detail: 'Name, code, address, timezone, currency and the service types the location offers.' },
                    { title: 'Save', detail: 'Create Branch adds the location; Edit reuses the drawer and saves with Save Branch.' },
                ],
                screenshot: {
                    src: shot('branches'),
                    alt: 'Branch management screen with branch cards',
                    caption: 'Restaurant Branches for the demo tenant.',
                },
            },
            {
                id: 'primary',
                title: 'Primary branch and switching',
                body: 'Set Primary makes a branch the default for new sessions. The branch selector in the sidebar and in each operational screen switches the active branch. A user can only switch to branches they can access.',
            },
            {
                id: 'scoping',
                title: 'How branch scoping works',
                bullets: [
                    'Orders, tables, stock, shifts, purchases, expenses and reports are branch-scoped at query level.',
                    'Owners, Admins and anyone with branches.manage see every branch in the restaurant.',
                    'Everyone else sees only their assigned branches; a record from another branch returns 404 rather than leaking data.',
                    'The branch filter on list screens only lists accessible branches.',
                ],
                callout: {
                    tone: 'warning',
                    title: 'branches.manage widens data visibility',
                    body: 'Granting branches.manage also grants tenant-wide branch visibility, because the permission is used to manage all locations.',
                },
            },
        ],
        related: ['staff', 'settings', 'reports'],
    },

    // ---------------------------------------------------------------------
    // Stock & purchasing
    // ---------------------------------------------------------------------
    {
        slug: 'inventory',
        title: 'Inventory',
        group: 'stock',
        icon: 'cube',
        summary: 'Live stock balances, physical counts, the immutable movement ledger, ingredients and units of measure.',
        readMinutes: 9,
        permission: 'inventory.view',
        routeName: 'inventory.index',
        sections: [
            {
                id: 'tabs',
                title: 'Four tabs',
                table: {
                    columns: ['Tab', 'Purpose'],
                    rows: [
                        ['Stock on Hand', 'Available quantity per item, branch and storage location'],
                        ['Stock Ledger (Audit Trail)', 'Immutable movements with reason, user and note'],
                        ['Ingredients Catalog', 'Raw ingredients with a standard unit and cost'],
                        ['Units of Measure', 'Unit names and short codes used across the catalog'],
                    ],
                },
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'Live balances with 88 tracked items. Markers cover the two stock actions, the four tabs, filtering and the per-row adjustment.',
                annotated: 'inventory-board',
            },
            {
                id: 'adjust',
                title: 'Recording stock',
                steps: [
                    { title: '+ Record Opening', detail: 'Sets the initial balance for an item in a branch and location.' },
                    { title: 'Physical Count / Adjust', detail: 'Records a counted quantity and posts the variance with an audit note.' },
                    { title: 'Adjust Count', detail: 'On a stock row, opens the same dialog pre-filled for that item and location.' },
                ],
                callout: {
                    tone: 'info',
                    title: 'The ledger is append-only',
                    body: 'Corrections create a new movement rather than editing history, so every quantity can be traced back to a reason and a user.',
                },
            },
            {
                id: 'movement-reasons',
                title: 'Movement reasons',
                body: 'Opening Stock, Stock Count / Adjustment, Sale Deduction, Wastage / Spoilage, Purchase Receipt, Transfer In, Transfer Out and Return / Reversal. The reason is required and printed in the ledger.',
            },
        ],
        related: ['purchasing-suppliers', 'transfers', 'waste', 'menu-products'],
    },
    {
        slug: 'purchasing-suppliers',
        title: 'Purchases & Suppliers',
        group: 'stock',
        icon: 'store',
        summary: 'Raise purchase orders, approve and receive goods into stock, and keep supplier records.',
        readMinutes: 6,
        permission: 'purchasing.view',
        routeName: 'purchasing.orders.index',
        sections: [
            {
                id: 'purchase-orders',
                title: 'Purchase orders',
                body: 'Purchasing lists purchase orders for the active branch. An order moves through Draft, Submitted, Approved, Received and Paid, with Cancel available before goods are received. Each transition is recorded against the order.',
                screenshot: {
                    src: shot('purchasing'),
                    alt: 'Purchasing screen with purchase orders and suppliers',
                    caption: 'Purchasing for the active branch.',
                },
                steps: [
                    { title: 'Create', detail: 'Add supplier lines, quantities and costs, then save as a draft.' },
                    { title: 'Submit and approve', detail: 'Submit sends the order for approval; Approve requires purchasing.approve.' },
                    { title: 'Receive', detail: 'Receiving posts stock movements into the selected storage location.' },
                    { title: 'Pay', detail: 'Records settlement against a financial account.' },
                ],
            },
            {
                id: 'suppliers',
                title: 'Suppliers',
                body: 'Supplier records are managed from a Suppliers tab on the Purchasing screen rather than a separate module. Each supplier stores contact details and is selectable on purchase orders.',
            },
        ],
        related: ['inventory', 'transfers', 'accounts'],
    },
    {
        slug: 'transfers',
        title: 'Stock Transfers',
        group: 'stock',
        icon: 'transfer',
        summary: 'Move stock between branches with dispatch, receive, approval and cancellation steps.',
        readMinutes: 5,
        permission: 'inventory.view',
        routeName: 'transfers.index',
        sections: [
            {
                id: 'flow',
                title: 'Transfer flow',
                screenshot: {
                    src: shot('transfers'),
                    alt: 'Stock transfers screen',
                    caption: 'Stock Transfers between branches.',
                },
                steps: [
                    { title: 'Create', detail: 'Choose the source and destination branch and add the items and quantities.' },
                    { title: 'Dispatch', detail: 'Sending stock leaves the source location and creates a Transfer Out movement.' },
                    { title: 'Receive', detail: 'Receiving at the destination creates a Transfer In movement and closes the transfer.' },
                    { title: 'Approve or cancel', detail: 'Approval is permission-gated and cancellation is only possible before receipt.' },
                ],
                callout: {
                    tone: 'info',
                    title: 'Two-branch visibility',
                    body: 'A transfer is visible to staff in either branch, so the receiving team can follow an inbound delivery.',
                },
            },
        ],
        related: ['inventory', 'branches'],
    },
    {
        slug: 'waste',
        title: 'Waste & Loss',
        group: 'stock',
        icon: 'trash',
        summary: 'Record spoilage, breakage and staff meals with a reason, then approve the write-off.',
        readMinutes: 4,
        permission: 'waste.view',
        routeName: 'waste.index',
        sections: [
            {
                id: 'recording',
                title: 'Recording waste',
                body: 'Waste records capture the item, quantity, reason and branch. Recording requires waste.create; approving the write-off requires waste.approve, so the person who logs a loss cannot silently approve it.',
                screenshot: {
                    src: shot('waste'),
                    alt: 'Waste and Loss screen',
                    caption: 'Waste & Loss for the active branch.',
                },
            },
            {
                id: 'reporting',
                title: 'Where waste appears',
                body: 'Approved waste posts a stock movement and is included in the Inventory & Waste report group, where it is ranked by category and reason.',
            },
        ],
        related: ['inventory', 'reports'],
    },

    // ---------------------------------------------------------------------
    // Money & reporting
    // ---------------------------------------------------------------------
    {
        slug: 'payments',
        title: 'Payments',
        group: 'money',
        icon: 'credit-card',
        summary: 'Configure the payment methods a branch accepts and test each gateway connection.',
        readMinutes: 5,
        permission: 'settings.manage',
        routeName: 'settings.payments.index',
        sections: [
            {
                id: 'methods',
                title: 'Payment methods',
                body: 'Payment Gateways lists the configured methods for the restaurant. Each method can be created, edited, toggled active, set as default, tested and removed. The methods enabled here are the ones offered in POS checkout and on the QR bill screen.',
                screenshot: {
                    src: shot('payments'),
                    alt: 'Payment gateways settings screen',
                    caption: 'Settings → Payment Gateways. The demo tenant has none configured.',
                },
            },
            {
                id: 'testing',
                title: 'Testing a gateway',
                steps: [
                    { title: 'Open the method', detail: 'Settings → Payment Gateways, then choose the provider.' },
                    { title: 'Run Test', detail: 'Sends a connection check with the stored credentials and reports the result.' },
                    { title: 'Set default', detail: 'The default method is preselected at checkout for faster tender entry.' },
                ],
                callout: {
                    tone: 'warning',
                    title: 'Credentials are server-side only',
                    body: 'Keys are never sent to the browser. The checkout screen only receives the methods the branch may use.',
                },
            },
        ],
        related: ['pos-checkout', 'subscription', 'accounts'],
    },
    {
        slug: 'customers',
        title: 'Customers',
        group: 'money',
        icon: 'users',
        summary: 'Customer directory, purchase history, loyalty points and CSV export.',
        readMinutes: 4,
        permission: 'customers.view',
        routeName: 'customers.index',
        sections: [
            {
                id: 'directory',
                title: 'The customer directory',
                body: 'Customers lists every guest captured at the POS or through QR ordering, with contact details, order count and loyalty balance. Export CSV downloads the current directory.',
                screenshot: {
                    src: shot('customers'),
                    alt: 'Customer directory screen',
                    caption: 'Customer directory for the demo restaurant.',
                },
            },
            {
                id: 'profile',
                title: 'Customer profile',
                body: 'Opening a customer shows order history, total spend and loyalty activity. Points can be adjusted by users holding customers.manage.',
            },
        ],
        related: ['reports', 'pos-checkout'],
    },
    {
        slug: 'expenses',
        title: 'Expenses',
        group: 'money',
        icon: 'wallet',
        summary: 'Log operating expenses by category and route them through approval.',
        readMinutes: 4,
        permission: 'expenses.view',
        routeName: 'expenses.index',
        sections: [
            {
                id: 'logging',
                title: 'Logging an expense',
                body: 'Expenses record a category, amount, date, branch and optional note. Categories are manageable from the same screen. A new expense can be approved or rejected by someone holding expenses.approve.',
                screenshot: {
                    src: shot('expenses'),
                    alt: 'Expenses screen with expense records',
                    caption: 'Expenses for the demo branch.',
                },
            },
            {
                id: 'reporting',
                title: 'Reporting',
                body: 'Approved expenses feed the Financials & P&L report group and reduce the profitability figures on the dashboard.',
            },
        ],
        related: ['accounts', 'reports'],
    },
    {
        slug: 'accounts',
        title: 'Accounts',
        group: 'money',
        icon: 'credit-card',
        summary: 'Cash and bank accounts, transfers between them, and the balance trail behind every payment.',
        readMinutes: 4,
        permission: 'accounts.view',
        routeName: 'accounts.index',
        sections: [
            {
                id: 'accounts',
                title: 'Financial accounts',
                body: 'Accounts represent the tills, bank accounts and wallets the restaurant uses. Each account shows its current balance and can be created, edited or archived by users with accounts.manage.',
                screenshot: {
                    src: shot('accounts'),
                    alt: 'Accounts screen with balances',
                    caption: 'Financial accounts for the demo restaurant.',
                },
            },
            {
                id: 'transfers',
                title: 'Transfers',
                body: 'A transfer moves value between two accounts, for example a cash drop from the till to the safe. It posts paired transactions so both balances stay correct.',
            },
        ],
        related: ['expenses', 'payments', 'invoices'],
    },
    {
        slug: 'invoices',
        title: 'Bills & Invoices',
        group: 'money',
        icon: 'file',
        summary: 'Review issued invoices and open the printable document for any of them.',
        readMinutes: 3,
        permission: 'invoices.view',
        routeName: 'invoices.index',
        sections: [
            {
                id: 'invoices',
                title: 'Invoice register',
                body: 'Bills & Invoices lists invoices issued by the restaurant with their number, customer, date, total and status. Opening an invoice shows the lines, tax breakdown and payment state, and offers the printable document.',
                screenshot: {
                    src: shot('invoices'),
                    alt: 'Bills and invoices register',
                    caption: 'Invoice register for the demo restaurant.',
                },
            },
        ],
        related: ['accounts', 'reports'],
    },
    {
        slug: 'reports',
        title: 'Reports',
        group: 'money',
        icon: 'chart',
        summary: 'Six report families over any date range, with branch filtering, CSV export and print.',
        readMinutes: 7,
        permission: 'reports.view',
        routeName: 'reports.index',
        sections: [
            {
                id: 'families',
                title: 'Report families',
                table: {
                    columns: ['Group', 'Reports'],
                    rows: [
                        ['Sales & Revenue', 'Sales summary, hourly sales, payment report, tax report'],
                        ['Menu & Products', 'Product performance, category performance'],
                        ['Financials & P&L', 'Profit & loss, expense report, cash & shifts'],
                        ['Inventory & Waste', 'Inventory report, purchase report, waste report'],
                        ['Customers & Loyalty', 'Customer analytics, loyalty'],
                        ['Team & Branches', 'Staff report, branch comparison'],
                    ],
                },
            },
            {
                id: 'annotated',
                title: 'Annotated screen walkthrough',
                body: 'Sales summary with real totals. Markers cover choosing a report, setting the range, filtering a branch, refreshing and printing.',
                annotated: 'reports-suite',
            },
            {
                id: 'running',
                title: 'Running a report',
                steps: [
                    { title: 'Pick the report', detail: 'Choose one button inside a report family; the page reloads with that dataset.' },
                    { title: 'Set the range', detail: 'Today, Yesterday, Last 7 Days, This Month (MTD) or Last Month, or enter From and To dates.' },
                    { title: 'Filter the branch', detail: 'Choose All Branches or a single accessible branch.' },
                    { title: 'Refresh Data', detail: 'Re-runs the query with the current filters.' },
                    { title: 'Export or print', detail: 'Export CSV downloads {type}-report-{from}-to-{to}.csv; Print opens the browser print dialog.' },
                ],
                callout: {
                    tone: 'info',
                    title: 'Export requires reports.export',
                    body: 'The page, its KPIs and printing need reports.view; the CSV download additionally checks reports.export.',
                },
            },
        ],
        related: ['dashboard', 'inventory', 'branches'],
    },

    // ---------------------------------------------------------------------
    // Configuration
    // ---------------------------------------------------------------------
    {
        slug: 'settings',
        title: 'Settings',
        group: 'configure',
        icon: 'sliders',
        summary: 'Every restaurant-level preference: company, branch defaults, team, hours, tax, receipts, POS and QR.',
        readMinutes: 6,
        permission: 'settings.manage',
        routeName: 'settings.show',
        sections: [
            {
                id: 'tabs',
                title: 'Settings tabs',
                table: {
                    columns: ['Tab', 'Controls'],
                    rows: [
                        ['Company & Region', 'Restaurant identity, currency, timezone and locale'],
                        ['Branch', 'Defaults applied to new branches'],
                        ['Team', 'Team-wide defaults and invitation behaviour'],
                        ['Opening Hours', 'Service hours per day'],
                        ['Tax', 'Tax name, rate and price-inclusion'],
                        ['Receipt', 'Header, footer and printed fields'],
                        ['Billing', 'Billing details used on documents'],
                        ['POS & Payments', 'Terminal behaviour and receipt options'],
                        ['Orders', 'Order defaults and confirmation rules'],
                        ['Notifications', 'Who receives which operational alerts'],
                        ['QR Dining', 'Guest ordering behaviour and approval rules'],
                        ['Payment Gateways', 'Separate screen — see Payments'],
                        ['Demo data', 'Generate or purge demo workspace data'],
                    ],
                },
            },
            {
                id: 'screen',
                title: 'The settings screen',
                body: 'Each tab is a separate form with its own Save changes button. The tab strip stays visible while you work through the groups.',
                screenshot: {
                    src: shot('settings'),
                    alt: 'Settings screen with settings tabs',
                    caption: 'Settings → Company & Region.',
                },
            },
            {
                id: 'saving',
                title: 'Saving changes',
                body: 'Save changes posts that tab only and shows a Settings saved confirmation. Changes to tax, receipts and orders affect new transactions, not historical ones.',
                callout: {
                    tone: 'warning',
                    title: 'Demo data is destructive',
                    body: 'The Demo data tab can purge generated records. It is permission-gated and asks for confirmation, but treat it as a production-risk action.',
                },
            },
        ],
        related: ['restaurant-setup', 'payments', 'subscription'],
    },
    {
        slug: 'delivery-zones',
        title: 'Delivery Zones',
        group: 'configure',
        icon: 'truck',
        summary: 'Define delivery areas, their fees and availability for the active branch.',
        readMinutes: 3,
        permission: 'settings.manage',
        routeName: 'delivery-zones.index',
        sections: [
            {
                id: 'zones',
                title: 'Zones and fees',
                body: 'Each zone has a name, a delivery fee and an active flag. Zones appear in the POS delivery form and on the QR menu when the branch offers delivery. Creating, editing and removing zones all require settings.manage.',
                screenshot: {
                    src: shot('delivery-zones'),
                    alt: 'Delivery zones screen',
                    caption: 'Delivery Zones for the active branch.',
                },
            },
        ],
        related: ['pos-checkout', 'settings'],
    },
    {
        slug: 'subscription',
        title: 'Subscription',
        group: 'configure',
        icon: 'crown',
        summary: 'Plan, seats, module entitlements and billing documents for the restaurant workspace.',
        readMinutes: 5,
        permission: 'subscription.view',
        routeName: 'subscription.index',
        sections: [
            {
                id: 'plan',
                title: 'Plan and entitlements',
                body: 'The subscription screen shows the current plan, renewal date and the modules included. A module that is not entitled is hidden from the sidebar even when the role holds its permission.',
                screenshot: {
                    src: shot('subscription'),
                    alt: 'Subscription and plan screen',
                    caption: 'Subscription for the demo restaurant.',
                },
                bullets: [
                    'Plans gate POS, Kitchen Display, Tables, Menu, QR Dining, Inventory, Purchasing, Waste, Transfers, Accounts and Reports.',
                    'Changing plan can be paid immediately or scheduled; invoices are downloadable.',
                    'Coupons can be applied and removed here.',
                ],
            },
            {
                id: 'cancel',
                title: 'Cancel or resume',
                body: 'Cancelling schedules the end of the subscription without deleting data. Resume reverses the cancellation before the end date. After expiry, tenant routes redirect to this screen until a plan is active.',
            },
        ],
        related: ['settings', 'payments'],
    },

    // ---------------------------------------------------------------------
    // Journeys & reference
    // ---------------------------------------------------------------------
    {
        slug: 'journeys',
        title: 'Complete User Journeys',
        group: 'learn',
        icon: 'activity',
        summary: 'End-to-end workflows with decision points, from first login to a paid and reconciled order.',
        kind: 'journeys',
        featured: true,
        popular: true,
        sections: [],
    },
    {
        slug: 'button-reference',
        title: 'Button Reference',
        group: 'learn',
        icon: 'terminal',
        summary: 'Every important button, what it does, where it goes and which permission it needs.',
        kind: 'buttons',
        popular: true,
        sections: [],
    },
    {
        slug: 'videos',
        title: 'Video Tutorials',
        group: 'learn',
        icon: 'ticket',
        summary: 'Short recorded walkthroughs of each module, with chapters and fullscreen playback.',
        kind: 'videos',
        featured: true,
        popular: true,
        sections: [],
    },
    {
        slug: 'role-guides',
        title: 'Role-Based Guides',
        group: 'learn',
        icon: 'users',
        summary: 'What each of the ten built-in tenant roles can actually do, and where they should start.',
        kind: 'roles',
        sections: [],
    },
    {
        slug: 'troubleshooting',
        title: 'Troubleshooting',
        group: 'learn',
        icon: 'alert',
        summary: 'The problems new teams hit most often, and the real cause behind each one.',
        readMinutes: 4,
        sections: [
            {
                id: 'forbidden',
                title: 'A page returns 403 or is missing from the sidebar',
                body: 'Both are permission or entitlement results, not bugs. The sidebar only renders modules your role can view, and the route independently enforces the permission.',
                bullets: [
                    'Ask an owner to check Roles & Permissions for the module action.',
                    'Check Subscription: a module without the plan entitlement stays hidden even when the permission is granted.',
                    'A direct URL to a record in another branch returns 404 by design.',
                ],
            },
            {
                id: 'kitchen-new-tab',
                title: 'Kitchen Display opened in another tab',
                body: 'This is intentional. The KDS runs in its own browser tab so it can stay full screen on the line. Use the sidebar entry again to focus the same tab.',
            },
            {
                id: 'pos-blocked',
                title: 'Pay & complete is disabled',
                body: 'Checkout requires an open shift and a non-empty cart, and a dine-in order requires a selected table. Open a shift from the header or pick a table before tendering.',
            },
            {
                id: 'pending-orders',
                title: 'QR orders are not reaching the kitchen',
                body: 'The order is probably awaiting confirmation. Use the Awaiting confirmation filter on Orders, then Accept to send it to the kitchen. Accept requires orders.approve.',
            },
            {
                id: 'stock-not-moving',
                title: 'Stock did not decrease after a sale',
                body: 'Only products with a tracked stock mode or a recipe of tracked ingredients post sale deductions. Check the product stock mode in Menu & Products, then the Stock Ledger entry for that order.',
            },
            {
                id: 'branch-missing',
                title: 'A branch is missing from the selector',
                body: 'You are only offered branches you are assigned to. Owners, Admins and anyone with branches.manage see every branch. Ask an owner to update Branch Access on the Staff page.',
            },
        ],
        related: ['getting-started', 'roles-permissions', 'staff'],
    },
];

export const GUIDE_BY_SLUG: Record<string, DocGuide> = GUIDES.reduce(
    (acc, guide) => {
        acc[guide.slug] = guide;
        return acc;
    },
    {} as Record<string, DocGuide>,
);
