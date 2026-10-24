import {
    Button,
    MarketingHead,
    MarketingLayout,
    ProductMockup,
    SectionHeading,
    trackConversion,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface FeatureDetail {
    title: string;
    badge: string;
    heroHeadline: string;
    heroSubheadline: string;
    problemTitle: string;
    problemDescription: string;
    problemConsequences: string[];
    workflowTitle: string;
    workflowSteps: { step: string; title: string; desc: string }[];
    uiPreviewTitle: string;
    uiPreviewSubtitle: string;
    uiPreviewContent: React.ReactNode;
    benefits: { title: string; desc: string }[];
    relatedSlugs: { slug: string; title: string }[];
    faqs: { q: string; a: string }[];
}

const FEATURE_DATA: Record<string, FeatureDetail> = {
    'restaurant-pos': {
        title: 'Point of Sale (POS)',
        badge: 'FRONT OF HOUSE ENGINE',
        heroHeadline: 'Speed Through Rush Hours with Zero Order Errors',
        heroSubheadline:
            'A responsive, touch-first POS terminal engineered for intense counter and table service. Ring up complex modifications, split checks, and process multi-tender payments in seconds.',
        problemTitle: 'The Slow Checkout & Lost Ticket Crisis',
        problemDescription:
            'During peak dining hours, sluggish POS interfaces create counter queues, while manual handwriting leads to misunderstood modifiers, food comps, and frustrated diners.',
        problemConsequences: [
            'Long lines leading to walk-aways during busy lunch periods',
            'Servers making mistakes on modifiers and allergy notes',
            'Split-bill headaches creating delays at checkout',
        ],
        workflowTitle: 'The 3-Step Instant Checkout Workflow',
        workflowSteps: [
            { step: '01', title: 'Tap & Customize', desc: 'Select items, choose variants, and tap preset allergy/modifier tags.' },
            { step: '02', title: 'Route to Kitchen', desc: 'Ticket routes instantly to designated KDS stations before payment completes.' },
            { step: '03', title: 'Settle & Print', desc: 'Accept cash, card, or split payment and generate crisp thermal receipts.' },
        ],
        uiPreviewTitle: 'Touch Dine POS Terminal v2.4',
        uiPreviewSubtitle: 'Main Counter Register #01',
        uiPreviewContent: (
            <div className="p-6 bg-stone-100 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>ORDER #1042 · TABLE 08</span>
                    <span className="text-emerald-700">STATUS: OPEN</span>
                </div>
                <div className="rounded-xl bg-white p-3 border border-stone-200 space-y-1.5 text-stone-700 font-sans">
                    <div className="flex justify-between font-bold">
                        <span>2x Wagyu Burger ($16.50)</span>
                        <span>$33.00</span>
                    </div>
                    <div className="text-[11px] text-stone-500 pl-2">↳ Mod: Gluten-Free Bun, Extra Aioli</div>
                    <div className="flex justify-between font-bold pt-1 border-t border-stone-100">
                        <span>1x Rosemary Fries ($6.00)</span>
                        <span>$6.00</span>
                    </div>
                </div>
                <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-stone-200">
                    <span>TOTAL BALANCE (TAX INCL.)</span>
                    <span className="text-base text-stone-900">$39.00</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Lightning-Fast Split Checks', desc: 'Split the bill evenly by headcount, seat number, or arbitrary currency amounts with zero math errors.' },
            { title: 'Offline-Tolerant Architecture', desc: 'Continue entering orders and printing kitchen tickets locally even during temporary internet blips.' },
            { title: 'Hardware Freedom', desc: 'Runs seamlessly on any iPad, Android tablet, touchscreen terminal, or desktop browser with standard ESC/POS printers.' },
            { title: 'Manager Approval Safeguards', desc: 'Require a secure manager PIN for discounts above policy thresholds, voids, and cash drawer openings.' },
        ],
        relatedSlugs: [
            { slug: 'kitchen-display', title: 'Kitchen Display (KDS)' },
            { slug: 'cash-management', title: 'Cash Shifts & Registers' },
            { slug: 'table-management', title: 'Table Management' },
        ],
        faqs: [
            { q: 'Can we use our existing receipt printer?', a: 'Yes. Touch Dine connects with standard thermal receipt printers supporting ESC/POS over USB, Ethernet LAN, or Bluetooth.' },
            { q: 'Can staff give discounts without authorization?', a: 'No. You can configure discount thresholds in Settings. Any discount exceeding the threshold requires an authorizing manager PIN.' },
            { q: 'Does it support takeout and delivery orders?', a: 'Yes. You can switch between Dine-in, Takeaway, Counter, and Delivery with one tap.' },
        ],
    },

    'kitchen-display': {
        title: 'Kitchen Display System (KDS)',
        badge: 'KITCHEN OPERATIONS',
        heroHeadline: 'Direct Kitchen Lines with Real-Time Bump Displays',
        heroSubheadline:
            'Replace wet paper tickets with clear, digital Kanban boards. Prioritize urgent tickets, route items to prep stations, and eliminate kitchen confusion.',
        problemTitle: 'Lost Chits and Miscommunicated Modifications',
        problemDescription:
            'In busy kitchens, paper tickets get splattered with grease, misplaced, or dropped. Modifiers get overlooked, and ticket pacing between starters and mains breaks down.',
        problemConsequences: [
            'Cooks remaking food due to misread paper modifications',
            'Uneven table pacing where entrees arrive before appetizers',
            'Waitstaff repeatedly interrupting line cooks to ask about order statuses',
        ],
        workflowTitle: 'The Connected Kitchen Workflow',
        workflowSteps: [
            { step: '01', title: 'Auto-Routing', desc: 'Dishes route to Grill, Fryer, Cold Salad, or Bar stations automatically.' },
            { step: '02', title: 'Color-Coded Timers', desc: 'Tickets turn amber after 10 mins and red after 15 mins to highlight delays.' },
            { step: '03', title: 'One-Tap Bump', desc: 'Cooks tap individual items or the full ticket when ready, notifying floor staff.' },
        ],
        uiPreviewTitle: 'Live Kitchen Display (KDS)',
        uiPreviewSubtitle: 'Station: Hot Line & Grill',
        uiPreviewContent: (
            <div className="p-6 bg-stone-900 text-white text-xs font-mono space-y-3">
                <div className="flex justify-between items-center text-stone-400">
                    <span>TICKET #0482 · TABLE 04</span>
                    <span className="text-amber-400 font-bold">ELAPSED: 8m</span>
                </div>
                <div className="rounded-lg bg-stone-800 p-3 border border-indigo-500 space-y-1">
                    <div className="font-bold text-indigo-300">2x Pan-Seared Salmon</div>
                    <div className="text-[11px] text-stone-300">↳ Rare / Sauce on side</div>
                    <div className="font-bold text-stone-200">1x Heirloom Salad</div>
                </div>
                <div className="flex justify-between text-[11px] pt-1">
                    <span className="text-emerald-400 font-bold">STATUS: PREPARING</span>
                    <span className="text-stone-400">Station: Grill</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Station-Specific Filtering', desc: 'Grill cooks only see steaks and burgers; bar staff only see drink cocktails.' },
            { title: 'Elapsed Time Alerts', desc: 'Visual warnings prevent forgotten tickets and keep average ticket times under your target.' },
            { title: 'Urgent Priority Flag', desc: 'Floor managers can flag specific orders as Urgent to bump them to the front of the queue.' },
            { title: 'Reprint Chit Anytime', desc: 'Print physical tickets directly from the screen whenever an expo runner requires paper.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'order-management', title: 'Order Management' },
            { slug: 'table-management', title: 'Table Management' },
        ],
        faqs: [
            { q: 'Can we run multiple kitchen screens for different stations?', a: 'Yes. Touch Dine allows you to set up distinct KDS screens for Grill, Fry, Salad, Expo, and Bar.' },
            { q: 'Do we need special bump bars?', a: 'No. You can use standard touchscreens, or standard keyboard shortcuts (spacebar, numbers) to bump tickets.' },
            { q: 'Can tickets be recalled if bumped by mistake?', a: 'Yes. The KDS includes a completed ticket drawer where bumped tickets can be recalled with one click.' },
        ],
    },

    'table-management': {
        title: 'Table & Floor Management',
        badge: 'FLOOR OPERATIONS',
        heroHeadline: 'Optimize Table Turns and Floor Layouts in Real-Time',
        heroSubheadline:
            'A visual floorplan that reflects your dining room. Monitor table occupancy, track guest covers, and transfer bills seamlessly between tables and the bar.',
        problemTitle: 'Unorganized Seating & Slow Table Turnover',
        problemDescription:
            'Hostesses guessing table status causes empty tables to sit unbussed while walk-in diners are turned away. Moving guests between the bar and tables leads to split checks getting lost.',
        problemConsequences: [
            'Table turns lagging by 15-20 minutes during peak dinner service',
            'Confusion over which tables have paid vs waiting for food',
            'Loss of revenue when bar tabs aren’t properly transferred to dinner tables',
        ],
        workflowTitle: 'Floorplan Management Workflow',
        workflowSteps: [
            { step: '01', title: 'Design Dining Areas', desc: 'Configure Main Dining, Outdoor Patio, and VIP Lounge layouts.' },
            { step: '02', title: 'Track Occupancy', desc: 'Tables show clear colors for Open, Seated, Bill Printed, and Cleaning.' },
            { step: '03', title: 'Seamless Transfers', desc: 'Move an order from Bar Stool 3 to Table 14 with all items preserved.' },
        ],
        uiPreviewTitle: 'Dining Area Floorplan',
        uiPreviewSubtitle: 'Main Dining Hall · Active Shift',
        uiPreviewContent: (
            <div className="p-6 bg-stone-100 text-xs space-y-3 font-mono">
                <div className="flex justify-between text-stone-700 font-bold">
                    <span>MAIN ROOM: 8 / 12 TABLES OCCUPIED</span>
                    <span className="text-emerald-700">4 AVAILABLE</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="rounded-lg bg-rose-100 border border-rose-300 p-2.5 text-center text-rose-900 font-bold">
                        T-01 (4p) · $92.00
                    </div>
                    <div className="rounded-lg bg-emerald-100 border border-emerald-300 p-2.5 text-center text-emerald-900 font-bold">
                        T-02 (2p) · OPEN
                    </div>
                    <div className="rounded-lg bg-rose-100 border border-rose-300 p-2.5 text-center text-rose-900 font-bold">
                        T-03 (6p) · $154.00
                    </div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Accurate Guest Cover Tracking', desc: 'Know your exact spend-per-cover metric across servers and meal periods.' },
            { title: 'One-Click Order Transfers', desc: 'Transfer tabs from the bar to a table or merge two dining tables instantly.' },
            { title: 'Table Status Visibility', desc: 'Hostesses instantly spot tables that are ready for seating or in need of bussing.' },
            { title: 'Multi-Room Support', desc: 'Switch effortlessly between indoor dining, terrace, rooftop, and private event rooms.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'order-management', title: 'Order Management' },
            { slug: 'staff-management', title: 'Staff Roles' },
        ],
        faqs: [
            { q: 'Can we customize the number of seats per table?', a: 'Yes. Each table has configurable seat counts, shapes, and room assignments.' },
            { q: 'What happens when diners move from the bar to a dining table?', a: 'You click "Transfer", select the new table, and the open check moves over instantly.' },
            { q: 'Can we see how long a table has been seated?', a: 'Yes. The table card displays the elapsed seating time in minutes.' },
        ],
    },

    'inventory-management': {
        title: 'Inventory & Recipe Costing',
        badge: 'BACK OF HOUSE INTELLIGENCE',
        heroHeadline: 'Gram-Level Recipe Deductions. Zero Stock Surprises.',
        heroSubheadline:
            'Connect raw ingredients to your menu. Every burger sold automatically decrements ground beef, buns, and condiments, giving you real-time stock balances and accurate food cost margins.',
        problemTitle: 'Food Cost Bleed and Unrecorded Spoilage',
        problemDescription:
            'Without recipe-linked stock, restaurants rely on manual monthly counts. By the time discrepancies are noticed, thousands of dollars have been lost to over-portioning, theft, or unnoticed spoilage.',
        problemConsequences: [
            'Surprise 86’ing of signature dishes in the middle of dinner service',
            'Food cost percentages fluctuating without knowing the cause',
            'Capital tied up in overstocked perishable ingredients',
        ],
        workflowTitle: 'Automated Stock Accounting Workflow',
        workflowSteps: [
            { step: '01', title: 'Define Ingredients', desc: 'Enter raw units of measure (grams, milliliters, pieces, cases).' },
            { step: '02', title: 'Build Recipe BOM', desc: 'Link ingredients to menu items with exact portion quantities.' },
            { step: '03', title: 'Auto-Deduction', desc: 'Every settled POS ticket automatically updates raw stock in real time.' },
        ],
        uiPreviewTitle: 'Inventory Stock Level Ledger',
        uiPreviewSubtitle: 'Branch Central Store · Real-time Balance',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="flex justify-between items-center text-stone-700 font-bold">
                    <span>INGREDIENT STOCK BALANCES</span>
                    <span className="text-emerald-700">UPDATED LIVE</span>
                </div>
                <div className="space-y-1.5">
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span className="font-bold">Wagyu Beef Patties</span>
                        <span className="text-emerald-700 font-bold">42 pcs in stock</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span className="font-bold">Artisan Brioche Buns</span>
                        <span className="text-amber-600 font-bold">14 pcs (Low Stock Alert)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span className="font-bold">Whole Milk</span>
                        <span className="text-emerald-700 font-bold">18.5 Liters</span>
                    </div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Dynamic Cost of Goods Sold (COGS)', desc: 'View live gross profit margins for every item on your menu based on current ingredient costs.' },
            { title: 'Automated Low-Stock Alerts', desc: 'Receive notifications before key ingredients run out so your purchasing team can reorder in time.' },
            { title: 'Physical Count Auditing', desc: 'Perform opening and cyclical stock counts with variance calculations against theoretical usage.' },
            { title: 'One-Tap Out-of-Stock (86)', desc: 'Mark dishes unavailable across all POS terminals with one tap when stock is exhausted.' },
        ],
        relatedSlugs: [
            { slug: 'menu-management', title: 'Menu Management' },
            { slug: 'purchasing-suppliers', title: 'Purchasing & Suppliers' },
            { slug: 'expense-management', title: 'Waste & Loss Management' },
        ],
        faqs: [
            { q: 'Can ingredients use fractional quantities (e.g. 0.25 kg)?', a: 'Yes. Touch Dine supports exact decimal measurements across metric and imperial units.' },
            { q: 'How does wastage affect inventory?', a: 'Recorded waste entries (burnt, expired, dropped) immediately reduce stock with an audited reason.' },
            { q: 'Can we track supplier prices over time?', a: 'Yes. Each goods receipt logs the unit price, updating the moving average cost of the ingredient.' },
        ],
    },

    'cash-management': {
        title: 'Cash Registers & Shifts',
        badge: 'CASH & AUDIT SECURITY',
        heroHeadline: 'Blind Till Reconciliations. Zero Mystery Shortages.',
        heroSubheadline:
            'Maintain strict financial controls over physical cash. Open shifts with declared floats, log mid-shift payouts, and require blind cash counts at closing before showing discrepancies.',
        problemTitle: 'Unbalanced Cash Drawers and Phantom Payouts',
        problemDescription:
            'When cashiers know expected drawer balances before counting, cash shortages get masked. Payouts for produce deliveries or ice go unrecorded, leaving owners in the dark.',
        problemConsequences: [
            'Cash discrepancies noticed days later during bank deposits',
            'Unrecorded petty cash spending eating into weekly margins',
            'Lack of accountability between morning and evening shift handovers',
        ],
        workflowTitle: 'Audited Shift Lifecycle Workflow',
        workflowSteps: [
            { step: '01', title: 'Shift Open Float', desc: 'Cashier declares starting change fund before ringing any transactions.' },
            { step: '02', title: 'Logged Movements', desc: 'Any cash drop or pay-in requires a reason and amount declaration.' },
            { step: '03', title: 'Blind Count Close', desc: 'Cashier counts bills and coins blindly; system calculates variance automatically.' },
        ],
        uiPreviewTitle: 'Shift Cash Reconciliation',
        uiPreviewSubtitle: 'Terminal 01 · Shift #104 Closing',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>SHIFT AUDIT SUMMARY</span>
                    <span className="text-emerald-700">BALANCED</span>
                </div>
                <div className="space-y-1 text-stone-600">
                    <div className="flex justify-between"><span>Declared Float:</span><span>$250.00</span></div>
                    <div className="flex justify-between"><span>Cash Orders:</span><span>$720.00</span></div>
                    <div className="flex justify-between text-rose-600"><span>Paid Out (Produce):</span><span>-$35.00</span></div>
                    <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-stone-200">
                        <span>Counted Total:</span><span>$935.00</span>
                    </div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Blind Count Verification', desc: 'Cashiers cannot game closing numbers because expected totals are hidden until counts are submitted.' },
            { title: 'Mid-Shift Cash Movements', desc: 'Track safe drops, change additions, and vendor payouts with required reason notes.' },
            { title: 'Variance Threshold Warnings', desc: 'Discrepancies above your configured threshold generate automated alerts for store owners.' },
            { title: 'Audited Shift Reports', desc: 'Export shift breakdowns detailing card batches, cash counts, discounts, and voids.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
            { slug: 'staff-management', title: 'Staff Roles' },
        ],
        faqs: [
            { q: 'Can a manager open multiple shifts simultaneously?', a: 'Each physical terminal or drawer maintains an independent open shift with its own float.' },
            { q: 'What happens if there is a till discrepancy?', a: 'The variance is logged with the cashier’s timestamp and included in the end-of-day audit report.' },
            { q: 'Can cashiers see the expected cash before counting?', a: 'No. Touch Dine enforces blind counting so staff must count actual bills and coins first.' },
        ],
    },

    'reports-analytics': {
        title: 'Reports & Analytics',
        badge: 'BUSINESS INTELLIGENCE',
        heroHeadline: 'Real-Time Operational Visibility into Profits & Volume',
        heroSubheadline:
            'Understand your restaurant’s true performance. Live gross sales, prime costs, top-performing menu items, hourly rush velocity, and cashier productivity in clear dashboards.',
        problemTitle: 'Blind Decision-Making from Outdated Spreadsheets',
        problemDescription:
            'Most restaurant owners only discover their profitability weeks after the month closes when their accountant delivers reports, by which time unprofitable dishes have already cost thousands.',
        problemConsequences: [
            'Keeping low-margin dishes on the menu without realizing they lose money',
            'Understaffing peak rush hours or overstaffing during slow mid-afternoon lulls',
            'Inability to compare branch performance across multi-unit operations',
        ],
        workflowTitle: 'Daily Analytics Workflow',
        workflowSteps: [
            { step: '01', title: 'Live Ingestion', desc: 'Sales, discounts, taxes, and tenders update in real time with each receipt.' },
            { step: '02', title: 'Automated COGS', desc: 'Calculates Cost of Goods Sold automatically from recipe deductions.' },
            { step: '03', title: 'Actionable Insights', desc: 'Review top margin contributors and adjust prep schedules accordingly.' },
        ],
        uiPreviewTitle: 'Daily Revenue & Margin Report',
        uiPreviewSubtitle: 'Aggregated Across All Locations',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                        <div className="text-[10px] text-stone-500">GROSS SALES</div>
                        <div className="font-bold text-stone-900 text-sm">$4,850.00</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                        <div className="text-[10px] text-stone-500">COGS (FOOD COST)</div>
                        <div className="font-bold text-rose-600 text-sm">$1,358.00 (28%)</div>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                        <div className="text-[10px] text-stone-500">GROSS PROFIT</div>
                        <div className="font-bold text-emerald-700 text-sm">$3,492.00 (72%)</div>
                    </div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Product Mix Engineering', desc: 'Identify your "Stars" (high volume, high margin) versus "Dogs" (low volume, low margin) to optimize your menu.' },
            { title: 'Hourly Sales Velocity', desc: 'See sales and guest count trends by hour of the day to optimize kitchen prep and staff scheduling.' },
            { title: 'Tax & VAT Reconciliations', desc: 'Export tax reports broken down by inclusive and exclusive rates ready for compliance filings.' },
            { title: 'Staff Performance Auditing', desc: 'Track sales volume, average ticket size, discount frequency, and void counts per staff member.' },
        ],
        relatedSlugs: [
            { slug: 'cash-management', title: 'Cash Shifts' },
            { slug: 'inventory-management', title: 'Inventory Management' },
            { slug: 'multi-branch-management', title: 'Multi-Branch Operations' },
        ],
        faqs: [
            { q: 'Can we filter reports by specific date ranges?', a: 'Yes. Filter by Today, Yesterday, This Week, This Month, or any custom date range.' },
            { q: 'Can reports be exported to CSV or PDF?', a: 'Yes. All sales, product mix, and tax reports can be exported instantly.' },
            { q: 'Can cashiers see restaurant profit reports?', a: 'No. Reports are gated strictly by the reports.view permission, typically restricted to managers and owners.' },
        ],
    },

    'menu-management': {
        title: 'Menu & Recipe Engineering',
        badge: 'CATALOG & RECIPES',
        heroHeadline: 'Centralized Menu Catalog with Instant Availability Controls',
        heroSubheadline:
            'Create flexible categories, modifiers, size variants, and price tiers for dine-in, takeaway, and delivery. Toggle 86’d items instantly across every station.',
        problemTitle: 'Static Menus and Clunky Modifier Options',
        problemDescription:
            'Menus with rigid item structures make it hard for servers to handle custom allergy notes or size upgrades, resulting in manual kitchen scribbles and lost up-charge revenue.',
        problemConsequences: [
            'Staff forgetting to charge for premium modifiers and extra toppings',
            'Out-of-stock items still being sold by servers who didn’t hear the pre-shift announcement',
            'Inability to set distinct pricing for delivery versus dine-in menus',
        ],
        workflowTitle: 'Menu Management Workflow',
        workflowSteps: [
            { step: '01', title: 'Structure Categories', desc: 'Group dishes into Appetizers, Mains, Sides, Desserts, and Beverages.' },
            { step: '02', title: 'Attach Modifiers', desc: 'Configure required choices (temperature) and optional add-ons (extra cheese).' },
            { step: '03', title: 'Set Price Tiers', desc: 'Configure dine-in, takeaway, and delivery prices per dish or variant.' },
        ],
        uiPreviewTitle: 'Menu Engineering Editor',
        uiPreviewSubtitle: 'Item: Wood-Fired Pizza (Variants & Add-ons)',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>ITEM: WOOD-FIRED MARGHERITA</span>
                    <span className="text-emerald-700">86 STATUS: IN STOCK</span>
                </div>
                <div className="rounded-lg bg-white p-3 border border-stone-200 space-y-1.5 text-stone-700">
                    <div className="flex justify-between"><span>Dine-In Price:</span><span className="font-bold">$14.00</span></div>
                    <div className="flex justify-between"><span>Delivery Price (+15%):</span><span className="font-bold">$16.10</span></div>
                    <div className="flex justify-between text-stone-500"><span>Food Cost (BOM):</span><span>$3.20 (22.8%)</span></div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Multi-Channel Pricing Tiers', desc: 'Set distinct prices for Dine-In, Takeaway, and Delivery to account for platform fees.' },
            { title: 'One-Tap 86 Availability', desc: 'Instantly gray out dishes across all terminals when prep runs out during service.' },
            { title: 'Required vs Optional Modifiers', desc: 'Enforce steak temperature selection before servers can save the ticket.' },
            { title: 'Recipe BOM Association', desc: 'Link dishes directly to raw ingredients for automated inventory deduction.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'inventory-management', title: 'Inventory Management' },
            { slug: 'kitchen-display', title: 'Kitchen Display' },
        ],
        faqs: [
            { q: 'Can we create size variants (e.g. Small, Medium, Large)?', a: 'Yes. Each product can have multiple variants with specific prices and ingredient recipes.' },
            { q: 'Can we set tax-inclusive vs tax-exclusive prices?', a: 'Yes. You can toggle whether listed menu prices already include tax or add tax at checkout.' },
            { q: 'Does changing a menu item update across all terminals immediately?', a: 'Yes. Updates sync across all connected terminals in real time.' },
        ],
    },

    'order-management': {
        title: 'Order Management',
        badge: 'FULFILLMENT PIPELINE',
        heroHeadline: 'Track Every Ticket from Ring-Up to Table Delivery',
        heroSubheadline:
            'A unified order history and tracking hub. Manage open tabs, review historical tickets, reprint thermal receipts, and audit voids with complete timestamps.',
        problemTitle: 'Disjointed Order Tracking and Lost Receipts',
        problemDescription:
            'When customers ask to add an item to an open tab or need a duplicate receipt for corporate expenses, staff struggle to locate past tickets without a centralized order ledger.',
        problemConsequences: [
            'Open orders left uncollected at shift end',
            'Inability to audit voided orders and examine why meals were cancelled',
            'Frustrated guests waiting for manual receipt lookups',
        ],
        workflowTitle: 'Order Lifecycle Tracking',
        workflowSteps: [
            { step: '01', title: 'Unified Ingestion', desc: 'Orders from dine-in, takeaway, and delivery populate one central registry.' },
            { step: '02', title: 'Live Status', desc: 'Monitor tickets across Open, In Kitchen, Ready, Settled, and Voided.' },
            { step: '03', title: 'Audit Trail', desc: 'Inspect who took the order, who voided items, and which manager approved.' },
        ],
        uiPreviewTitle: 'Live Order Registry',
        uiPreviewSubtitle: 'Active Shift #104 Registry',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">#1042 · T-04 (Dine-in)</span>
                    <span className="text-amber-600 font-bold">IN KITCHEN · $39.00</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">#1041 · Counter (Takeaway)</span>
                    <span className="text-emerald-700 font-bold">SETTLED · $18.50</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Searchable Order Registry', desc: 'Search past tickets by order number, customer name, table, server, or date.' },
            { title: 'Duplicate Receipt Printing', desc: 'Reprint thermal receipts and kitchen prep slips with one click.' },
            { title: 'Audited Void Log', desc: 'Every void requires a reason note and manager approval to eliminate employee theft.' },
            { title: 'Fulfillment Status Tracking', desc: 'Keep front-of-house staff aligned on kitchen ticket progress.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'kitchen-display', title: 'Kitchen Display' },
            { slug: 'table-management', title: 'Table Management' },
        ],
        faqs: [
            { q: 'Can we settle orders later (house account / tabs)?', a: 'Yes. Orders can remain open on a table or customer account until settlement.' },
            { q: 'Can a cashier void an order after it has been paid?', a: 'Voiding settled transactions requires manager approval and records an audited reversal entry.' },
            { q: 'How long are historical receipts preserved?', a: 'All order histories and receipt records are retained permanently within your tenant account.' },
        ],
    },

    'staff-management': {
        title: 'Staff Roles & Manager PINs',
        badge: 'TEAM & PERMISSIONS',
        heroHeadline: 'Role-Based Access Control and Manager Security PINs',
        heroSubheadline:
            'Delegate operational responsibilities without compromising security. Granular permissions for owners, store managers, cashiers, kitchen cooks, and floor waiters.',
        problemTitle: 'Uncontrolled Staff Access and Discount Abuse',
        problemDescription:
            'Giving staff master passwords or shared logins makes it impossible to trace who authorized a discount, voided a ticket, or took cash from the drawer.',
        problemConsequences: [
            'Unauthorized discounting for friends eating into gross margin',
            'Cashiers blaming each other for end-of-shift till discrepancies',
            'Staff seeing private company financial figures and owner reports',
        ],
        workflowTitle: 'Staff Access Architecture',
        workflowSteps: [
            { step: '01', title: 'Role Assignment', desc: 'Assign roles: Tenant Owner, Manager, Cashier, Cook, or Waiter.' },
            { step: '02', title: 'Manager 4-Digit PIN', desc: 'Managers set private security PINs for approving sensitive actions.' },
            { step: '03', title: 'Audited Session Log', desc: 'Track employee login activity, and revoke access instantly if needed.' },
        ],
        uiPreviewTitle: 'Staff Role Permission Matrix',
        uiPreviewSubtitle: 'Security Configuration',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">Role: Cashier</span>
                    <span className="text-stone-600">POS Use, Open Shifts</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">Role: Store Manager</span>
                    <span className="text-emerald-700 font-bold">All Permissions + PIN Approval</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Manager Security PINs', desc: 'Prompt for a 4-digit manager PIN directly on screen when sensitive actions occur.' },
            { title: 'Branch-Specific Assignments', desc: 'Restrict employee logins strictly to their assigned branch location.' },
            { title: 'Session Revocation', desc: 'Instantly revoke active sessions if an employee departs or an unauthorized device connects.' },
            { title: 'Secure Invitation Links', desc: 'Invite staff via secure, signed email invitation links with zero manual password sharing.' },
        ],
        relatedSlugs: [
            { slug: 'cash-management', title: 'Cash Shifts' },
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
        ],
        faqs: [
            { q: 'Can staff share logins?', a: 'We recommend unique user accounts so all voids, discounts, and shift closings are audited to the individual.' },
            { q: 'How does the Manager PIN work?', a: 'When a cashier tries to void or give an over-threshold discount, a PIN dialog prompts the manager on screen.' },
            { q: 'Can we invite staff without giving them email access to company settings?', a: 'Yes. Roles restrict staff strictly to their operational workspace.' },
        ],
    },

    'multi-branch-management': {
        title: 'Multi-Branch Operations',
        badge: 'MULTI-LOCATION SCALABILITY',
        heroHeadline: 'Run Multiple Restaurant Locations from a Single Hub',
        heroSubheadline:
            'A centralized architecture for expanding restaurant groups. Manage a master menu catalog, push branch-specific pricing, and dispatch inter-branch inventory transfers.',
        problemTitle: 'Disconnected Multi-Store Chaos',
        problemDescription:
            'Operating multiple locations with independent software means updating menu prices 3 times, transferring stock blindly on phone calls, and assembling chain reports by hand.',
        problemConsequences: [
            'Menu pricing discrepancies between branch locations',
            'Stock shortages at one branch while another branch sits on surplus goods',
            'No consolidated visibility into company-wide cash flow and top sellers',
        ],
        workflowTitle: 'Multi-Branch Synchronization',
        workflowSteps: [
            { step: '01', title: 'Central Catalog', desc: 'Create dishes once at the master level with branch price tier overrides.' },
            { step: '02', title: 'Inter-Branch Transfers', desc: 'Dispatch stock from Central Store to Branch 2 with dispatch/receipt approvals.' },
            { step: '03', title: 'Consolidated Reporting', desc: 'View chain-wide gross revenue alongside branch-by-branch comparisons.' },
        ],
        uiPreviewTitle: 'Multi-Branch Control Center',
        uiPreviewSubtitle: 'Touch Dine Hospitality Group (3 Branches)',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">Downtown Flagship:</span>
                    <span className="text-emerald-700 font-bold">$3,840.00 today (Active)</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold">Westside Cafe:</span>
                    <span className="text-emerald-700 font-bold">$1,920.00 today (Active)</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Inter-Branch Stock Transfers', desc: 'Move inventory between locations with structured dispatch, receiving, and approval states.' },
            { title: 'Branch Price Overrides', desc: 'Charge slightly higher menu prices at high-rent locations while maintaining a shared catalog.' },
            { title: 'Consolidated Chain Analytics', desc: 'Compare revenue, food cost percentage, and table turn speed across all locations.' },
            { title: 'Localized Tax & Currencies', desc: 'Set branch-specific tax rates, service charge rules, and opening hours.' },
        ],
        relatedSlugs: [
            { slug: 'inventory-management', title: 'Inventory Management' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
            { slug: 'menu-management', title: 'Menu Management' },
        ],
        faqs: [
            { q: 'Which plan includes multi-branch management?', a: 'The Growth plan includes up to 3 branches, and the Business plan includes unlimited branch locations.' },
            { q: 'Can branch managers see data from other branches?', a: 'No. You can restrict staff users strictly to their assigned branch location.' },
            { q: 'How do inter-branch stock transfers work?', a: 'Branch A creates a dispatch transfer; stock leaves Branch A and enters Branch B upon confirmed receipt.' },
        ],
    },

    'purchasing-suppliers': {
        title: 'Purchasing & Suppliers',
        badge: 'SUPPLY CHAIN & PROCURE',
        heroHeadline: 'Supplier Purchase Orders and Goods Receipt Reconciliation',
        heroSubheadline:
            'Streamline your supplier ordering. Create formal purchase orders (POs), track supplier balances, receive goods into inventory, and record vendor payouts.',
        problemTitle: 'Informal Text Orders and Missing Delivery Slips',
        problemDescription:
            'Placing food orders via phone calls or WhatsApp leads to incorrect deliveries, over-invoicing by suppliers, and inventory stock balances getting thrown out of sync.',
        problemConsequences: [
            'Paying for produce and meat that was never actually delivered',
            'No record of outstanding accounts payable to vendors',
            'Staff manually updating stock counts when delivery trucks arrive',
        ],
        workflowTitle: 'Procurement to Stock Workflow',
        workflowSteps: [
            { step: '01', title: 'Generate PO', desc: 'Create a draft purchase order for needed ingredients and submit to supplier.' },
            { step: '02', title: 'Receive Goods', desc: 'When the truck arrives, verify quantities and record a goods receipt slip.' },
            { step: '03', title: 'Stock & Payment', desc: 'Inventory balances update automatically and payment is logged against the PO.' },
        ],
        uiPreviewTitle: 'Purchase Order Reconciliation',
        uiPreviewSubtitle: 'PO #1042 · Prime Meats Wholesale',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>PO #1042: PRIME MEATS</span>
                    <span className="text-emerald-700">STATUS: RECEIVED</span>
                </div>
                <div className="rounded bg-white p-2.5 border border-stone-200 text-stone-600">
                    <div>10x Ground Wagyu Blend (Case of 5kg) @ $75.00</div>
                    <div className="font-bold text-stone-900 pt-1">Total PO: $750.00 (Stock Deductions Linked)</div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Three-Way Match Verification', desc: 'Reconcile what you ordered, what the supplier delivered, and what they invoiced.' },
            { title: 'Supplier Ledger Accounts', desc: 'Track outstanding balances owed to food distributors and log payments.' },
            { title: 'Instant Stock Updates', desc: 'Goods receipts automatically increase your ingredient stock quantities.' },
            { title: 'Supplier Contact Management', desc: 'Centralize vendor phone numbers, sales reps, payment terms, and delivery days.' },
        ],
        relatedSlugs: [
            { slug: 'inventory-management', title: 'Inventory Management' },
            { slug: 'expense-management', title: 'Expense Management' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
        ],
        faqs: [
            { q: 'Can we receive partial deliveries?', a: 'Yes. Touch Dine supports partial receipts, keeping the remainder of the PO open until delivered.' },
            { q: 'Does receiving goods update our cost prices?', a: 'Yes. The recorded purchase price updates the ingredient’s unit cost.' },
            { q: 'Can we log payments made directly to suppliers?', a: 'Yes. Supplier payments reduce the outstanding balance and can be recorded from cash or bank accounts.' },
        ],
    },

    'expense-management': {
        title: 'Expense & Waste Management',
        badge: 'COST CONTROL',
        heroHeadline: 'Track Every Outflow: Food Wastage and Petty Cash',
        heroSubheadline:
            'Gain control over non-menu expenses and food loss. Log burnt or spoiled prep items, manage petty cash drawers, and review categorized expense accounts.',
        problemTitle: 'Unrecorded Food Waste and Unmonitored Cash Outflows',
        problemDescription:
            'Kitchen line cooks throw burnt food in the trash without noting it down. Cashiers pay delivery drivers out of the till without saving receipts. At month end, thousands are unaccounted for.',
        problemConsequences: [
            'Invisible food waste destroying theoretical food cost targets',
            'Petty cash drawers running dry with no receipts to account for spending',
            'Inability to analyze utilities, repairs, and supply costs across branches',
        ],
        workflowTitle: 'Expense & Waste Audit Workflow',
        workflowSteps: [
            { step: '01', title: 'Log Waste', desc: 'Record spoiled or dropped items with cause: Expired, Burnt, or Spillage.' },
            { step: '02', title: 'Manager Approval', desc: 'High-value waste entries require manager authorization before stock write-off.' },
            { step: '03', title: 'Categorized Expense', desc: 'File expenses under Rent, Utilities, Supplies, or Equipment with receipts.' },
        ],
        uiPreviewTitle: 'Waste & Expense Audit Log',
        uiPreviewSubtitle: 'Shift #104 Ledger',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold text-rose-700">Waste: 2kg Salmon</span>
                    <span>Reason: Expired prep date</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                    <span className="font-bold text-stone-800">Expense: $45.00</span>
                    <span>Category: Cleaning Supplies</span>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Waste Categorization Audit', desc: 'Identify whether waste is caused by over-prep, spoilage, or kitchen cooking errors.' },
            { title: 'Petty Cash Management', desc: 'Track cash drawer outflows with receipt image uploads and approval workflows.' },
            { title: 'Multi-Account Ledgers', desc: 'Track spending across Cash Drawer, Checking Account, and Petty Cash.' },
            { title: 'Manager Approval Thresholds', desc: 'Large write-offs trigger manager review to prevent unauthorized inventory dumping.' },
        ],
        relatedSlugs: [
            { slug: 'inventory-management', title: 'Inventory Management' },
            { slug: 'cash-management', title: 'Cash Shifts' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
        ],
        faqs: [
            { q: 'Does logging waste decrease our inventory stock?', a: 'Yes. Approved waste records immediately reduce the ingredient stock balance.' },
            { q: 'Can we attach photos of paper receipts to expenses?', a: 'Yes. You can upload receipt images directly to each expense record.' },
            { q: 'Can we define custom expense categories?', a: 'Yes. Create categories like Supplies, Repairs, Produce, Utilities, or Marketing.' },
        ],
    },

    'customer-management': {
        title: 'Customer Profiles & Loyalty',
        badge: 'GUEST RELATIONSHIPS',
        heroHeadline: 'Turn First-Time Diners into High-Frequency Regulars',
        heroSubheadline:
            'Maintain guest dining records, favorite orders, and contact details. Reward frequent diners with automatic loyalty points redeemable during checkout.',
        problemTitle: 'Treating Regular Diners Like Strangers',
        problemDescription:
            'Without customer records, staff don’t recognize frequent guests, miss opportunities to reward high spenders, and cannot resolve customer complaints with order context.',
        problemConsequences: [
            'Regular diners taking their business to competitors offering loyalty rewards',
            'No record of past orders when a guest calls in for phone delivery',
            'Missed opportunities to run targeted promotions during slow midweek nights',
        ],
        workflowTitle: 'Guest Loyalty Workflow',
        workflowSteps: [
            { step: '01', title: 'Attach to Ticket', desc: 'Quickly look up a guest by name or phone number during POS checkout.' },
            { step: '02', title: 'Accrue Points', desc: 'Points calculate automatically based on your configured spend-to-points ratio.' },
            { step: '03', title: 'Redeem at Checkout', desc: 'Guests redeem points for discounts directly on their receipt bill.' },
        ],
        uiPreviewTitle: 'Customer Profile & Loyalty Hub',
        uiPreviewSubtitle: 'Guest: Elena Rostova (VIP Member)',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-2">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>ELENA ROSTOVA · VIP DINER</span>
                    <span className="text-[#B53014]">340 POINTS</span>
                </div>
                <div className="rounded bg-white p-2.5 border border-stone-200 text-stone-600">
                    <div>Total Orders: 18 · Lifetime Spend: $840.00</div>
                    <div className="text-[11px] text-stone-500">Favorite: Pan-Seared Salmon + Nitro Espresso</div>
                </div>
            </div>
        ),
        benefits: [
            { title: 'Configurable Loyalty Accrual', desc: 'Set your exact loyalty rate (e.g. 1 point per $1 spent) and redemption value.' },
            { title: 'Complete Order History', desc: 'Look up past receipts and favorites to provide personalized hospitality.' },
            { title: 'Phone Delivery Address Book', desc: 'Save delivery addresses and special delivery instructions for quick reorders.' },
            { title: 'Manual Balance Adjustments', desc: 'Customer service managers can add promotional points to resolve guest complaints.' },
        ],
        relatedSlugs: [
            { slug: 'restaurant-pos', title: 'Point of Sale' },
            { slug: 'order-management', title: 'Order Management' },
            { slug: 'reports-analytics', title: 'Reports & Analytics' },
        ],
        faqs: [
            { q: 'Is a physical loyalty card required?', a: 'No. Diners are identified simply by their phone number or name at the register.' },
            { q: 'Can loyalty points be used across multiple branches?', a: 'Yes. Customer profiles and point balances are unified across all company branches.' },
            { q: 'Can staff see a customer’s lifetime spend?', a: 'Yes. The POS terminal shows visit count and total lifetime value upon lookup.' },
        ],
    },
};

export default function FeatureShow({ featureKey }: { featureKey: string }) {
    const feature = FEATURE_DATA[featureKey] || FEATURE_DATA['restaurant-pos'];
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    return (
        <MarketingLayout>
            <MarketingHead
                title={`${feature.title} — Touch Dine Restaurant OS`}
                description={feature.heroSubheadline}
            />

            {/* Feature Hero */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-[#B53014] mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#B53014]" />
                            <span>{feature.badge}</span>
                        </div>

                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-stone-900 sm:text-6xl leading-[1.1]">
                            {feature.heroHeadline}
                        </h1>

                        <p className="mt-6 text-base sm:text-xl text-stone-600 leading-relaxed">
                            {feature.heroSubheadline}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Button
                                href="/register"
                                variant="primary"
                                size="lg"
                                onClick={() => trackConversion('hero_cta_clicked', { feature: featureKey })}
                            >
                                Start 14-Day Free Trial
                            </Button>
                            <Button
                                href="/features"
                                variant="secondary"
                                size="lg"
                            >
                                All Features
                            </Button>
                        </div>
                    </div>

                    {/* UI Mockup Showcase */}
                    <div className="mt-14">
                        <ProductMockup
                            title={feature.uiPreviewTitle}
                            subtitle={feature.uiPreviewSubtitle}
                        >
                            {feature.uiPreviewContent}
                        </ProductMockup>
                    </div>
                </div>
            </section>

            {/* The Operational Problem Solved */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="text-xs font-mono font-bold uppercase tracking-widest text-rose-600">
                                THE OPERATIONAL PROBLEM
                            </div>
                            <h2 className="font-display text-3xl font-extrabold text-stone-900 sm:text-4xl">
                                {feature.problemTitle}
                            </h2>
                            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                {feature.problemDescription}
                            </p>
                        </div>

                        <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-8 space-y-4">
                            <h3 className="font-bold text-rose-950 text-sm uppercase tracking-wider font-mono">
                                Real Consequences on the Floor:
                            </h3>
                            <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                {feature.problemConsequences.map((c, i) => (
                                    <li key={i} className="flex items-start gap-2.5">
                                        <span className="text-rose-600 font-bold mt-0.5">✕</span>
                                        <span>{c}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Step-by-Step Workflow */}
            <section className="border-t border-stone-200/80 bg-[#FBFBF9] py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="HOW IT WORKS"
                        title={feature.workflowTitle}
                        description="Engineered for kitchen line cooks, floor staff, and managers to adopt immediately without days of training."
                    />

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {feature.workflowSteps.map((step, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-xs"
                            >
                                <div className="text-xs font-mono font-bold text-[#B53014]">
                                    STEP {step.step}
                                </div>
                                <h3 className="font-display text-xl font-bold text-stone-900">
                                    {step.title}
                                </h3>
                                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                    {step.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Core Benefits Matrix */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="KEY CAPABILITIES"
                        title={`Why Restaurants Rely on ${feature.title}`}
                        description="Built with precision, reliability, and security at every level."
                    />

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {feature.benefits.map((b, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-stone-200/80 bg-stone-50/60 p-7 space-y-2 hover:border-stone-300 transition-all"
                            >
                                <h3 className="font-display text-lg font-bold text-stone-900 flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full bg-[#B53014]" />
                                    <span>{b.title}</span>
                                </h3>
                                <p className="text-xs sm:text-sm text-stone-600 leading-relaxed pl-4">
                                    {b.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Related Modules */}
            <section className="border-t border-stone-200/80 bg-[#FBFBF9] py-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-stone-200">
                        <div>
                            <h3 className="font-display text-xl font-bold text-stone-900">
                                Integrated Platform Modules
                            </h3>
                            <p className="text-xs text-stone-500 mt-1">
                                {feature.title} operates seamlessly alongside other Touch Dine modules.
                            </p>
                        </div>
                        <Link href="/features" className="text-xs font-semibold text-[#B53014] hover:underline">
                            View all 13 modules →
                        </Link>
                    </div>

                    <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                        {feature.relatedSlugs.map((r) => (
                            <Link
                                key={r.slug}
                                href={`/features/${r.slug}`}
                                className="group block rounded-xl border border-stone-200 bg-white p-5 hover:border-[#B53014] transition-all"
                            >
                                <div className="font-display font-bold text-stone-900 text-sm group-hover:text-[#B53014]">
                                    {r.title}
                                </div>
                                <div className="mt-1 text-xs text-stone-500 flex items-center gap-1 group-hover:text-[#B53014]">
                                    <span>Explore module</span>
                                    <span>→</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Feature FAQs */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="FAQS"
                        title="Common Questions"
                        description="Everything you need to know about setting up and operating this module."
                    />

                    <div className="mt-12 space-y-4">
                        {feature.faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-stone-200 bg-stone-50/70 overflow-hidden"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                    className="flex w-full items-center justify-between p-5 text-left font-display font-bold text-stone-900 text-sm sm:text-base hover:text-[#B53014]"
                                >
                                    <span>{faq.q}</span>
                                    <span className="ml-4 font-mono text-stone-400">
                                        {openFaq === idx ? '−' : '+'}
                                    </span>
                                </button>
                                {openFaq === idx && (
                                    <div className="px-5 pb-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200/60 pt-4">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contextual Bottom CTA */}
            <section className="bg-stone-900 py-20 text-white text-center">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold">
                        Ready to Experience {feature.title}?
                    </h2>
                    <p className="text-stone-300 text-xs sm:text-base max-w-xl mx-auto">
                        Start your 14-day free trial today. Full feature access, no credit card required, setup in 5 minutes.
                    </p>
                    <div className="pt-2">
                        <Button href="/register" variant="accent" size="lg">
                            Start 14-Day Free Trial
                        </Button>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
