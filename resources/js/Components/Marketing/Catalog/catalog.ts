import {
    BarChart3,
    Boxes,
    Building2,
    ChefHat,
    ClipboardList,
    CreditCard,
    Gauge,
    LayoutGrid,
    LucideIcon,
    QrCode,
    ReceiptText,
    ShieldCheck,
    Timer,
    UtensilsCrossed,
} from 'lucide-react';

/**
 * Verified inventory of Touch Dine marketing pages. Every claim here maps to
 * something implemented in the app (routes, enums or services); see docs/MARKETING-CATALOG.md.
 */
export interface Faq {
    q: string;
    a: string;
}

export interface Product {
    slug: string;
    name: string;
    short: string;
    group: 'Ordering & service' | 'Kitchen & billing' | 'Operations & insight';
    icon: LucideIcon;
    meta: { title: string; description: string };
    eyebrow: string;
    headline: string;
    lede: string;
    problem: { title: string; before: string[]; after: string[] };
    steps: { t: string; d: string }[];
    features: { t: string; d: string }[];
    showcase: { title: string; path: string; note: string };
    integrations: { slug: string; how: string }[];
    benefits: { t: string; d: string }[];
    faqs: Faq[];
}

export const PRODUCTS: Product[] = [
    {
        slug: 'qr-ordering',
        name: 'QR Code Ordering',
        short: 'Guests scan, browse, order and request the bill from their phone.',
        group: 'Ordering & service',
        icon: QrCode,
        meta: {
            title: 'QR Code Ordering for Restaurants',
            description: 'Let guests scan the table QR code, order from a live menu, track their order and request the bill. No app to install, no waiting for a server.',
        },
        eyebrow: 'QR code ordering',
        headline: 'Guests order from the table. Your team just serves.',
        lede: 'Each table gets its own QR code. Guests open your live menu in the phone browser, place an order, follow its progress and ask for the bill, all tied to their table.',
        problem: {
            title: 'Order-taking is the slowest part of a busy floor',
            before: ['A guest waits with the menu closed while servers are busy elsewhere.', 'Orders are written down, then re-typed at a terminal, so mistakes creep in.', 'Guests keep asking "where is my food?" because nobody can see progress.'],
            after: ['The guest scans the table code and the menu opens on their phone.', 'The order arrives in order management already tied to the table, with modifiers.', 'A tracking page shows the order moving from received to preparing to ready.'],
        },
        steps: [
            { t: 'Print the table codes', d: 'Generate a QR code for every table and print them from the QR dining page.' },
            { t: 'Guest scans and orders', d: 'The browser menu opens for that table. The guest adds dishes and submits.' },
            { t: 'Staff accept the order', d: 'Depending on your settings, orders are accepted automatically or wait for staff approval.' },
            { t: 'Track, then pay', d: 'The guest follows progress, then requests the bill or starts a payment from the same page.' },
        ],
        features: [
            { t: 'Per-table QR codes', d: 'Print, regenerate or revoke the code for any table.' },
            { t: 'Live menu in the browser', d: 'Categories, photos, prices and modifiers come straight from your menu.' },
            { t: 'Order tracking page', d: 'Guests see their order status update without asking staff.' },
            { t: 'Accept or reject', d: 'Staff can approve incoming QR orders before they reach the kitchen.' },
            { t: 'Bill request and payment', d: 'Guests can request the bill or start an online payment where you have enabled it.' },
            { t: 'Guest feedback and QR analytics', d: 'Collect feedback and review QR usage from the dashboard.' },
        ],
        showcase: { title: 'The guest experience, end to end', path: 'Guest phone and Orders', note: 'A recreation of the guest ordering pages and the staff view of the same order.' },
        integrations: [
            { slug: 'digital-menu', how: 'The guest menu is your digital menu, so a price change is live straight away.' },
            { slug: 'order-management', how: 'QR orders land in the same order list as counter and POS orders.' },
            { slug: 'kitchen-display', how: 'Accepted orders appear as tickets on the kitchen display.' },
        ],
        benefits: [
            { t: 'Fewer manual steps', d: 'No writing down, no re-typing. The guest enters the order once.' },
            { t: 'Servers free for service', d: 'Staff spend time on the floor instead of walking back and forth to a terminal.' },
            { t: 'Clearer order status', d: 'Guests and staff look at the same status.' },
            { t: 'Control stays with you', d: 'Require approval, revoke a code, or switch a table off at any time.' },
        ],
        faqs: [
            { q: 'Do guests need to install an app?', a: 'No. The QR code opens a web page in the phone browser.' },
            { q: 'Can we approve orders before the kitchen sees them?', a: 'Yes. QR orders can be set to need staff acceptance, and staff can also reject an order.' },
            { q: 'Is QR ordering on every plan?', a: 'QR dining is a plan feature. Check the pricing page for which plans include it.' },
            { q: 'Can guests pay from their phone?', a: 'Guests can request the bill, and can start an online payment when you have an online payment method configured.' },
        ],
    },
    {
        slug: 'digital-menu',
        name: 'Digital Menu Management',
        short: 'Categories, photos, prices and modifiers in one place.',
        group: 'Ordering & service',
        icon: UtensilsCrossed,
        meta: {
            title: 'Digital Menu Management for Restaurants',
            description: 'Manage categories, dishes, photos, prices and modifier groups once. The same menu feeds the POS and the guest QR menu.',
        },
        eyebrow: 'Digital menu management',
        headline: 'Change the menu once. Every screen follows.',
        lede: 'Build categories and dishes with photos and prices, add modifier groups for choices and extras, and import a spreadsheet when you have a lot to load.',
        problem: {
            title: 'Printed menus and separate lists drift apart',
            before: ['A price changes on the printed menu but not at the till.', 'Sold-out or changed dishes are corrected by word of mouth.', 'Options like crust or extras are typed in as free text.'],
            after: ['One menu feeds the POS and the guest QR menu.', 'Edit a dish or price and it updates for the next order.', 'Modifier groups give guests defined choices, single or multiple.'],
        },
        steps: [
            { t: 'Create categories', d: 'Group dishes the way guests look for them, such as starters, mains and drinks.' },
            { t: 'Add dishes', d: 'Add a name, price and photo for each dish.' },
            { t: 'Attach modifiers', d: 'Create modifier groups where guests choose one option or several.' },
            { t: 'Publish by saving', d: 'Saved changes appear on the POS and the QR menu.' },
        ],
        features: [
            { t: 'Categories and dishes', d: 'Organise the menu with categories and products.' },
            { t: 'Product images', d: 'Upload or replace a photo per dish.' },
            { t: 'Modifier groups', d: 'Single-choice or multiple-choice groups with priced options.' },
            { t: 'CSV import and export', d: 'Download a template, import products in bulk, or export your menu.' },
            { t: 'Recipes', d: 'Link dishes to ingredients so inventory follows what you sell.' },
            { t: 'Branch-aware', d: 'Menus belong to your restaurant account and work across its branches.' },
        ],
        showcase: { title: 'Menu manager and guest menu, side by side', path: 'Menu', note: 'A recreation of the menu manager and how the change reaches the guest menu.' },
        integrations: [
            { slug: 'qr-ordering', how: 'The QR menu reads this menu directly.' },
            { slug: 'inventory', how: 'Recipes connect a dish to the ingredients it uses.' },
            { slug: 'order-management', how: 'Orders keep the dish and modifier choices the guest picked.' },
        ],
        benefits: [
            { t: 'One source of truth', d: 'No separate lists to keep in step.' },
            { t: 'Faster setup', d: 'Import a spreadsheet instead of typing every dish.' },
            { t: 'Cleaner orders', d: 'Defined modifiers reduce free-text mistakes.' },
            { t: 'Menus that look good', d: 'Photos help guests choose without asking.' },
        ],
        faqs: [
            { q: 'Can I import my existing menu?', a: 'Yes. Download the CSV template, fill it in and import it from the Menu page.' },
            { q: 'What are modifier groups?', a: 'Sets of options attached to dishes. A group can allow one choice, such as crust, or several, such as extras.' },
            { q: 'Do dish photos show on the QR menu?', a: 'Yes. Product images appear in the guest menu.' },
        ],
    },
    {
        slug: 'table-management',
        name: 'Table Management',
        short: 'See every table, its status and its order at a glance.',
        group: 'Ordering & service',
        icon: LayoutGrid,
        meta: {
            title: 'Table Management for Restaurants',
            description: 'Track table status from available to occupied, billing and cleaning, link orders to tables and transfer a table when guests move.',
        },
        eyebrow: 'Table management',
        headline: 'Know which table needs what, right now.',
        lede: 'Every table has a status and an order attached to it. Staff update the floor in a tap, and moving guests to another table carries the order with them.',
        problem: {
            title: 'The floor lives in people\'s heads',
            before: ['Hosts ask servers which tables are free.', 'A table that wants the bill is noticed late.', 'When guests change tables, the order is re-entered.'],
            after: ['Each table shows available, occupied, reserved, billing or cleaning.', 'Bill requests move the table to billing so staff see it.', 'A transfer moves the table\'s order to the new table.'],
        },
        steps: [
            { t: 'Set up the floor', d: 'Create your tables for each branch.' },
            { t: 'Seat guests', d: 'Opening an order marks the table occupied.' },
            { t: 'Follow the table', d: 'Status moves through billing and cleaning as service progresses.' },
            { t: 'Transfer when needed', d: 'Move a party to another table without re-entering the order.' },
        ],
        features: [
            { t: 'Five table states', d: 'Available, occupied, reserved, billing and cleaning.' },
            { t: 'Orders tied to tables', d: 'See which order belongs to which table.' },
            { t: 'Table transfer', d: 'Move an order from one table to another.' },
            { t: 'QR code per table', d: 'Each table can have its own ordering code.' },
            { t: 'Branch-specific floors', d: 'Each branch keeps its own tables.' },
            { t: 'Permission controlled', d: 'Only staff with table permissions can edit the floor.' },
        ],
        showcase: { title: 'A live floor view', path: 'Tables', note: 'A recreation of the tables page with its real status labels.' },
        integrations: [
            { slug: 'qr-ordering', how: 'Each table carries its own QR code, so orders arrive with the table already known.' },
            { slug: 'order-management', how: 'Orders carry the table they belong to.' },
            { slug: 'billing-payments', how: 'Settling the bill releases the table.' },
        ],
        benefits: [
            { t: 'A shared view of the floor', d: 'Hosts and servers look at the same table states.' },
            { t: 'Fewer missed requests', d: 'Billing status makes waiting tables visible.' },
            { t: 'Less re-entry', d: 'Transfers keep the order intact.' },
            { t: 'Tidier turnover', d: 'A cleaning state gives staff a clear next action.' },
        ],
        faqs: [
            { q: 'What table statuses exist?', a: 'Available, occupied, reserved, billing and cleaning.' },
            { q: 'Can I move guests to another table?', a: 'Yes. Use transfer to move the order to a different table.' },
            { q: 'Does each branch have its own tables?', a: 'Yes. Tables belong to a branch.' },
        ],
    },
    {
        slug: 'order-management',
        name: 'Order Management',
        short: 'Every order from every channel, with a clear status.',
        group: 'Ordering & service',
        icon: ClipboardList,
        meta: {
            title: 'Order Management for Restaurants',
            description: 'Dine-in, takeaway, delivery and counter orders in one list with acceptance, fulfilment status, settlement, receipts and voids.',
        },
        eyebrow: 'Order management',
        headline: 'Every order, one list, one status.',
        lede: 'Dine-in, takeaway, delivery and counter orders arrive in the same place. Accept them, follow them from new to served, settle payment and print the receipt.',
        problem: {
            title: 'Orders scattered across notebooks and screens',
            before: ['Phone, counter and table orders are tracked in different places.', 'Nobody is sure whether an order was accepted or is still waiting.', 'Voids and discounts happen without a record.'],
            after: ['All order types share one list.', 'Acceptance and fulfilment are separate, visible statuses.', 'Voids need permission and settlements are recorded.'],
        },
        steps: [
            { t: 'Order arrives', d: 'From a QR scan, the POS or another channel.' },
            { t: 'Accept it', d: 'Staff accept or reject orders that need approval.' },
            { t: 'Follow fulfilment', d: 'The status moves from new to preparing, ready and served.' },
            { t: 'Settle and receipt', d: 'Record payment and print or view the receipt.' },
        ],
        features: [
            { t: 'Four order types', d: 'Dine-in, takeaway, delivery and counter.' },
            { t: 'Acceptance workflow', d: 'Auto-accepted, pending, accepted or rejected.' },
            { t: 'Fulfilment status', d: 'New, preparing, ready, served, plus dispatched and delivered for delivery.' },
            { t: 'Settlement', d: 'Settle an order with a recorded payment.' },
            { t: 'Receipts', d: 'Open a receipt for any order.' },
            { t: 'Void with permission', d: 'Voids are limited to staff who hold the permission.' },
        ],
        showcase: { title: 'The live order list', path: 'Orders', note: 'A recreation of the orders page and one order moving through its statuses.' },
        integrations: [
            { slug: 'kitchen-display', how: 'Status changes in the kitchen update the order automatically.' },
            { slug: 'table-management', how: 'Dine-in orders are tied to their table.' },
            { slug: 'billing-payments', how: 'Settlement and receipts live on the same order.' },
        ],
        benefits: [
            { t: 'Order visibility', d: 'Staff see what is waiting, in progress or done.' },
            { t: 'Consistent process', d: 'Every channel follows the same statuses.' },
            { t: 'Accountability', d: 'Actions such as voids are permission-controlled.' },
            { t: 'Less chasing', d: 'The kitchen\'s progress flows back to the order.' },
        ],
        faqs: [
            { q: 'What order types are supported?', a: 'Dine-in, takeaway, delivery and counter.' },
            { q: 'Does the order status follow the kitchen?', a: 'Yes. Kitchen ticket changes are synchronised to the order fulfilment status.' },
            { q: 'Who can void an order?', a: 'Only roles that include the void permission.' },
        ],
    },
    {
        slug: 'kitchen-display',
        name: 'Kitchen Display System',
        short: 'Tickets by status, item progress and priority.',
        group: 'Kitchen & billing',
        icon: ChefHat,
        meta: {
            title: 'Kitchen Display System for Restaurants',
            description: 'Replace paper tickets with a kitchen display: new, preparing and ready lanes, item-level progress and priority flags.',
        },
        eyebrow: 'Kitchen display system',
        headline: 'Tickets the kitchen can read at a glance.',
        lede: 'Accepted orders appear as tickets. The kitchen starts them, marks items as they are plated and sends the ticket to the pass, and the order status follows.',
        problem: {
            title: 'Paper tickets get lost, and nobody sees progress',
            before: ['Tickets are printed, stacked and sometimes missed.', 'Front of house cannot tell whether an order has started.', 'A rush order is shouted across the pass.'],
            after: ['Tickets appear on screen in the order they arrive.', 'Ticket and item status feed back to the order.', 'Mark a ticket as priority so it stands out.'],
        },
        steps: [
            { t: 'Ticket arrives', d: 'An accepted order appears on the display.' },
            { t: 'Start cooking', d: 'Move the ticket to preparing.' },
            { t: 'Mark items', d: 'Update individual items as they are prepared and ready.' },
            { t: 'Ready for service', d: 'Mark the ticket ready, then handed over or served.' },
        ],
        features: [
            { t: 'Ticket statuses', d: 'New, accepted, preparing, ready, handed over and served.' },
            { t: 'Item-level status', d: 'Track pending, preparing, ready and served per item.' },
            { t: 'Priority flag', d: 'Raise a ticket\'s priority.' },
            { t: 'Ticket printing', d: 'Print a ticket when you still want paper.' },
            { t: 'Order sync', d: 'Kitchen status updates the order fulfilment status.' },
            { t: 'Plan feature', d: 'Kitchen display is a plan feature, shown on the pricing page.' },
        ],
        showcase: { title: 'A kitchen board', path: 'Kitchen', note: 'A recreation of the kitchen display lanes and ticket actions.' },
        integrations: [
            { slug: 'order-management', how: 'Kitchen progress updates the order status automatically.' },
            { slug: 'qr-ordering', how: 'Accepted QR orders arrive as tickets.' },
            { slug: 'digital-menu', how: 'Tickets show the dish names and modifiers from the menu.' },
        ],
        benefits: [
            { t: 'Fewer lost tickets', d: 'Orders sit on screen until they are handled.' },
            { t: 'Shared status', d: 'The pass and the floor see the same progress.' },
            { t: 'Calmer rushes', d: 'Priority flags replace shouting.' },
            { t: 'Paper when you want it', d: 'Tickets can still be printed.' },
        ],
        faqs: [
            { q: 'What statuses does a ticket have?', a: 'New, accepted, preparing, ready, handed over, served and cancelled.' },
            { q: 'Can I track individual items?', a: 'Yes. Items have their own pending, preparing, ready and served states.' },
            { q: 'Can I still print tickets?', a: 'Yes. Each ticket has a print view.' },
        ],
    },
    {
        slug: 'billing-payments',
        name: 'Billing & Payments',
        short: 'Bills, payment methods, receipts and the cash drawer.',
        group: 'Kitchen & billing',
        icon: CreditCard,
        meta: {
            title: 'Restaurant Billing & Payments',
            description: 'Generate bills, take cash, card or mobile payments, enable online payment gateways, print receipts and manage shifts and cash movements.',
        },
        eyebrow: 'Billing & payments',
        headline: 'From "can we have the bill?" to a closed table.',
        lede: 'Guests request the bill, staff settle it with the payment method used, and the receipt and cash records follow. You choose which payment methods to offer.',
        problem: {
            title: 'Checkout is where service slows down',
            before: ['Guests wave for the bill and wait.', 'Payments are recorded by hand, if at all.', 'Cash at the end of a shift never quite matches.'],
            after: ['A bill request flags the table straight away.', 'Each payment is recorded with its method.', 'Shifts and cash movements track the drawer.'],
        },
        steps: [
            { t: 'Bill requested', d: 'The guest asks from the QR page or staff open the bill.' },
            { t: 'Review the bill', d: 'Items and totals are on the order.' },
            { t: 'Take payment', d: 'Record cash, card or mobile, or let the guest pay online where enabled.' },
            { t: 'Receipt and release', d: 'The receipt is available and the table is released.' },
        ],
        features: [
            { t: 'Payment methods', d: 'Cash, card, mobile and other methods.' },
            { t: 'Online gateways', d: 'Connect supported gateways in settings, such as SSLCommerz and bKash.' },
            { t: 'Bill requests', d: 'Guests can request the bill from the QR page.' },
            { t: 'Receipts and invoices', d: 'View receipts per order and browse invoices.' },
            { t: 'Shifts and cash movements', d: 'Open and close shifts and log cash in and out.' },
            { t: 'Refund and void controls', d: 'Voids are permission-controlled.' },
        ],
        showcase: { title: 'Bill, payment and receipt', path: 'Orders · Settle', note: 'A recreation of settling a bill and the resulting receipt.' },
        integrations: [
            { slug: 'order-management', how: 'The bill is the order, so totals never need re-typing.' },
            { slug: 'table-management', how: 'Settling moves the table out of billing.' },
            { slug: 'reports', how: 'Payments collected appear in the reports.' },
        ],
        benefits: [
            { t: 'Quicker checkout', d: 'Fewer steps between request and payment.' },
            { t: 'Recorded payments', d: 'Each payment has a method and a record.' },
            { t: 'Cash you can reconcile', d: 'Shifts and movements show where cash went.' },
            { t: 'Your choice of methods', d: 'Offer only what your restaurant accepts.' },
        ],
        faqs: [
            { q: 'Which payment methods are supported?', a: 'Cash, card, mobile and other methods, plus online gateways you connect in settings.' },
            { q: 'Which online gateways can I connect?', a: 'SSLCommerz and bKash are available in settings.' },
            { q: 'Can guests ask for the bill from their phone?', a: 'Yes, from the QR tracking page.' },
        ],
    },
    {
        slug: 'reports',
        name: 'Dashboard & Reports',
        short: 'Sales, payments, orders and products, with export.',
        group: 'Operations & insight',
        icon: BarChart3,
        meta: {
            title: 'Restaurant Dashboard & Reports',
            description: 'A dashboard and reports for sales, payments collected, orders and products, with period filters and CSV export.',
        },
        eyebrow: 'Dashboard & reports',
        headline: 'See how the restaurant is doing without a spreadsheet.',
        lede: 'Open the dashboard for the day\'s picture, then switch to a report for sales, payments collected, orders or products. Change the period and export to CSV.',
        problem: {
            title: 'Numbers arrive late and in pieces',
            before: ['Sales totals are added up at the end of the day.', 'Payment methods are tallied by hand.', 'Nobody is sure which dishes actually sell.'],
            after: ['Sales reports show gross, discounts, net, tax and orders.', 'Payments collected are grouped by method.', 'A products report shows what sold.'],
        },
        steps: [
            { t: 'Pick a report', d: 'Choose sales, payments collected, orders or products.' },
            { t: 'Set the period', d: 'Filter the dates you care about.' },
            { t: 'Read the chart', d: 'Summary figures sit above a chart and table.' },
            { t: 'Export', d: 'Download the table as CSV.' },
        ],
        features: [
            { t: 'Sales report', d: 'Gross, discounts, net, tax, service charge and refunds.' },
            { t: 'Payments collected', d: 'Totals grouped by payment method.' },
            { t: 'Orders report', d: 'Breakdowns of your orders.' },
            { t: 'Products report', d: 'Products and units sold.' },
            { t: 'Period filters', d: 'Choose the reporting period.' },
            { t: 'CSV export', d: 'Download any report table.' },
        ],
        showcase: { title: 'A report, filtered and charted', path: 'Reports', note: 'A recreation of the reports page. Figures shown are sample data.' },
        integrations: [
            { slug: 'billing-payments', how: 'Collected payments come from recorded settlements.' },
            { slug: 'order-management', how: 'Order and sales figures come from completed orders.' },
            { slug: 'branch-management', how: 'Branch owners can view their own branch.' },
        ],
        benefits: [
            { t: 'One place for the numbers', d: 'Sales, payments and products together.' },
            { t: 'Less manual tallying', d: 'Totals come from recorded orders and payments.' },
            { t: 'Easy to share', d: 'Export to CSV for your accountant.' },
            { t: 'Permission aware', d: 'Reports need the reports permission.' },
        ],
        faqs: [
            { q: 'Which reports are available?', a: 'Sales, payments collected, orders and products.' },
            { q: 'Can I export the data?', a: 'Yes. Each report can be exported as CSV.' },
            { q: 'Can I limit who sees reports?', a: 'Yes. Reports require the reports.view permission.' },
        ],
    },
    {
        slug: 'branch-management',
        name: 'Branch Management',
        short: 'Run several locations from one account.',
        group: 'Operations & insight',
        icon: Building2,
        meta: {
            title: 'Multi-Branch Restaurant Management',
            description: 'Add branches, switch between them, set a primary location and move stock between branches with transfers.',
        },
        eyebrow: 'Branch management',
        headline: 'More than one location, still one account.',
        lede: 'Add branches, switch the active branch in a tap, mark one as primary and move stock between locations with approved transfers.',
        problem: {
            title: 'Each new location multiplies the admin',
            before: ['Separate logins or sheets for every branch.', 'No shared view of which branches are active.', 'Moving stock between locations is done by message.'],
            after: ['Branches live under one account and one login.', 'Switch the active branch from the menu.', 'Transfers move stock with draft, approve, dispatch and receive steps.'],
        },
        steps: [
            { t: 'Add branches', d: 'Create each location.' },
            { t: 'Switch branch', d: 'Pick which branch you are working in.' },
            { t: 'Review the branch', d: 'Orders, tables and stock follow the active branch.' },
            { t: 'Move stock', d: 'Create and approve a transfer between branches.' },
        ],
        features: [
            { t: 'Branch list', d: 'Add, edit, activate and deactivate branches.' },
            { t: 'Primary branch', d: 'Mark one branch as primary.' },
            { t: 'Branch switcher', d: 'Change the active branch from the app.' },
            { t: 'Stock transfers', d: 'Draft, approved, dispatched and received statuses.' },
            { t: 'Branch-level operations', d: 'Tables, orders and kitchens belong to a branch.' },
            { t: 'Plan feature', d: 'Transfers are a plan feature. See pricing.' },
        ],
        showcase: { title: 'Switch branch, then transfer stock', path: 'Branches', note: 'A recreation of the branch switcher and a stock transfer.' },
        integrations: [
            { slug: 'inventory', how: 'Transfers move ingredient stock between branches.' },
            { slug: 'reports', how: 'Reports follow the active branch.' },
            { slug: 'staff-roles', how: 'Roles control who can manage branches.' },
        ],
        benefits: [
            { t: 'One account', d: 'No separate setup per location.' },
            { t: 'Clear boundaries', d: 'Each branch keeps its own tables and orders.' },
            { t: 'Controlled stock moves', d: 'Transfers have an approval step.' },
            { t: 'Room to grow', d: 'Add branches as you open them.' },
        ],
        faqs: [
            { q: 'Can I deactivate a branch?', a: 'Yes. Branches can be deactivated and activated again.' },
            { q: 'Are stock transfers available on every plan?', a: 'Transfers are a plan feature. Check the pricing page.' },
            { q: 'Is there a limit on branches?', a: 'Plans can set a branch limit. The pricing page lists it.' },
        ],
    },
    {
        slug: 'staff-roles',
        name: 'Staff & Role Management',
        short: 'Invite the team and decide what each role can do.',
        group: 'Operations & insight',
        icon: ShieldCheck,
        meta: {
            title: 'Staff & Role Management for Restaurants',
            description: 'Invite staff by email, create roles with fine-grained permissions, deactivate users and revoke sessions.',
        },
        eyebrow: 'Staff & roles',
        headline: 'Give each person exactly the access they need.',
        lede: 'Invite staff by email, assign a role, and tune permissions for orders, menu, reports and more. Deactivate a user or revoke their sessions when someone leaves.',
        problem: {
            title: 'Shared logins and open access',
            before: ['Everyone uses the same login.', 'Anyone can void an order or see reports.', 'Removing a former employee is an afterthought.'],
            after: ['Each person has their own account and role.', 'Voids, reports and settings are permission-controlled.', 'Deactivate users and revoke active sessions.'],
        },
        steps: [
            { t: 'Invite by email', d: 'Send an invitation; you can resend or cancel it.' },
            { t: 'Choose a role', d: 'Assign the role the person needs.' },
            { t: 'Tune permissions', d: 'Edit what a role can view, create or change.' },
            { t: 'Access applies', d: 'The person sees only the parts they may use.' },
        ],
        features: [
            { t: 'Email invitations', d: 'Invite, resend and revoke invitations.' },
            { t: 'Custom roles', d: 'Create roles with chosen permissions.' },
            { t: 'Granular permissions', d: 'For example orders, menu, reports, tables, inventory and settings.' },
            { t: 'Deactivate and reactivate', d: 'Turn access off without deleting history.' },
            { t: 'Revoke sessions', d: 'Sign a user out everywhere.' },
            { t: 'Password reset', d: 'Send a password reset email to a staff member.' },
        ],
        showcase: { title: 'Roles, permissions and what a person sees', path: 'Staff · Roles', note: 'A recreation of the staff and role screens.' },
        integrations: [
            { slug: 'order-management', how: 'Accept, update and void actions are separate permissions.' },
            { slug: 'reports', how: 'Reports need the reports permission.' },
            { slug: 'branch-management', how: 'Branch management is a permission too.' },
        ],
        benefits: [
            { t: 'Safer operations', d: 'Sensitive actions are limited to the right roles.' },
            { t: 'Individual accountability', d: 'Each person works under their own account.' },
            { t: 'Simple offboarding', d: 'Deactivate and revoke sessions.' },
            { t: 'Flexible roles', d: 'Build roles that match how you work.' },
        ],
        faqs: [
            { q: 'Can I create my own roles?', a: 'Yes. Create roles and choose their permissions.' },
            { q: 'How do I remove access quickly?', a: 'Deactivate the user and revoke their sessions.' },
            { q: 'Is there a staff limit?', a: 'Plans can set a user limit. See the pricing page.' },
        ],
    },
    {
        slug: 'inventory',
        name: 'Inventory Management',
        short: 'Ingredients, recipes, purchasing, waste and stock.',
        group: 'Operations & insight',
        icon: Boxes,
        meta: {
            title: 'Restaurant Inventory Management',
            description: 'Track ingredients with units, link recipes to dishes, raise purchase orders, log waste and adjust stock.',
        },
        eyebrow: 'Inventory management',
        headline: 'Know what is in the kitchen before you run out.',
        lede: 'Track ingredients in your own units, link dishes to recipes, receive purchase orders and log waste so stock reflects what really happened.',
        problem: {
            title: 'Stock counts are always out of date',
            before: ['Ingredient levels are guessed from memory.', 'Purchase orders are scribbled on paper.', 'Wasted food is never recorded.'],
            after: ['Ingredients have units and stock levels.', 'Purchase orders move from draft to received.', 'Waste entries can be approved or rejected.'],
        },
        steps: [
            { t: 'Add ingredients', d: 'Create units and ingredients, and set opening stock.' },
            { t: 'Link recipes', d: 'Connect dishes to the ingredients they use.' },
            { t: 'Buy and receive', d: 'Raise purchase orders and receive stock.' },
            { t: 'Adjust and log waste', d: 'Make adjustments and record waste with approval.' },
        ],
        features: [
            { t: 'Ingredients and units', d: 'Define the units you measure in.' },
            { t: 'Recipes', d: 'Connect menu items to ingredients.' },
            { t: 'Stock adjustments', d: 'Opening balances and manual adjustments.' },
            { t: 'Purchase orders and suppliers', d: 'Draft, submitted, approved, partly received and received.' },
            { t: 'Waste log', d: 'Record waste with approve and reject steps.' },
            { t: 'Branch transfers', d: 'Move stock between branches.' },
        ],
        showcase: { title: 'Stock levels responding to real events', path: 'Inventory', note: 'A recreation of ingredient stock. Quantities shown are sample data.' },
        integrations: [
            { slug: 'digital-menu', how: 'Recipes live on menu items.' },
            { slug: 'branch-management', how: 'Transfers move stock between branches.' },
            { slug: 'reports', how: 'Reports cover products sold.' },
        ],
        benefits: [
            { t: 'Fewer surprises', d: 'Stock levels are visible in one place.' },
            { t: 'Organised buying', d: 'Purchase orders have clear statuses.' },
            { t: 'Visible waste', d: 'Waste is recorded and reviewed.' },
            { t: 'Connected to the menu', d: 'Recipes tie ingredients to what you sell.' },
        ],
        faqs: [
            { q: 'Does inventory work with my menu?', a: 'Yes. Recipes connect dishes to ingredients.' },
            { q: 'Can I track suppliers and purchase orders?', a: 'Yes. Purchasing is a plan feature with supplier and purchase order tracking.' },
            { q: 'Is waste tracking included?', a: 'Waste tracking is a plan feature. See pricing.' },
        ],
    },
];

export const PRODUCT_GROUPS: Product['group'][] = ['Ordering & service', 'Kitchen & billing', 'Operations & insight'];
export const productBySlug = (slug: string) => PRODUCTS.find((p) => p.slug === slug);

/* ---------------- Solutions ---------------- */

export type Lane = 'Guest' | 'Front of house' | 'Kitchen' | 'Cashier' | 'Owner';

export interface FlowNode {
    lane: Lane;
    label: string;
    module?: string;
    handoff?: boolean;
}

export interface Solution {
    slug: string;
    name: string;
    short: string;
    icon: LucideIcon;
    meta: { title: string; description: string };
    eyebrow: string;
    headline: string;
    lede: string;
    challenge: { title: string; body: string; points: string[] };
    modules: { slug: string; role: string }[];
    lanes: Lane[];
    flow: FlowNode[];
    /** Optional comparison flow rendered against `flow` (illustrative, not measured). */
    compare?: { label: string; flow: FlowNode[] };
    workflowSteps: { t: string; d: string }[];
    benefits: { t: string; d: string }[];
    faqs: Faq[];
}

export const SOLUTION_WORKFLOWS: Solution[] = [
    {
        slug: 'dine-in-qr-ordering',
        name: 'Dine-In QR Ordering',
        short: 'Cut manual order-taking from the dine-in experience.',
        icon: QrCode,
        meta: { title: 'QR Ordering for Dine-In Restaurants', description: 'Replace manual order-taking with table QR codes. Orders flow from the guest phone to order management and the kitchen, then to billing.' },
        eyebrow: 'Solution · Dine-in',
        headline: 'Stop taking orders by hand at every table.',
        lede: 'Guests scan the table code and order themselves. The order reaches your team and the kitchen without anyone writing it down or typing it in again.',
        challenge: {
            title: 'Servers spend their shift as a relay between the table and the terminal',
            body: 'In a busy dining room, every order starts as a conversation, becomes handwriting and ends as typing. Each step is a chance for a mistake and a wait.',
            points: ['Guests wait for a free server to even start ordering.', 'Handwritten orders are misread or mistyped.', 'Repeat rounds need another visit to the table.'],
        },
        modules: [
            { slug: 'qr-ordering', role: 'Captures the order at the table' },
            { slug: 'digital-menu', role: 'Supplies the live menu and modifiers' },
            { slug: 'order-management', role: 'Receives and accepts the order' },
            { slug: 'kitchen-display', role: 'Shows the ticket to the kitchen' },
            { slug: 'billing-payments', role: 'Closes the bill' },
        ],
        lanes: ['Guest', 'Front of house', 'Kitchen', 'Cashier'],
        flow: [
            { lane: 'Guest', label: 'Sits at the table', module: 'table-management' },
            { lane: 'Guest', label: 'Scans the table QR', module: 'qr-ordering' },
            { lane: 'Guest', label: 'Browses the menu', module: 'digital-menu' },
            { lane: 'Guest', label: 'Submits the order', module: 'qr-ordering' },
            { lane: 'Front of house', label: 'Order arrives, accepted', module: 'order-management' },
            { lane: 'Kitchen', label: 'Ticket prepared', module: 'kitchen-display' },
            { lane: 'Front of house', label: 'Order served', module: 'order-management' },
            { lane: 'Cashier', label: 'Bill paid', module: 'billing-payments' },
        ],
        workflowSteps: [
            { t: 'A customer sits at a table', d: 'The table carries its own QR code, so the order will arrive already tied to Table 7.' },
            { t: 'The customer scans the QR code', d: 'The menu opens in the phone browser. No app, no account.' },
            { t: 'The digital menu opens', d: 'Categories, photos, prices and modifier choices come from your menu manager.' },
            { t: 'The customer submits an order', d: 'They add dishes and send. They get an order number and a tracking page.' },
            { t: 'The restaurant receives it', d: 'The order appears in order management, accepted automatically or by staff, depending on your setting.' },
            { t: 'The kitchen processes it', d: 'The ticket moves from new to preparing to ready, and the order status follows.' },
            { t: 'The order is served', d: 'Front of house marks it served and the guest sees the update.' },
            { t: 'The bill is paid', d: 'The guest requests the bill; staff settle it with the method used and the table is released.' },
        ],
        benefits: [
            { t: 'Fewer manual steps', d: 'The order is entered once, by the person who knows what they want.' },
            { t: 'Consistent orders', d: 'Modifiers are chosen from defined options rather than free text.' },
            { t: 'Better use of staff time', d: 'Servers handle service, not transcription.' },
            { t: 'A clearer guest experience', d: 'Guests can see the order status themselves.' },
        ],
        faqs: [
            { q: 'Can staff still take orders at the table?', a: 'Yes. QR ordering sits alongside the POS, so staff can still enter orders for guests who prefer it.' },
            { q: 'What if I want to check QR orders first?', a: 'Set QR orders to need acceptance and staff approve each one before it reaches the kitchen.' },
            { q: 'Can guests order more than once?', a: 'Guests can place further orders while their table session is open.' },
        ],
    },
    {
        slug: 'table-order-management',
        name: 'Table & Order Management',
        short: 'Keep the floor and the order list in step.',
        icon: LayoutGrid,
        meta: { title: 'Table & Order Management for Restaurants', description: 'Connect table status with the order list so hosts, servers and the kitchen work from the same picture of the floor.' },
        eyebrow: 'Solution · Floor control',
        headline: 'One picture of the floor and every order on it.',
        lede: 'Table status and order status live side by side. Seat a party, follow their order, see when they want the bill and turn the table over.',
        challenge: {
            title: 'The host stand and the kitchen are working from different pictures',
            body: 'When table status and order progress are tracked separately, hosts seat guests at tables that are not ready and servers miss tables that want attention.',
            points: ['No one is sure which tables are really free.', 'Orders are not obviously linked to their table.', 'Moving a party means re-entering the order.'],
        },
        modules: [
            { slug: 'table-management', role: 'Shows the state of every table' },
            { slug: 'order-management', role: 'Holds the orders for each table' },
            { slug: 'kitchen-display', role: 'Feeds progress back to the order' },
            { slug: 'staff-roles', role: 'Controls who can change what' },
        ],
        lanes: ['Front of house', 'Kitchen', 'Cashier'],
        flow: [
            { lane: 'Front of house', label: 'Table available', module: 'table-management' },
            { lane: 'Front of house', label: 'Guests seated, order opened', module: 'order-management' },
            { lane: 'Kitchen', label: 'Ticket in progress', module: 'kitchen-display' },
            { lane: 'Front of house', label: 'Order served', module: 'order-management' },
            { lane: 'Front of house', label: 'Table moves to billing', module: 'table-management' },
            { lane: 'Cashier', label: 'Bill settled', module: 'billing-payments' },
            { lane: 'Front of house', label: 'Table cleaned, available', module: 'table-management' },
        ],
        workflowSteps: [
            { t: 'The table is available', d: 'The floor view shows it ready to seat.' },
            { t: 'Guests are seated', d: 'Opening an order marks the table occupied and attaches the order.' },
            { t: 'The kitchen works the ticket', d: 'Kitchen status feeds back to the order automatically.' },
            { t: 'The order is served', d: 'Front of house marks it served.' },
            { t: 'The table moves to billing', d: 'A bill request makes the table stand out.' },
            { t: 'The bill is settled', d: 'Payment is recorded against the order.' },
            { t: 'The table is cleaned', d: 'It returns to available, ready for the next party.' },
        ],
        benefits: [
            { t: 'Shared floor view', d: 'Everyone sees the same table states.' },
            { t: 'Less re-entry', d: 'Table transfers carry the order across.' },
            { t: 'Visible handoffs', d: 'Billing and cleaning states show what needs doing next.' },
            { t: 'Clear permissions', d: 'Only the right roles edit tables and orders.' },
        ],
        faqs: [
            { q: 'Can I move guests to another table?', a: 'Yes. Transfer the table and its order moves with it.' },
            { q: 'Can I reserve a table?', a: 'Tables have a reserved status you can set.' },
        ],
    },
    {
        slug: 'kitchen-workflow',
        name: 'Kitchen Workflow Optimization',
        short: 'Move orders from the guest to the pass without paper.',
        icon: ChefHat,
        meta: { title: 'Kitchen Workflow for Restaurants', description: 'Send accepted orders to the kitchen display, track item progress and keep front of house updated without paper tickets.' },
        eyebrow: 'Solution · Kitchen',
        headline: 'Tickets the kitchen can trust, status the floor can see.',
        lede: 'Accepted orders reach the kitchen display on their own. As the kitchen works through them, the order status updates for the floor and the guest.',
        challenge: {
            title: 'The pass is a bottleneck of paper and shouting',
            body: 'When tickets are printed or relayed verbally, the kitchen cannot easily prioritise and front of house cannot see what has started.',
            points: ['Tickets get lost or stacked out of order.', 'Rush orders depend on someone shouting.', 'Servers keep asking whether a dish is ready.'],
        },
        modules: [
            { slug: 'order-management', role: 'Accepts the order and passes it on' },
            { slug: 'kitchen-display', role: 'Runs the tickets and items' },
            { slug: 'qr-ordering', role: 'Shows the guest the progress' },
        ],
        lanes: ['Guest', 'Front of house', 'Kitchen'],
        flow: [
            { lane: 'Guest', label: 'Order submitted', module: 'qr-ordering' },
            { lane: 'Front of house', label: 'Order accepted', module: 'order-management' },
            { lane: 'Kitchen', label: 'New ticket appears', module: 'kitchen-display' },
            { lane: 'Kitchen', label: 'Preparing, items marked', module: 'kitchen-display' },
            { lane: 'Kitchen', label: 'Ticket marked ready', module: 'kitchen-display' },
            { lane: 'Front of house', label: 'Order served', module: 'order-management' },
        ],
        workflowSteps: [
            { t: 'An order is submitted', d: 'From a QR scan or the POS.' },
            { t: 'It is accepted', d: 'Automatically, or by staff if you require approval.' },
            { t: 'A ticket appears', d: 'It shows in the new lane on the kitchen display.' },
            { t: 'The kitchen starts it', d: 'The ticket moves to preparing and items are marked as they progress.' },
            { t: 'The ticket is ready', d: 'Marked ready, it is clear for the pass.' },
            { t: 'The order is served', d: 'Front of house sees the status and serves it.' },
        ],
        benefits: [
            { t: 'Tickets stay visible', d: 'They stay on screen until handled.' },
            { t: 'Clear priorities', d: 'Flag rush tickets.' },
            { t: 'Status flows back', d: 'The floor does not need to ask.' },
            { t: 'Paper is optional', d: 'Print a ticket when you want one.' },
        ],
        faqs: [
            { q: 'Do I need a dedicated screen?', a: 'The kitchen display runs in a browser, so any screen with a browser works.' },
            { q: 'Does the guest see kitchen progress?', a: 'Yes. The QR tracking page shows the order status.' },
        ],
    },
    {
        slug: 'faster-restaurant-service',
        name: 'Faster Restaurant Service',
        short: 'Remove handoffs between the guest and the plate.',
        icon: Timer,
        meta: { title: 'Faster Restaurant Service Through Fewer Handoffs', description: 'See how connecting ordering, kitchen and billing removes manual handoffs in a typical dine-in service. Illustrative workflow, not measured results.' },
        eyebrow: 'Solution · Service flow',
        headline: 'Every handoff is a wait. Remove the ones you can.',
        lede: 'A typical order passes through several hands before it reaches the kitchen. Connecting ordering, kitchen and billing removes the relays that exist only to carry information.',
        challenge: {
            title: 'Information travels by people, and people are busy',
            body: 'Each time an order is written, carried, typed or called out, it waits for someone to be free. The delay is not in the cooking but in the relays between steps.',
            points: ['Order details are copied between paper and screens.', 'The kitchen is told verbally what the floor already knows.', 'Billing starts from scratch at the till.'],
        },
        modules: [
            { slug: 'qr-ordering', role: 'Removes the order-taking relay' },
            { slug: 'kitchen-display', role: 'Removes the ticket relay' },
            { slug: 'billing-payments', role: 'Removes the re-typing at checkout' },
            { slug: 'order-management', role: 'Keeps one record across steps' },
        ],
        lanes: ['Guest', 'Front of house', 'Kitchen', 'Cashier'],
        flow: [
            { lane: 'Guest', label: 'Guest orders on phone', module: 'qr-ordering' },
            { lane: 'Kitchen', label: 'Ticket on kitchen display', module: 'kitchen-display' },
            { lane: 'Front of house', label: 'Server delivers food' },
            { lane: 'Guest', label: 'Guest requests bill', module: 'billing-payments' },
            { lane: 'Cashier', label: 'Payment recorded', module: 'billing-payments' },
        ],
        compare: {
            label: 'Typical manual flow',
            flow: [
                { lane: 'Guest', label: 'Guest waits to order' },
                { lane: 'Front of house', label: 'Server writes order', handoff: true },
                { lane: 'Front of house', label: 'Server types or carries it', handoff: true },
                { lane: 'Kitchen', label: 'Kitchen reads paper ticket', handoff: true },
                { lane: 'Front of house', label: 'Server delivers food' },
                { lane: 'Guest', label: 'Guest waves for bill', handoff: true },
                { lane: 'Cashier', label: 'Bill rebuilt, then paid', handoff: true },
            ],
        },
        workflowSteps: [
            { t: 'Ordering', d: 'Without QR ordering, a server writes the order and then types it in. With it, the guest enters the order once.' },
            { t: 'Kitchen', d: 'Without a display, a ticket is printed or called out. With it, the ticket appears as soon as the order is accepted.' },
            { t: 'Service', d: 'The server still delivers the food. That relay is the human part of service and stays.' },
            { t: 'Billing', d: 'Without a request flow, the guest looks for staff. With it, the table shows as billing.' },
            { t: 'Payment', d: 'The bill is the order, so nothing is re-typed before payment is recorded.' },
        ],
        benefits: [
            { t: 'Fewer relays', d: 'Information moves between systems, not between people.' },
            { t: 'Staff keep the human part', d: 'Servers spend time on hospitality.' },
            { t: 'One record', d: 'The same order is used from table to payment.' },
            { t: 'Simple to adopt', d: 'Start with one module and add others.' },
        ],
        faqs: [
            { q: 'How much faster will service be?', a: 'It depends on your restaurant. We do not publish a guaranteed figure; the diagram shows which handoffs are removed.' },
            { q: 'Can I adopt this in stages?', a: 'Yes. Start with the POS or QR ordering, and add the kitchen display and billing flows later.' },
        ],
    },
    {
        slug: 'restaurant-billing-checkout',
        name: 'Billing & Checkout',
        short: 'Close tables cleanly with recorded payments.',
        icon: ReceiptText,
        meta: { title: 'Restaurant Billing & Checkout', description: 'From bill request to receipt and a released table. Record cash, card, mobile or online payments and reconcile cash with shifts.' },
        eyebrow: 'Solution · Checkout',
        headline: 'Checkout that finishes the table, not just the sale.',
        lede: 'When a guest asks for the bill, the table is flagged, the payment is recorded with its method, the receipt is available and the table is released.',
        challenge: {
            title: 'The end of the meal is where goodwill and cash leak',
            body: 'Waiting for the bill is the most common frustration at the end of a meal, and manual payment records make end-of-day reconciliation difficult.',
            points: ['Guests cannot get attention to pay.', 'Payment methods are recorded inconsistently.', 'Cash drawers are hard to reconcile.'],
        },
        modules: [
            { slug: 'billing-payments', role: 'Settles and records payment' },
            { slug: 'table-management', role: 'Flags billing and releases the table' },
            { slug: 'order-management', role: 'Holds the order being paid' },
            { slug: 'reports', role: 'Summarises payments collected' },
        ],
        lanes: ['Guest', 'Cashier', 'Owner'],
        flow: [
            { lane: 'Guest', label: 'Requests the bill', module: 'qr-ordering' },
            { lane: 'Cashier', label: 'Table shows billing', module: 'table-management' },
            { lane: 'Cashier', label: 'Payment method chosen', module: 'billing-payments' },
            { lane: 'Cashier', label: 'Payment recorded, receipt', module: 'billing-payments' },
            { lane: 'Cashier', label: 'Table released', module: 'table-management' },
            { lane: 'Owner', label: 'Payments in reports', module: 'reports' },
        ],
        workflowSteps: [
            { t: 'The guest requests the bill', d: 'From the QR page, or staff open the bill.' },
            { t: 'The table shows billing', d: 'Staff can see which tables are waiting.' },
            { t: 'A payment method is chosen', d: 'Cash, card, mobile or a connected online gateway.' },
            { t: 'Payment is recorded', d: 'It is stored with its method, and the receipt is available.' },
            { t: 'The table is released', d: 'It moves on to cleaning, then available.' },
            { t: 'The owner sees it in reports', d: 'Payments collected are grouped by method.' },
        ],
        benefits: [
            { t: 'Less waiting at the end', d: 'The bill request is visible to staff.' },
            { t: 'Consistent records', d: 'Every payment has a method.' },
            { t: 'Cash visibility', d: 'Shifts and movements support reconciliation.' },
            { t: 'Your choice of methods', d: 'Enable only what you accept.' },
        ],
        faqs: [
            { q: 'Which payment methods can I take?', a: 'Cash, card, mobile and other methods, plus online gateways you connect.' },
            { q: 'Can I reconcile the cash drawer?', a: 'Yes. Shifts and cash movements record opening, sales, cash in and out, and closing.' },
        ],
    },
    {
        slug: 'restaurant-reporting',
        name: 'Owner Visibility & Reporting',
        short: 'See sales, payments and products without chasing staff.',
        icon: Gauge,
        meta: { title: 'Restaurant Owner Reporting & Visibility', description: 'Give owners a clear view of sales, payments collected, orders and products, with period filters and CSV export.' },
        eyebrow: 'Solution · Owner view',
        headline: 'Run the restaurant on facts, not end-of-day guesses.',
        lede: 'Because orders, payments and products are recorded as service happens, the owner can open a report whenever they need one.',
        challenge: {
            title: 'Owners learn how the day went after it is over',
            body: 'When numbers are compiled by hand, they arrive late and are hard to trust.',
            points: ['Totals are added up from different places.', 'Payments by method need manual tallying.', 'Which dishes sell is a matter of opinion.'],
        },
        modules: [
            { slug: 'reports', role: 'Presents the reports' },
            { slug: 'order-management', role: 'Source of sales and orders' },
            { slug: 'billing-payments', role: 'Source of payments collected' },
            { slug: 'branch-management', role: 'Scope by branch' },
        ],
        lanes: ['Front of house', 'Cashier', 'Owner'],
        flow: [
            { lane: 'Front of house', label: 'Orders recorded', module: 'order-management' },
            { lane: 'Cashier', label: 'Payments recorded', module: 'billing-payments' },
            { lane: 'Owner', label: 'Opens a report', module: 'reports' },
            { lane: 'Owner', label: 'Sets the period', module: 'reports' },
            { lane: 'Owner', label: 'Reads sales and products', module: 'reports' },
            { lane: 'Owner', label: 'Exports to CSV', module: 'reports' },
        ],
        workflowSteps: [
            { t: 'Orders are recorded', d: 'As service happens, in the same system staff use.' },
            { t: 'Payments are recorded', d: 'Each with its method.' },
            { t: 'The owner opens a report', d: 'Sales, payments collected, orders or products.' },
            { t: 'They set the period', d: 'Choose the dates to review.' },
            { t: 'They read the numbers', d: 'Summary figures, a chart and a table.' },
            { t: 'They export', d: 'Download CSV for an accountant or a spreadsheet.' },
        ],
        benefits: [
            { t: 'Operational visibility', d: 'Reports draw on live records.' },
            { t: 'Less manual tallying', d: 'No copying figures between sheets.' },
            { t: 'Shareable data', d: 'Export what your accountant needs.' },
            { t: 'Access control', d: 'Limit reports to the right roles.' },
        ],
        faqs: [
            { q: 'Can I see reports for one branch?', a: 'Reports follow the branch you are working in.' },
            { q: 'Can my accountant get the data?', a: 'Export any report as CSV.' },
        ],
    },
];

export const solutionWorkflowBySlug = (slug: string) => SOLUTION_WORKFLOWS.find((s) => s.slug === slug);
