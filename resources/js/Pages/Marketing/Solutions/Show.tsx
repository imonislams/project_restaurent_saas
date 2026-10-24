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

interface SolutionDetail {
    title: string;
    badge: string;
    heroHeadline: string;
    heroSubheadline: string;
    operationalPains: { pain: string; solution: string }[];
    workflowTitle: string;
    workflowSteps: { step: string; title: string; desc: string }[];
    coreModules: { title: string; desc: string; slug: string }[];
    uiPreviewTitle: string;
    uiPreviewSubtitle: string;
    uiPreviewContent: React.ReactNode;
    faqs: { q: string; a: string }[];
}

const SOLUTION_DATA: Record<string, SolutionDetail> = {
    restaurants: {
        title: 'Full-Service & Casual Restaurants',
        badge: 'TABLE SERVICE HOSPITALITY',
        heroHeadline: 'Paced Table Service, Flawless Course Timing & Split Bills',
        heroSubheadline:
            'Deliver memorable hospitality without table chaos. Connect hostesses, floor servers, and kitchen line cooks on one platform built for multi-course dining.',
        operationalPains: [
            { pain: 'Tables sitting dirty and empty while walk-in diners wait', solution: 'Visual floorplan with instant Available, Occupied, and Cleaning indicators.' },
            { pain: 'Confusion over course timing (starters arriving with mains)', solution: 'Course pacing tags on POS tickets with automated kitchen fire cues.' },
            { pain: 'Nightmare split checks delaying large dinner parties at checkout', solution: 'Split by seat, headcount, or arbitrary tender with two taps.' },
        ],
        workflowTitle: 'The Full-Service Table Workflow',
        workflowSteps: [
            { step: '01', title: 'Seat & Open Tab', desc: 'Hostess seats guests on Table 14 with cover count; waiter opens tab from terminal.' },
            { step: '02', title: 'Course Pacing', desc: 'Appetizers and wine route to stations; server fires entrees when starters clear.' },
            { step: '03', title: 'Effortless Settle', desc: 'Split check among 4 guests using separate cards, cash, and tips.' },
        ],
        coreModules: [
            { title: 'Table & Floor Management', desc: 'Visual room layouts and table transfers', slug: 'table-management' },
            { title: 'Kitchen Display (KDS)', desc: 'Real-time kitchen Kanban and course pacing', slug: 'kitchen-display' },
            { title: 'POS Terminal', desc: 'Split checks and multi-tender settlement', slug: 'restaurant-pos' },
        ],
        uiPreviewTitle: 'Full-Service Table Operations',
        uiPreviewSubtitle: 'Main Dining Room · Service Peak',
        uiPreviewContent: (
            <div className="p-6 bg-stone-100 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>TABLE 12 · 4 COVERS · SERVER: MARCUS</span>
                    <span className="text-emerald-700 font-bold">COURSE 2: MAINS</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-stone-700 font-sans space-y-1">
                    <div className="font-bold">2x Ribeye Steak (Medium Rare) · Fired 6m ago</div>
                    <div className="font-bold">2x Pan-Seared Salmon · Fired 6m ago</div>
                    <div className="text-stone-400 text-xs">Starters cleared · Table status: Occupied</div>
                </div>
            </div>
        ),
        faqs: [
            { q: 'Can waiters transfer bar tabs to dining tables?', a: 'Yes. With one tap, bar tabs move to dining tables with all drinks and items intact.' },
            { q: 'Can we track average spend per cover?', a: 'Yes. Touch Dine calculates revenue per cover across meal periods and servers.' },
            { q: 'Does it support tipping and service charges?', a: 'Yes. Configure automatic service charge percentages or optional gratuity lines on receipts.' },
        ],
    },

    cafes: {
        title: 'Cafés, Coffee Bars & Bakeries',
        badge: 'HIGH-VELOCITY COUNTER',
        heroHeadline: 'Speed Through Morning Rushes and Reward Regulars',
        heroSubheadline:
            'A lightweight, high-velocity counter interface. Select complex espresso modifiers with one tap, track coffee bean inventory, and accrue guest loyalty points automatically.',
        operationalPains: [
            { pain: 'Morning queues backing out the door during peak 8:00 AM rush', solution: 'Speed-optimized touch categories and fast cash/card tender buttons.' },
            { pain: 'Baristas mishearing milk choices (oat, almond, soy)', solution: 'Mandatory milk/syrup modifier popups that are impossible to bypass.' },
            { pain: 'Fresh pastries running out without knowing daily shrinkage', solution: 'Batch pastry tracking and audited end-of-day shrinkage write-offs.' },
        ],
        workflowTitle: 'The 15-Second Coffee Checkout',
        workflowSteps: [
            { step: '01', title: 'Tap Coffee', desc: 'Select Latte; popup immediately prompts Oat Milk + Extra Shot.' },
            { step: '02', title: 'Lookup Guest', desc: 'Guest enters phone number; loyalty points apply toward discount.' },
            { step: '03', title: 'Tap & Go', desc: 'Tap card terminal; barista display receives ticket instantly.' },
        ],
        coreModules: [
            { title: 'Point of Sale (POS)', desc: 'Lightning-fast modifier popups & fast tender', slug: 'restaurant-pos' },
            { title: 'Customer & Loyalty', desc: 'Phone lookup loyalty point accrual', slug: 'customer-management' },
            { title: 'Menu Engineering', desc: '86 availability and modifier upcharges', slug: 'menu-management' },
        ],
        uiPreviewTitle: 'Coffee Bar Counter Terminal',
        uiPreviewSubtitle: 'Morning Peak Shift #01',
        uiPreviewContent: (
            <div className="p-6 bg-stone-100 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>COUNTER ORDER #0214</span>
                    <span className="text-emerald-700 font-bold">LOYALTY: +6 PTS</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-stone-700 font-sans space-y-1">
                    <div className="font-bold">1x Flat White ($4.50)</div>
                    <div className="text-[11px] text-stone-500 pl-2">↳ Oat Milk (+$0.75), Extra Shot (+$1.00)</div>
                    <div className="font-bold pt-1">1x Almond Croissant ($4.50)</div>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1">
                    <span>TOTAL DUE</span>
                    <span className="text-base text-stone-900">$10.75</span>
                </div>
            </div>
        ),
        faqs: [
            { q: 'Do we need table management features?', a: 'No. Cafes can disable table management entirely to keep the screen purely focused on counter velocity.' },
            { q: 'Can we track coffee bean consumption?', a: 'Yes. Associate 18g of espresso beans per shot in the recipe BOM for live bag deductions.' },
            { q: 'Does it support contactless tap-to-pay?', a: 'Yes. Touch Dine works with standard integrated or external card terminals.' },
        ],
    },

    'cloud-kitchens': {
        title: 'Cloud & Ghost Kitchens',
        badge: 'DELIVERY DISPATCH ENGINE',
        heroHeadline: 'Operate Multi-Brand Virtual Menus from One Kitchen',
        heroSubheadline:
            'Zero table clutter. Run 3 or more virtual delivery brands from a single kitchen line, route prep tickets by cook station, and eliminate driver pickup confusion.',
        operationalPains: [
            { pain: 'Juggling multiple tablets and order chits from different brands', solution: 'Consolidate all brand menus into one unified KDS dispatch queue.' },
            { pain: 'Delivery drivers waiting inside prep areas causing crowding', solution: 'Clear order ready status screens and driver pickup tags.' },
            { pain: 'Cooks confusing packaging between virtual brand concepts', solution: 'Brand-coded ticket headers and custom packaging checklists.' },
        ],
        workflowTitle: 'The Ghost Kitchen Dispatch Workflow',
        workflowSteps: [
            { step: '01', title: 'Multi-Brand Ingestion', desc: 'Orders arrive tagged with Brand A (Burgers) or Brand B (Wings).' },
            { step: '02', title: 'Station Prep', desc: 'Fry items route to fryer station; burger builds route to grill station.' },
            { step: '03', title: 'Pack & Hand-off', desc: 'Expo packs branded bag, marks Ready, and hands off to delivery courier.' },
        ],
        coreModules: [
            { title: 'Kitchen Display (KDS)', desc: 'Multi-brand station Kanban and timer alerts', slug: 'kitchen-display' },
            { title: 'Inventory Management', desc: 'Shared ingredient inventory across multiple brands', slug: 'inventory-management' },
            { title: 'Order Management', desc: 'Delivery fulfillment status and driver dispatch', slug: 'order-management' },
        ],
        uiPreviewTitle: 'Ghost Kitchen Central KDS',
        uiPreviewSubtitle: 'Line 01 · Multi-Brand Hub',
        uiPreviewContent: (
            <div className="p-6 bg-stone-900 text-white text-xs font-mono space-y-3">
                <div className="flex justify-between items-center text-stone-400">
                    <span className="rounded bg-rose-900/80 text-rose-200 px-2 py-0.5 font-bold">BRAND: SMASH BURGER CO.</span>
                    <span className="text-amber-400 font-bold">PICKUP: 4m</span>
                </div>
                <div className="bg-stone-800 p-3 rounded-xl border border-stone-700 text-stone-200 font-sans">
                    <div className="font-bold">2x Double Smash Burger + Truffle Fries</div>
                    <div className="text-xs text-stone-400 mt-1">Packaging: Kraft Box #2 + Seal Sticker</div>
                </div>
            </div>
        ),
        faqs: [
            { q: 'Can different brands share common ingredients?', a: 'Yes. Shared ingredients like cooking oil, buns, and chicken breast draw from one shared inventory pool.' },
            { q: 'Can we disable table seating completely?', a: 'Yes. Cloud kitchens run in pure delivery/pickup mode with zero table features.' },
            { q: 'Can we track prep time per delivery order?', a: 'Yes. KDS measures elapsed minutes from order creation to courier handoff.' },
        ],
    },

    'quick-service-restaurants': {
        title: 'Quick Service Restaurants (QSR)',
        badge: 'HIGH-THROUGHPUT ORDERING',
        heroHeadline: 'Line-Busting Speed and Rapid Shift Handovers',
        heroSubheadline:
            'Engineered for maximum transactions per hour. Streamline combo meal ordering, maintain strict blind till closes, and keep counter staff ringing at top speed.',
        operationalPains: [
            { pain: 'Slow terminal taps creating long lines during lunch peak', solution: 'High-contrast grid layout with instant one-tap combo item selection.' },
            { pain: 'Till shortages during frequent shift handovers between cashiers', solution: 'Blind count drawer closes requiring cashiers to count cash without peeking.' },
            { pain: 'Line cooks falling behind on counter ticket pacing', solution: 'Real-time kitchen bump screens with visual elapsed time alerts.' },
        ],
        workflowTitle: 'The QSR Speed Cycle',
        workflowSteps: [
            { step: '01', title: 'Combo Entry', desc: 'Cashier selects Combo #1; drink and side modifier prompts appear instantly.' },
            { step: '02', title: 'Instant Chit', desc: 'Chit prints at the kitchen prep station the millisecond order is confirmed.' },
            { step: '03', title: 'Shift Balanced', desc: 'Handoff register at shift change with audited blind cash declarations.' },
        ],
        coreModules: [
            { title: 'Point of Sale (POS)', desc: 'High-speed touch grid for combo meal items', slug: 'restaurant-pos' },
            { title: 'Cash Shift Control', desc: 'Blind count drawer balance & manager PINs', slug: 'cash-management' },
            { title: 'Kitchen Display (KDS)', desc: 'Real-time kitchen bump bar displays', slug: 'kitchen-display' },
        ],
        uiPreviewTitle: 'QSR High-Speed Register',
        uiPreviewSubtitle: 'Lane 01 · Lunch Rush Hour',
        uiPreviewContent: (
            <div className="p-6 bg-stone-100 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>LANE 01 · TICKET #0592</span>
                    <span className="text-emerald-700 font-bold">PAID (CARD)</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-stone-700 font-sans space-y-1">
                    <div className="font-bold">1x Crispy Chicken Combo ($12.50)</div>
                    <div className="text-xs text-stone-500 pl-2">↳ Side: Waffle Fries · Drink: Coke Zero</div>
                </div>
            </div>
        ),
        faqs: [
            { q: 'Can we configure combo meals with automatic side and drink prompts?', a: 'Yes. Touch Dine’s modifier engine allows multi-step required selections.' },
            { q: 'How fast can a cashier complete a cash transaction?', a: 'With quick-tender cash buttons ($10, $20, $50, exact), a cash sale takes under 5 seconds.' },
            { q: 'Can managers approve voids without walking to the terminal?', a: 'Managers enter their 4-digit PIN directly on the screen to authorize the void.' },
        ],
    },

    'takeaway-delivery': {
        title: 'Takeaway & Delivery Outlets',
        badge: 'DELIVERY LOGISTICS',
        heroHeadline: 'Direct Delivery Zones, Driver Dispatch & Pickup Tracking',
        heroSubheadline:
            'Take control of your takeout and delivery operations. Set regional delivery fees, save guest delivery addresses, and coordinate driver dispatch chits without losing 30% to third-party marketplaces.',
        operationalPains: [
            { pain: 'Paying 30% marketplace commissions on your direct customer base', solution: 'Own your direct phone and online orders with custom delivery fee rules.' },
            { pain: 'Drivers delivering to the wrong address due to scribbled notes', solution: 'Saved customer address books with specific delivery instructions.' },
            { pain: 'Confusion over which orders are out for delivery vs waiting for pickup', solution: 'Fulfillment states: New, Preparing, Out with Driver, Delivered.' },
        ],
        workflowTitle: 'The Delivery Logistics Pipeline',
        workflowSteps: [
            { step: '01', title: 'Customer Lookup', desc: 'Enter phone number; customer address and order history populate automatically.' },
            { step: '02', title: 'Zone Fee Calculation', desc: 'System automatically applies correct delivery fee based on delivery zone.' },
            { step: '03', title: 'Dispatch Slip', desc: 'Driver chit prints with address, phone number, gate code, and cash balance due.' },
        ],
        coreModules: [
            { title: 'Order Management', desc: 'Delivery zone fees and driver tracking', slug: 'order-management' },
            { title: 'Customer Management', desc: 'Saved phone numbers and address book', slug: 'customer-management' },
            { title: 'POS Terminal', desc: 'Cash-on-delivery and card-on-delivery tender', slug: 'restaurant-pos' },
        ],
        uiPreviewTitle: 'Delivery Dispatch Hub',
        uiPreviewSubtitle: 'Outbound Driver Queue',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>DELIVERY #0142 · ZONE: NORTH (5km)</span>
                    <span className="text-primary font-bold">OUT WITH DRIVER</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-stone-200 text-stone-700 font-sans space-y-1">
                    <div className="font-bold">Customer: Sarah Jenkins (555-0192)</div>
                    <div className="text-xs text-stone-500">Address: 742 Evergreen Terrace (Gate Code #4102)</div>
                    <div className="text-xs font-bold text-stone-900 pt-1">Cash on Delivery Due: $34.50 (incl. $4.00 zone fee)</div>
                </div>
            </div>
        ),
        faqs: [
            { q: 'Can we define different delivery fees for different areas?', a: 'Yes. Touch Dine includes a Delivery Zones module where you set minimum orders and fees by zone.' },
            { q: 'Does it support cash on delivery (COD)?', a: 'Yes. Orders can be dispatched as unpaid COD and settled when the driver returns with cash.' },
            { q: 'Can we schedule orders for pickup later in the day?', a: 'Yes. You can record scheduled pickup times on each order.' },
        ],
    },

    'multi-location-restaurants': {
        title: 'Multi-Location Groups & Chains',
        badge: 'MULTI-BRANCH SCALE',
        heroHeadline: 'Central Master Catalog with Inter-Branch Transfers',
        heroSubheadline:
            'Scale across locations without data fragmentation. Maintain a corporate master catalog, adjust prices by branch, transfer stock between kitchens, and view consolidated chain reports.',
        operationalPains: [
            { pain: 'Manually updating dish descriptions and prices across 4 different systems', solution: 'Central master catalog: update once, propagate to all branches instantly.' },
            { pain: 'Surplus food spoiling at one location while another faces a stockout', solution: 'Inter-branch stock transfer workflow with dispatch and receipt verification.' },
            { pain: 'Spending hours consolidating weekend sales numbers by hand', solution: 'Consolidated corporate dashboard comparing revenue and food costs across branches.' },
        ],
        workflowTitle: 'The Multi-Branch Command Workflow',
        workflowSteps: [
            { step: '01', title: 'Corporate Catalog', desc: 'Define master recipes and pricing tiers at the company account level.' },
            { step: '02', title: 'Branch Overrides', desc: 'Allow specific branches to set localized menu prices or toggle item availability.' },
            { step: '03', title: 'Stock Transfers', desc: 'Dispatch bulk inventory from central commissary to individual store kitchens.' },
        ],
        coreModules: [
            { title: 'Multi-Branch Management', desc: 'Central catalog & inter-branch transfers', slug: 'multi-branch-management' },
            { title: 'Inventory Management', desc: 'Commissary and store stock tracking', slug: 'inventory-management' },
            { title: 'Reports & Analytics', desc: 'Consolidated chain revenue and margin reports', slug: 'reports-analytics' },
        ],
        uiPreviewTitle: 'Corporate Chain Overview',
        uiPreviewSubtitle: 'Touch Dine Hospitality Group (3 Branches)',
        uiPreviewContent: (
            <div className="p-6 bg-stone-50 text-xs font-mono space-y-3">
                <div className="flex justify-between font-bold text-stone-800">
                    <span>CONSOLIDATED CHAIN SALES (TODAY)</span>
                    <span className="text-emerald-700 font-bold">$8,450.00</span>
                </div>
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span>Downtown Flagship:</span>
                        <span className="font-bold">$4,850.00 (COGS: 28%)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span>Westside Bistro:</span>
                        <span className="font-bold">$2,400.00 (COGS: 29%)</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-white border border-stone-200">
                        <span>Uptown Express:</span>
                        <span className="font-bold">$1,200.00 (COGS: 26%)</span>
                    </div>
                </div>
            </div>
        ),
        faqs: [
            { q: 'How many locations can we run on Touch Dine?', a: 'The Growth plan supports up to 3 branches, and the Business plan supports unlimited locations.' },
            { q: 'Can store managers be restricted to only their branch?', a: 'Yes. Touch Dine enforces strict branch-level scoping for store managers, cashiers, and cooks.' },
            { q: 'How do inter-branch stock transfers work?', a: 'Branch A dispatches the stock; Branch B confirms receipt with count verification before stock shifts.' },
        ],
    },
};

export default function SolutionShow({ solutionKey }: { solutionKey: string }) {
    const solution = SOLUTION_DATA[solutionKey] || SOLUTION_DATA['restaurants'];
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    return (
        <MarketingLayout>
            <MarketingHead
                title={`${solution.title} — Touch Dine Restaurant OS`}
                description={solution.heroSubheadline}
            />

            {/* Solution Hero */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-[#EC3013] mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-[#EC3013]" />
                            <span>{solution.badge}</span>
                        </div>

                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-stone-900 sm:text-6xl leading-[1.1]">
                            {solution.heroHeadline}
                        </h1>

                        <p className="mt-6 text-base sm:text-xl text-stone-600 leading-relaxed">
                            {solution.heroSubheadline}
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Button
                                href="/register"
                                variant="primary"
                                size="lg"
                                onClick={() => trackConversion('hero_cta_clicked', { solution: solutionKey })}
                            >
                                Start 14-Day Free Trial
                            </Button>
                            <Button
                                href="/solutions"
                                variant="secondary"
                                size="lg"
                            >
                                All Solutions
                            </Button>
                        </div>
                    </div>

                    {/* UI Mockup Showcase */}
                    <div className="mt-14">
                        <ProductMockup
                            title={solution.uiPreviewTitle}
                            subtitle={solution.uiPreviewSubtitle}
                        >
                            {solution.uiPreviewContent}
                        </ProductMockup>
                    </div>
                </div>
            </section>

            {/* Operational Pains Solved */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="PAIN POINTS ELIMINATED"
                        title="Designed Around Your Specific Challenges"
                        description="Here is how Touch Dine tackles the unique operational headaches of your venue type."
                    />

                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {solution.operationalPains.map((item, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-stone-200/90 bg-[#FBFBF9] p-8 space-y-4"
                            >
                                <div className="text-xs font-mono font-bold text-rose-600 uppercase">
                                    THE BOTTLENECK
                                </div>
                                <h3 className="font-display text-lg font-bold text-stone-900">
                                    {item.pain}
                                </h3>
                                <div className="pt-4 border-t border-stone-200/80">
                                    <div className="text-xs font-mono font-bold text-[#EC3013] uppercase">
                                        HOW RESTRY SOLVES IT
                                    </div>
                                    <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                         {item.solution}
                                     </p>
                                 </div>
                             </div>
                         ))}
                     </div>
                 </div>
             </section>

             {/* Workflow Steps */}
             <section className="border-t border-stone-200/80 bg-[#FBFBF9] py-20 sm:py-28">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                     <SectionHeading
                         badge="HOW IT WORKS"
                         title={solution.workflowTitle}
                         description="Intuitive steps that floor staff and line cooks adopt effortlessly."
                     />

                     <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                         {solution.workflowSteps.map((step, idx) => (
                             <div
                                 key={idx}
                                 className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-xs"
                             >
                                 <div className="text-xs font-mono font-bold text-[#EC3013]">
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

             {/* Relevant Modules */}
             <section className="border-t border-stone-200/80 bg-white py-16">
                 <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                     <div className="flex flex-wrap items-center justify-between gap-4 pb-8 border-b border-stone-200">
                         <div>
                             <h3 className="font-display text-xl font-bold text-stone-900">
                                 Key Modules for {solution.title}
                             </h3>
                             <p className="text-xs text-stone-500 mt-1">
                                 Touch Dine activates the modules you need and hides what you don’t.
                             </p>
                         </div>
                     </div>

                     <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                         {solution.coreModules.map((m) => (
                             <Link
                                 key={m.slug}
                                 href={`/features/${m.slug}`}
                                 className="group block rounded-xl border border-stone-200 bg-stone-50 p-6 hover:border-[#EC3013] transition-all"
                             >
                                 <div className="font-display font-bold text-stone-900 text-base group-hover:text-[#EC3013]">
                                     {m.title}
                                 </div>
                                 <p className="mt-2 text-xs text-stone-600 leading-relaxed">
                                     {m.desc}
                                 </p>
                                 <div className="mt-4 text-xs font-semibold text-[#EC3013] group-hover:underline flex items-center gap-1">
                                     <span>Learn more</span>
                                     <span>→</span>
                                 </div>
                             </Link>
                         ))}
                     </div>
                 </div>
             </section>

             {/* Solution FAQs */}
             <section className="border-t border-stone-200/80 bg-[#FBFBF9] py-20 sm:py-28">
                 <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
                     <SectionHeading
                         badge="FAQS"
                         title="Frequently Asked Questions"
                         description={`Answers specific to operating ${solution.title.toLowerCase()} on Touch Dine.`}
                     />

                     <div className="mt-12 space-y-4">
                         {solution.faqs.map((faq, idx) => (
                             <div
                                 key={idx}
                                 className="rounded-2xl border border-stone-200 bg-white overflow-hidden"
                             >
                                 <button
                                     type="button"
                                     onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                     className="flex w-full items-center justify-between p-5 text-left font-display font-bold text-stone-900 text-sm sm:text-base hover:text-[#EC3013]"
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
                        Ready to Transform Your {solution.title}?
                    </h2>
                    <p className="text-stone-300 text-xs sm:text-base max-w-xl mx-auto">
                        Start your 14-day free trial today. No hardware lock-in, no credit card required.
                    </p>
                    <div className="pt-2">
                        <Button href="/register" variant="accent" size="lg">
                            Start Free Trial
                        </Button>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
