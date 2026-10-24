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

export default function Product() {
    const [activeEngine, setActiveEngine] = useState<'service' | 'kitchen' | 'cost' | 'finance'>('service');

    return (
        <MarketingLayout>
            <MarketingHead
                title="Product Architecture — Unified Restaurant Operating System"
                description="Explore the connected architecture of Touch Dine. Point of sale, kitchen display, table floorplans, recipe food costing, and multi-branch management in unified sync."
            />

            {/* Product Hero */}
            <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>PLATFORM BLUEPRINT</span>
                        </div>

                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl leading-[1.1]">
                            One Operating System.
                            <br />
                            <span className="text-primary">Every Station Connected.</span>
                        </h1>

                        <p className="mt-6 text-base sm:text-xl text-stone-600 leading-relaxed">
                            Most restaurant software forces you to string together separate apps for POS, kitchen slips, inventory spreadsheets, and shift reconciliations. Touch Dine unifies every workflow into a single, responsive platform.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <Button
                                href="/register"
                                variant="primary"
                                size="lg"
                                onClick={() => trackConversion('hero_cta_clicked', { location: 'product_page' })}
                            >
                                Start 14-Day Free Trial
                            </Button>
                            <Button
                                href="/features"
                                variant="secondary"
                                size="lg"
                            >
                                Browse All 13 Features
                            </Button>
                        </div>
                    </div>

                    {/* Architectural Blueprint Visual */}
                    <div className="mt-16 rounded-3xl border border-stone-200/90 bg-white p-6 sm:p-10 shadow-sm">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <h2 className="font-display text-2xl font-bold text-stone-900">
                                Real-Time Event Driven Data Flow
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm text-stone-500">
                                How a single order at the POS automatically syncs across the entire platform in milliseconds.
                            </p>
                        </div>

                        {/* Interactive Event Diagram */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono">
                            <div className="rounded-2xl border-2 border-primary bg-primary-fixed/20 p-5 space-y-3">
                                <div className="flex justify-between items-center text-primary font-bold">
                                    <span>01 / TRIGGER</span>
                                    <span className="h-2 w-2 rounded-full bg-primary animate-ping" />
                                </div>
                                <div className="font-bold text-stone-900 text-sm font-sans">
                                    Order Settled at POS
                                </div>
                                <p className="text-stone-600 text-xs font-sans leading-relaxed">
                                    Waiter rings up 2x Wagyu Burgers on Table 4. Tender recorded via Visa Card.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-xs">
                                <div className="text-indigo-600 font-bold">
                                    02 / KITCHEN KDS
                                </div>
                                <div className="font-bold text-stone-900 text-sm font-sans">
                                    Instant Routing
                                </div>
                                <p className="text-stone-600 text-xs font-sans leading-relaxed">
                                    Ticket appears on Grill station. Timer starts counting elapsed minutes. VIP flags applied.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-xs">
                                <div className="text-emerald-600 font-bold">
                                    03 / INVENTORY
                                </div>
                                <div className="font-bold text-stone-900 text-sm font-sans">
                                    BOM Auto-Deduction
                                </div>
                                <p className="text-stone-600 text-xs font-sans leading-relaxed">
                                    Deducts 360g Wagyu, 2 buns, 50ml aioli from branch stock. Threshold checked.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200 bg-white p-5 space-y-3 shadow-xs">
                                <div className="text-amber-600 font-bold">
                                    04 / FINANCE
                                </div>
                                <div className="font-bold text-stone-900 text-sm font-sans">
                                    Shift Ledger Audit
                                </div>
                                <p className="text-stone-600 text-xs font-sans leading-relaxed">
                                    Shift expected cash/card balance increments. Gross margin computed against live COGS.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* The 4 Core Platform Engines */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="MODULAR ARCHITECTURE"
                        title="The Four Operational Engines"
                        description="Touch Dine is organized into four interconnected operational domains, built from the ground up for food and beverage businesses."
                    />

                    <div className="mt-12 flex justify-center gap-2 border-b border-stone-200 pb-4 overflow-x-auto">
                        {[
                            { key: 'service', label: '1. Service Engine (Floor & Counter)' },
                            { key: 'kitchen', label: '2. Kitchen Engine (KDS & Prep)' },
                            { key: 'cost', label: '3. Food Cost Engine (BOM & Suppliers)' },
                            { key: 'finance', label: '4. Financial Engine (Cash & Audits)' },
                        ].map((engine) => (
                            <button
                                key={engine.key}
                                type="button"
                                onClick={() => setActiveEngine(engine.key as any)}
                                className={`rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                                    activeEngine === engine.key
                                        ? 'bg-primary text-on-primary shadow-xs'
                                        : 'text-stone-600 hover:text-stone-900'
                                }`}
                            >
                                {engine.label}
                            </button>
                        ))}
                    </div>

                    <div className="mt-12">
                        {activeEngine === 'service' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl font-bold text-stone-900">
                                        Frictionless Front-of-House Experience
                                    </h3>
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        Empower servers and cashiers with an interface that gets out of their way. Fast search, intuitive modifier popups, and quick table transfers ensure guests get served promptly without order errors.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Table Floorplans</div>
                                            <p className="mt-1 text-stone-500">Visual table occupancy and cover counts</p>
                                        </div>
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Multi-Tender Splits</div>
                                            <p className="mt-1 text-stone-500">Split bills by seat or exact amount</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Link href="/features/restaurant-pos" className="text-sm font-bold text-primary hover:text-primary-container">
                                            View POS capabilities →
                                        </Link>
                                    </div>
                                </div>

                                <ProductMockup title="Floor Service Engine" subtitle="Window Terrace · Section A">
                                    <div className="p-6 bg-stone-100 text-xs space-y-3 font-mono">
                                        <div className="flex justify-between items-center text-stone-700">
                                            <span>ACTIVE OCCUPANCY: 18 / 24 TABLES</span>
                                            <span className="text-emerald-700 font-bold">AVG TURN: 44m</span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="bg-rose-100 border border-rose-300 p-3 rounded-lg text-rose-900 font-bold">
                                                T-01 ($68.00)
                                            </div>
                                            <div className="bg-emerald-100 border border-emerald-300 p-3 rounded-lg text-emerald-900 font-bold">
                                                T-02 (Open)
                                            </div>
                                            <div className="bg-rose-100 border border-rose-300 p-3 rounded-lg text-rose-900 font-bold">
                                                T-03 ($112.50)
                                            </div>
                                        </div>
                                    </div>
                                </ProductMockup>
                            </div>
                        )}

                        {activeEngine === 'kitchen' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl font-bold text-stone-900">
                                        Precision Kitchen Display System (KDS)
                                    </h3>
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        Keep line cooks focused with digital bump screens. Color-coded ticket timers warn chefs before tickets run late, while urgent priority flags let managers rush orders when needed.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Station Routing</div>
                                            <p className="mt-1 text-stone-500">Route items to Grill, Fryer, Salad, Bar</p>
                                        </div>
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Item Bump Actions</div>
                                            <p className="mt-1 text-stone-500">Mark items finished individually</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Link href="/features/kitchen-display" className="text-sm font-bold text-primary hover:text-primary-container">
                                            View KDS capabilities →
                                        </Link>
                                    </div>
                                </div>

                                <ProductMockup title="Kitchen Display Board" subtitle="Station: Hot Line">
                                    <div className="p-6 bg-stone-900 text-white text-xs space-y-3 font-mono">
                                        <div className="flex justify-between items-center text-stone-400">
                                            <span>ACTIVE ORDERS: 5</span>
                                            <span className="text-amber-400 font-bold">HOT LINE QUEUE</span>
                                        </div>
                                        <div className="rounded-lg bg-stone-800 p-3 border border-indigo-500">
                                            <div className="flex justify-between font-bold text-indigo-300">
                                                <span>#0481 (T-04)</span>
                                                <span>6 MINS</span>
                                            </div>
                                            <div className="mt-1 text-stone-200">2x Ribeye Steak (Medium Rare)</div>
                                        </div>
                                    </div>
                                </ProductMockup>
                            </div>
                        )}

                        {activeEngine === 'cost' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl font-bold text-stone-900">
                                        Recipe Costing & Inventory Control
                                    </h3>
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        Know the true food cost of every menu item. Connect raw ingredients with purchasing purchase orders (POs) and goods receipt reconciliations to protect your restaurant's margins.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Recipe BOM</div>
                                            <p className="mt-1 text-stone-500">Gram-level ingredient deduction</p>
                                        </div>
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Waste Logging</div>
                                            <p className="mt-1 text-stone-500">Audited spoilage & drop reasons</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Link href="/features/inventory-management" className="text-sm font-bold text-primary hover:text-primary-container">
                                            View inventory capabilities →
                                        </Link>
                                    </div>
                                </div>

                                <ProductMockup title="Inventory & Recipe Engine" subtitle="Central Store Larder">
                                    <div className="p-6 bg-stone-50 text-xs space-y-3 font-mono">
                                        <div className="flex justify-between text-stone-700 font-bold">
                                            <span>STOCK AUDIT ALERT</span>
                                            <span className="text-rose-600">LOW STOCK</span>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-stone-200 space-y-1">
                                            <div className="flex justify-between font-bold">
                                                <span>Wagyu Ground Patty</span>
                                                <span className="text-rose-600">4.2 kg (Min 10 kg)</span>
                                            </div>
                                            <div className="text-[11px] text-stone-500">PO #1042 sent to Prime Meats Ltd</div>
                                        </div>
                                    </div>
                                </ProductMockup>
                            </div>
                        )}

                        {activeEngine === 'finance' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                                <div className="space-y-4">
                                    <h3 className="font-display text-2xl font-bold text-stone-900">
                                        Audit-Proof Cash & Shift Ledger
                                    </h3>
                                    <p className="text-stone-600 text-sm leading-relaxed">
                                        Eliminate mystery cash shortages with blind till closures. Require managers to approve mid-shift payouts, item voids, and comps with their unique Security PIN.
                                    </p>
                                    <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Blind Till Closes</div>
                                            <p className="mt-1 text-stone-500">No peek before manual cash counts</p>
                                        </div>
                                        <div className="rounded-xl border border-stone-200 p-3 bg-stone-50">
                                            <div className="font-bold text-stone-900">Manager Security PIN</div>
                                            <p className="mt-1 text-stone-500">Four-digit authorization for voids</p>
                                        </div>
                                    </div>
                                    <div className="pt-2">
                                        <Link href="/features/cash-management" className="text-sm font-bold text-primary hover:text-primary-container">
                                            View cash shift capabilities →
                                        </Link>
                                    </div>
                                </div>

                                <ProductMockup title="Cash Shift Security" subtitle="Drawer Register #01">
                                    <div className="p-6 bg-stone-50 text-xs space-y-3 font-mono">
                                        <div className="flex justify-between text-stone-700 font-bold">
                                            <span>PIN AUTHORIZATION REQUIRED</span>
                                            <span className="text-amber-600">MANAGER LEVEL</span>
                                        </div>
                                        <div className="rounded-lg bg-white p-3 border border-stone-200 text-stone-600">
                                            Action: Void Item (Order #0482)
                                            <br />
                                            Reason: Guest Changed Mind (Prep not started)
                                        </div>
                                    </div>
                                </ProductMockup>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Final Product CTA */}
            <section className="bg-[#1a1c1a] py-16 text-white text-center">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-6">
                    <h2 className="font-display text-3xl sm:text-4xl font-extrabold">
                        Ready to Connect Your Whole Restaurant?
                    </h2>
                    <p className="text-stone-300 text-sm sm:text-base max-w-xl mx-auto">
                        Start your 14-day free trial on any plan. Set up your restaurant step by step in under 5 minutes.
                    </p>
                    <div className="pt-2">
                        <Button href="/register" variant="accent" size="lg">
                            Start Free 14-Day Trial
                        </Button>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
