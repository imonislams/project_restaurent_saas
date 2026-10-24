import {
    Button,
    MarketingHead,
    MarketingLayout,
    SectionHeading,
    trackConversion,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

interface FeatureCard {
    slug: string;
    title: string;
    category: 'front' | 'back' | 'ops';
    badge: string;
    description: string;
    highlights: string[];
}

const ALL_FEATURES: FeatureCard[] = [
    // Front of House
    {
        slug: 'restaurant-pos',
        title: 'Point of Sale Terminal',
        category: 'front',
        badge: 'FRONT OF HOUSE',
        description: 'Fast, responsive touch terminal built for peak-rush counter, table, and takeaway checkout.',
        highlights: ['Split checks by seat or tender', 'Dine-in, takeaway, delivery modes', 'Thermal ESC/POS printing'],
    },
    {
        slug: 'kitchen-display',
        title: 'Kitchen Display System (KDS)',
        category: 'front',
        badge: 'FRONT OF HOUSE',
        description: 'Digital bump screens replacing lost paper slips with real-time station routing and ticket timers.',
        highlights: ['Color-coded ticket elapsed timers', 'Station filtering (Grill, Salad, Bar)', 'Urgent priority ticket bump'],
    },
    {
        slug: 'table-management',
        title: 'Table & Floor Management',
        category: 'front',
        badge: 'FRONT OF HOUSE',
        description: 'Visual floor plan editor reflecting real dining areas, live occupancy, and easy order transfers.',
        highlights: ['Multi-area floor layouts', 'Occupied, Available & Cleaning states', 'One-click table order transfers'],
    },
    {
        slug: 'order-management',
        title: 'Unified Order Management',
        category: 'front',
        badge: 'FRONT OF HOUSE',
        description: 'Centralized order tracking across counter sales, table orders, and outbound phone deliveries.',
        highlights: ['Fulfillment status tracking', 'Audited void & discount logs', 'Order sequence generation'],
    },

    // Back of House & Inventory
    {
        slug: 'menu-management',
        title: 'Menu & Recipe Engineering',
        category: 'back',
        badge: 'KITCHEN & MENU',
        description: 'Manage rich categories, modifiers, pricing tiers, and one-tap 86’d dish availability toggles.',
        highlights: ['Multiple variant pricing', 'Recipe ingredient cost mapping', 'Instant out-of-stock 86’ing'],
    },
    {
        slug: 'inventory-management',
        title: 'Real-Time Inventory & Stock',
        category: 'back',
        badge: 'KITCHEN & MENU',
        description: 'Automatic ingredient deduction upon POS settlement. Low-stock threshold alerts before stockouts.',
        highlights: ['Gram-level recipe deductions', 'Low-stock automated alerts', 'Opening stock & count movements'],
    },
    {
        slug: 'purchasing-suppliers',
        title: 'Purchasing & Supplier POs',
        category: 'back',
        badge: 'KITCHEN & MENU',
        description: 'Generate purchase orders, record goods receipts, and reconcile supplier invoices against payments.',
        highlights: ['Supplier catalog management', 'Purchase order approval flows', 'Goods receipt inventory update'],
    },
    {
        slug: 'expense-management',
        title: 'Expense & Waste Tracking',
        category: 'back',
        badge: 'KITCHEN & MENU',
        description: 'Log food spoilage reasons and record categorized operational expenses with receipt attachments.',
        highlights: ['Spoilage & drop waste logs', 'Petty cash expense records', 'Manager expense approval rules'],
    },

    // Operations & Finance
    {
        slug: 'cash-management',
        title: 'Cash Registers & Shifts',
        category: 'ops',
        badge: 'FINANCE & CONTROL',
        description: 'Blind cash shift reconciliation. Opening floats, cash drops, and manager PIN approvals.',
        highlights: ['Blind count drawer balance', 'Audited pay-in and pay-outs', 'Manager PIN required for voids'],
    },
    {
        slug: 'reports-analytics',
        title: 'Reports & COGS Analytics',
        category: 'ops',
        badge: 'FINANCE & CONTROL',
        description: 'Understand gross/net sales, top menu items, hourly peak rushes, and food cost margins.',
        highlights: ['Gross profit vs COGS margin', 'Hourly sales velocity heatmaps', 'Product mix & payment splits'],
    },
    {
        slug: 'staff-management',
        title: 'Staff Roles & Security PINs',
        category: 'ops',
        badge: 'FINANCE & CONTROL',
        description: 'Role-based access permissions for owners, managers, cashiers, cooks, and floor waiters.',
        highlights: ['Granular role permissions', 'Manager 4-digit security PIN', 'Session revocation & invite links'],
    },
    {
        slug: 'multi-branch-management',
        title: 'Multi-Branch Operations',
        category: 'ops',
        badge: 'FINANCE & CONTROL',
        description: 'Manage multiple locations under a single company account. Central catalog and inter-branch transfers.',
        highlights: ['Centralized catalog master', 'Inter-branch stock transfers', 'Consolidated chain reporting'],
    },
    {
        slug: 'customer-management',
        title: 'Customer Profiles & Loyalty',
        category: 'ops',
        badge: 'FINANCE & CONTROL',
        description: 'Maintain guest dining histories, contact details, and reward repeat visits with loyalty points.',
        highlights: ['Guest order & spend history', 'Points per currency unit rules', 'Redeemable rewards at checkout'],
    },
];

export default function FeaturesIndex() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="All 13 Restaurant Modules — Features Directory"
                description="Explore all 13 core modules of Touch Dine: POS terminal, kitchen display (KDS), table management, recipe costing, inventory, multi-branch control, and reports."
            />

            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="COMPLETE SYSTEM DIRECTORY"
                        title="13 Modules. One Connected Platform."
                        description="Every feature in Touch Dine is designed to solve a specific operational bottleneck. Click into any module to explore its capabilities, workflows, and specifications."
                    />

                    {/* Features Grid */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ALL_FEATURES.map((feature) => (
                            <Link
                                key={feature.slug}
                                href={`/features/${feature.slug}`}
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-primary hover:shadow-lg transition-all"
                                onClick={() => trackConversion('feature_viewed', { feature: feature.slug })}
                            >
                                <div>
                                    <div className="flex items-center justify-between pb-3">
                                        <span className="text-[11px] font-mono font-bold tracking-wider text-secondary">
                                            {feature.badge}
                                        </span>
                                    </div>

                                    <h3 className="font-display text-xl font-bold text-stone-900 group-hover:text-primary leading-snug">
                                        {feature.title}
                                    </h3>

                                    <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                        {feature.description}
                                    </p>

                                    <div className="mt-5 pt-4 border-t border-stone-100 space-y-1.5 text-xs text-stone-600">
                                        {feature.highlights.map((h, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                                <span>{h}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-primary group-hover:text-primary-container">
                                    <span>Explore {feature.title}</span>
                                    <span>→</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* CTA Banner */}
                    <div className="mt-20 rounded-3xl bg-[#1a1c1a] p-8 sm:p-12 text-white text-center">
                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold">
                            Test Every Module With a 14-Day Free Trial
                        </h2>
                        <p className="mt-3 text-stone-300 text-xs sm:text-sm max-w-lg mx-auto">
                            No credit card required. Instant workspace provisioning. Test with your real menu and team.
                        </p>
                        <div className="mt-6">
                            <Button href="/register" variant="accent" size="lg">
                                Start 14-Day Free Trial
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
