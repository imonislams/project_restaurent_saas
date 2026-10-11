import {
    Button,
    formatPrice,
    getCurrencySymbol,
    MarketingHead,
    MarketingLayout,
    ProductMockup,
    SectionHeading,
    trackConversion,
} from '@/Components/Marketing';
import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';

interface Plan {
    id: number;
    name: string;
    slug: string;
    description: string;
    currency: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    features: string[];
    limits: {
        branches?: number | null;
        users?: number | null;
        orders_this_month?: number | null;
    };
    is_popular?: boolean;
}

interface WelcomeProps {
    canLogin?: boolean;
    canRegister?: boolean;
    plans: Plan[];
    platformCurrency?: string;
}

interface DemoItem {
    id: number;
    name: string;
    category: 'mains' | 'sides' | 'drinks';
    price: number;
    cogs: number;
    badge?: string;
}

const DEMO_MENU: DemoItem[] = [
    { id: 1, name: 'Truffle Brioche Burger', category: 'mains', price: 16.5, cogs: 4.8, badge: 'Popular' },
    { id: 2, name: 'Wood-Fired Margherita', category: 'mains', price: 14.0, cogs: 3.2 },
    { id: 3, name: 'Pan-Seared Salmon Fillet', category: 'mains', price: 22.0, cogs: 7.1 },
    { id: 4, name: 'Garlic Rosemary Fries', category: 'sides', price: 6.5, cogs: 1.1 },
    { id: 5, name: 'Burrata & Heirloom Salad', category: 'sides', price: 11.0, cogs: 3.4 },
    { id: 6, name: 'Cold Brew Nitro Espresso', category: 'drinks', price: 5.0, cogs: 0.9 },
    { id: 7, name: 'Artisan Blood Orange Soda', category: 'drinks', price: 4.5, cogs: 0.8 },
];

export default function Welcome({ plans = [], platformCurrency = 'USD' }: WelcomeProps) {
    const currencySymbol = getCurrencySymbol(platformCurrency);

    // POS Terminal Simulator State
    const [cart, setCart] = useState<{ item: DemoItem; quantity: number }[]>([
        { item: DEMO_MENU[0], quantity: 2 },
        { item: DEMO_MENU[3], quantity: 1 },
    ]);
    const [activeCategory, setActiveCategory] = useState<'all' | 'mains' | 'sides' | 'drinks'>('all');
    const [orderType, setOrderType] = useState<'dine_in' | 'takeaway' | 'delivery'>('dine_in');
    const [selectedTable, setSelectedTable] = useState('Table 04 (Window)');
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    // Feature Showcase Tabs
    const [activeFeatureTab, setActiveFeatureTab] = useState<'pos' | 'kds' | 'tables' | 'inventory' | 'shifts'>('pos');

    // Pricing Billing Toggle
    const [annualBilling, setAnnualBilling] = useState(true);

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // Cart calculations
    const subtotal = cart.reduce((acc, line) => acc + line.item.price * line.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + tax;

    const addToCart = (item: DemoItem) => {
        setCart((prev) => {
            const existing = prev.find((p) => p.item.id === item.id);
            if (existing) {
                return prev.map((p) =>
                    p.item.id === item.id ? { ...p, quantity: p.quantity + 1 } : p
                );
            }
            return [...prev, { item, quantity: 1 }];
        });
        trackConversion('demo_interacted', { action: 'add_to_cart', item: item.name });
    };

    const updateQuantity = (id: number, delta: number) => {
        setCart((prev) =>
            prev
                .map((p) => (p.item.id === id ? { ...p, quantity: p.quantity + delta } : p))
                .filter((p) => p.quantity > 0)
        );
    };

    const completeDemoCheckout = () => {
        setShowReceiptModal(true);
        trackConversion('demo_interacted', { action: 'checkout_completed', total });
    };

    const structuredSchema = [
        {
            '@context': 'https://schema.org',
            '@type': 'SoftwareApplication',
            name: 'Restrly',
            operatingSystem: 'All modern web browsers, iOS, Android, macOS, Windows',
            applicationCategory: 'BusinessApplication',
            description:
                'Connected Restaurant Operating System unifying Point of Sale, Kitchen Display System (KDS), Table Management, Recipe Costing, Inventory, and Multi-Branch Reporting.',
            offers: {
                '@type': 'AggregateOffer',
                priceCurrency: 'USD',
                lowPrice: '29',
                highPrice: '199',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Restrly',
            url: 'https://restrly.com',
            logo: 'https://restrly.com/favicon.svg',
            sameAs: [],
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: [
                {
                    '@type': 'Question',
                    name: 'Do I need dedicated or proprietary hardware to use Restrly?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'No. Restrly runs on standard iPads, Android tablets, touch terminals, laptops, and desktop computers. It seamlessly connects to standard thermal receipt printers (ESC/POS) and network kitchen printers.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Is there a free trial, and do I need a credit card?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes! Every Restrly account begins with a full 14-day free trial on all plans. No credit card is required to sign up or start selling.',
                    },
                },
                {
                    '@type': 'Question',
                    name: 'Does Restrly support multi-branch restaurant operations?',
                    acceptedAnswer: {
                        '@type': 'Answer',
                        text: 'Yes. The Growth plan supports up to 3 branches, and the Business plan supports unlimited locations with centralized menus, branch-level price overrides, and inter-branch stock transfers.',
                    },
                },
            ],
        },
    ];

    const faqs = [
        {
            q: 'Do I need dedicated or proprietary hardware to use Restrly?',
            a: 'No. Restrly is completely hardware-agnostic. You can run the POS and Kitchen Display on any standard iPad, Android tablet, touchscreen terminal, or desktop browser. It connects directly with standard ESC/POS thermal printers, LAN kitchen printers, cash drawers, and USB/Bluetooth barcode scanners.',
        },
        {
            q: 'How does the 14-day free trial work? Will I be charged?',
            a: 'You can test every feature of Restrly for 14 days without entering any payment information. You only choose a plan and billing method when you are ready to activate your live restaurant operations.',
        },
        {
            q: 'How does real-time inventory deduction work with recipes?',
            a: 'When you build menu items, you link raw ingredients with precise unit measures (e.g. 180g beef patty, 1 brioche bun, 30g cheddar). The moment an order is settled at the POS, Restrly instantly deducts the exact quantities from your branch stock and alerts you if any ingredient hits its low-stock threshold.',
        },
        {
            q: 'Can staff access sensitive reports or give unauthorized discounts?',
            a: 'No. Restrly enforces strict role-based access control (RBAC). Cashiers and waiters cannot view profit margins, change item costs, or apply discounts above your set threshold without a Manager Security PIN approval.',
        },
        {
            q: 'Can we manage multiple branches and transfer stock between them?',
            a: 'Yes. Restrly provides a unified multi-branch architecture. You can manage a central master catalog, customize branch-level prices, dispatch stock transfers between locations with manager dispatch/receipt approvals, and view consolidated sales reports.',
        },
        {
            q: 'How is our restaurant data protected?',
            a: 'Every restaurant operates within a strictly isolated multi-tenant architecture. Your customer data, sales records, and recipes are inaccessible to other tenants. The platform runs automated hourly database backups with verified restore capabilities.',
        },
    ];

    return (
        <MarketingLayout>
            <MarketingHead
                title="Run Your Restaurant. Not Your Chaos."
                description="The complete Restaurant Operating System unifying Point of Sale, Kitchen Display, Table Management, Recipe Costing, Inventory, and Multi-Branch Control."
                schema={structuredSchema}
            />

            {/* ========================================================================= */}
            {/* HERO SECTION                                                              */}
            {/* ========================================================================= */}
            <section className="relative overflow-hidden pt-8 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-36">
                {/* Background ambient accents */}
                <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
                    <div className="h-[600px] w-[1100px] bg-gradient-to-b from-[#10B981]/10 via-[#0B271F]/5 to-transparent blur-3xl opacity-70" />
                </div>

                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {/* Editorial Eyebrow Badge */}
                    <div className="flex justify-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-[#0B271F]/15 bg-white/80 px-4 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider text-[#0B271F] shadow-xs backdrop-blur">
                            <span className="flex h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
                            <span>CONNECTED RESTAURANT OS · V2.4</span>
                        </div>
                    </div>

                    {/* Bold Confident Headline */}
                    <div className="mt-6 text-center">
                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-[#0B271F] sm:text-6xl lg:text-7xl lg:leading-[1.08]">
                            Run Your Restaurant.
                            <br />
                            <span className="text-[#10B981]">Not Your Chaos.</span>
                        </h1>

                        <p className="mx-auto mt-6 max-w-2xl text-base sm:text-xl text-stone-600 leading-relaxed">
                            Manage sales, orders, inventory, staff, and daily operations from one connected restaurant platform. Serve customers faster, stay in control of your stock, and understand how your business is performing.
                        </p>

                        {/* Conversion CTAs */}
                        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                            <Button
                                href="/register"
                                variant="primary"
                                size="lg"
                                className="shadow-lg shadow-[#0B271F]/20 text-base px-8 py-4"
                                onClick={() => trackConversion('hero_cta_clicked', { cta: 'start_trial' })}
                            >
                                Start Free Trial
                            </Button>

                            <Button
                                href="/product"
                                variant="secondary"
                                size="lg"
                                className="text-base px-7 py-4"
                                onClick={() => trackConversion('hero_cta_clicked', { cta: 'explore_platform' })}
                            >
                                Explore the Platform
                            </Button>
                        </div>

                        {/* Supporting Microcopy */}
                        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-stone-500 font-medium">
                            <span className="flex items-center gap-1.5">
                                <svg className="h-4 w-4 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                14-day free trial on all plans
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="h-4 w-4 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                No credit card required
                            </span>
                            <span className="flex items-center gap-1.5">
                                <svg className="h-4 w-4 text-[#10B981]" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                                Set up step by step in under 5 minutes
                            </span>
                        </div>
                    </div>

                    {/* ================================================================= */}
                    {/* INTERACTIVE POS TERMINAL PREVIEW                                  */}
                    {/* ================================================================= */}
                    <div className="mt-12 sm:mt-16">
                        <ProductMockup
                            title="Restrly POS Terminal v2.4"
                            subtitle="Downtown Flagship · Shift: Open ($250 Float)"
                            statusBadge={
                                <div className="flex items-center gap-2 rounded-lg bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-mono text-emerald-300">
                                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                                    <span>LIVE INTERACTIVE DEMO</span>
                                </div>
                            }
                        >
                            {/* Inner Terminal Workspace */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[560px] bg-stone-100 text-stone-900 font-sans">
                                {/* Left 7 Cols: Menu Catalog & Categories */}
                                <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-stone-200 bg-white p-4 sm:p-5">
                                    {/* Order Type & Table Selection Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-200">
                                        <div className="inline-flex rounded-xl bg-stone-100 p-1 text-xs font-semibold">
                                            {(['dine_in', 'takeaway', 'delivery'] as const).map((type) => (
                                                <button
                                                    key={type}
                                                    type="button"
                                                    onClick={() => setOrderType(type)}
                                                    className={`rounded-lg px-3 py-1.5 capitalize transition-all ${
                                                        orderType === type
                                                            ? 'bg-white text-[#0B271F] shadow-xs'
                                                            : 'text-stone-600 hover:text-stone-900'
                                                    }`}
                                                >
                                                    {type.replace('_', ' ')}
                                                </button>
                                            ))}
                                        </div>

                                        {orderType === 'dine_in' && (
                                            <div className="flex items-center gap-2 text-xs">
                                                <span className="text-stone-500 font-medium">Table:</span>
                                                <select
                                                    value={selectedTable}
                                                    onChange={(e) => setSelectedTable(e.target.value)}
                                                    className="rounded-lg border-stone-300 py-1 text-xs font-semibold text-stone-800 bg-white"
                                                >
                                                    <option>Table 04 (Window - 4 seats)</option>
                                                    <option>Table 08 (Booth - 6 seats)</option>
                                                    <option>Table 12 (Terrace - 2 seats)</option>
                                                    <option>Bar Stool 03 (Counter)</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Category Filter Pills */}
                                    <div className="flex items-center gap-2 pt-3 pb-4 overflow-x-auto">
                                        {(['all', 'mains', 'sides', 'drinks'] as const).map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setActiveCategory(cat)}
                                                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                                                    activeCategory === cat
                                                        ? 'bg-[#0B271F] text-white'
                                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                                }`}
                                            >
                                                {cat === 'all' ? 'All Items' : cat}
                                            </button>
                                        ))}
                                        <span className="text-xs text-stone-400 italic ml-auto hidden sm:inline">
                                            Click any dish to add
                                        </span>
                                    </div>

                                    {/* Grid of Dishes */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[380px] pr-1">
                                        {DEMO_MENU.filter(
                                            (m) => activeCategory === 'all' || m.category === activeCategory
                                        ).map((dish) => (
                                            <button
                                                key={dish.id}
                                                type="button"
                                                onClick={() => addToCart(dish)}
                                                className="group relative flex flex-col justify-between rounded-xl border border-stone-200/90 bg-stone-50/60 p-3 text-left hover:border-[#10B981] hover:bg-emerald-50/40 hover:shadow-xs transition-all active:scale-[0.98]"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-1">
                                                        <h4 className="font-semibold text-stone-900 text-xs sm:text-sm group-hover:text-[#0B271F] leading-snug">
                                                            {dish.name}
                                                        </h4>
                                                        {dish.badge && (
                                                            <span className="shrink-0 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                                                                {dish.badge}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between">
                                                    <span className="font-mono text-xs sm:text-sm font-bold text-stone-900">
                                                        {currencySymbol}{dish.price.toFixed(2)}
                                                    </span>
                                                    <span className="rounded-md bg-stone-200/80 p-1 text-stone-600 group-hover:bg-[#10B981] group-hover:text-white transition-colors">
                                                        <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                                                        </svg>
                                                    </span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Right 5 Cols: Live Cart & Bill Summary */}
                                <div className="lg:col-span-5 flex flex-col bg-stone-50 p-4 sm:p-5">
                                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                                        <div className="font-mono text-xs font-bold text-stone-700 uppercase tracking-wider">
                                            Ticket #0482
                                        </div>
                                        <div className="text-xs text-stone-500">
                                            Server: Marcus (Station 1)
                                        </div>
                                    </div>

                                    {/* Cart Lines */}
                                    <div className="flex-1 overflow-y-auto py-3 space-y-2.5 max-h-[220px]">
                                        {cart.length === 0 ? (
                                            <div className="py-12 text-center text-xs text-stone-400">
                                                Cart is empty. Tap any menu item to build your ticket.
                                            </div>
                                        ) : (
                                            cart.map((line) => (
                                                <div
                                                    key={line.item.id}
                                                    className="flex items-center justify-between gap-2 rounded-lg bg-white p-2.5 border border-stone-200/70 text-xs shadow-2xs"
                                                >
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-semibold text-stone-900 truncate">
                                                            {line.item.name}
                                                        </div>
                                                        <div className="text-[11px] text-stone-500 font-mono">
                                                            {currencySymbol}{line.item.price.toFixed(2)} each
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center rounded-md border border-stone-200 bg-stone-50">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuantity(line.item.id, -1)}
                                                                className="px-2 py-0.5 text-stone-600 hover:text-stone-900"
                                                            >
                                                                −
                                                            </button>
                                                            <span className="px-1.5 font-mono font-bold text-stone-900">
                                                                {line.quantity}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuantity(line.item.id, 1)}
                                                                className="px-2 py-0.5 text-stone-600 hover:text-stone-900"
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <span className="font-mono font-bold text-stone-900 w-14 text-right">
                                                            {currencySymbol}{(line.item.price * line.quantity).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Bill Calculation Totals */}
                                    <div className="mt-auto pt-3 border-t border-stone-200 space-y-1.5 text-xs">
                                        <div className="flex justify-between text-stone-600">
                                            <span>Subtotal</span>
                                            <span className="font-mono font-medium">{currencySymbol}{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-stone-600">
                                            <span>Tax (8%)</span>
                                            <span className="font-mono font-medium">{currencySymbol}{tax.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-stone-900 font-bold text-sm pt-1 border-t border-stone-200/60">
                                            <span>Total Balance</span>
                                            <span className="font-mono text-base text-[#0B271F]">{currencySymbol}{total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-4 pt-3 border-t border-stone-200 space-y-2">
                                        <button
                                            type="button"
                                            disabled={cart.length === 0}
                                            onClick={completeDemoCheckout}
                                            className="w-full rounded-xl bg-[#0B271F] py-3 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#134A38] disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <span>Pay & Settle Order</span>
                                            <span>→</span>
                                        </button>

                                        <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                                            <span>Payment: Cash, Card, Split Bill</span>
                                            <button
                                                type="button"
                                                onClick={() => setCart([])}
                                                className="text-stone-400 hover:text-rose-600 transition-colors"
                                            >
                                                Clear Ticket
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </ProductMockup>

                        {/* Interactive Receipt Success Dialog */}
                        {showReceiptModal && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
                                <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex items-center justify-between pb-3 border-b border-dashed border-stone-200">
                                        <div className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            <span className="font-mono text-xs font-bold text-stone-900">
                                                ORDER #0482 SETTLED
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setShowReceiptModal(false)}
                                            className="text-stone-400 hover:text-stone-700 text-sm font-bold"
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    <div className="my-4 font-mono text-xs text-stone-600 space-y-1">
                                        <div className="text-center font-bold text-stone-900 text-sm pb-1">
                                            Restrly Flagship Bistro
                                        </div>
                                        <div className="text-center text-[11px] text-stone-400 pb-2">
                                            {orderType.replace('_', ' ').toUpperCase()} · {selectedTable}
                                        </div>

                                        {cart.map((line) => (
                                            <div key={line.item.id} className="flex justify-between py-0.5">
                                                <span>{line.quantity}x {line.item.name}</span>
                                                <span className="font-bold text-stone-900">
                                                    {currencySymbol}{(line.item.price * line.quantity).toFixed(2)}
                                                </span>
                                            </div>
                                        ))}

                                        <div className="pt-2 border-t border-dashed border-stone-200 flex justify-between font-bold text-stone-900 text-sm">
                                            <span>PAID TOTAL</span>
                                            <span>{currencySymbol}{total.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-900 space-y-1">
                                        <div className="font-semibold flex items-center gap-1.5">
                                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                            Kitchen Ticket Sent Automatically
                                        </div>
                                        <p className="text-[11px] text-emerald-800">
                                            Recipe ingredients were automatically deducted from your inventory ledger with zero manual data entry.
                                        </p>
                                    </div>

                                    <div className="mt-5 flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowReceiptModal(false)}
                                            className="w-full rounded-xl bg-stone-100 py-2.5 text-xs font-semibold text-stone-800 hover:bg-stone-200"
                                        >
                                            Dismiss Demo
                                        </button>
                                        <Link
                                            href="/register"
                                            className="w-full rounded-xl bg-[#0B271F] py-2.5 text-center text-xs font-bold text-white hover:bg-[#134A38]"
                                        >
                                            Get Started Free
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* VALUE PROPOSITION: SOLVING THE 3 CORE OPERATIONAL PAINS                  */}
            {/* ========================================================================= */}
            <section className="border-y border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="01 / OPERATIONAL REALITY"
                        title="Where Most Restaurants Lose Their Margin"
                        description="Software that treats POS, kitchen dispatch, and stock as disconnected silos creates invisible waste. Here is how Restrly connects your operations."
                    />

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Pain 1: Rush Hour Breakdown */}
                        <div className="rounded-2xl border border-stone-200/90 bg-[#FBFBF9] p-8 space-y-4 hover:border-stone-300 transition-all">
                            <div className="font-mono text-xs font-bold uppercase tracking-wider text-rose-600">
                                The Choke Point
                            </div>
                            <h3 className="font-display text-xl font-bold text-stone-900">
                                Rush-Hour Ticket Disconnect
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                Handwritten paper slips get lost or soaked. Line cooks misread modifications. Waiters hover over the pass asking when order #14 will be ready, distracting kitchen staff during peak rush.
                            </p>
                            <div className="pt-4 border-t border-stone-200/80">
                                <div className="font-mono text-xs font-bold text-[#10B981] uppercase tracking-wider">
                                    The Restrly Solution
                                </div>
                                <p className="mt-1 text-xs text-stone-700 leading-relaxed">
                                    Real-time Kitchen Display (KDS) stations. Tickets color-code automatically based on elapsed prep time, modifiers are impossible to miss, and ticket status is visible from any floor terminal.
                                </p>
                            </div>
                        </div>

                        {/* Pain 2: Inventory Mystery */}
                        <div className="rounded-2xl border border-stone-200/90 bg-[#FBFBF9] p-8 space-y-4 hover:border-stone-300 transition-all">
                            <div className="font-mono text-xs font-bold uppercase tracking-wider text-amber-600">
                                The Margin Bleed
                            </div>
                            <h3 className="font-display text-xl font-bold text-stone-900">
                                Blind Stockouts & Food Waste
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                Servers ring up sea bass 20 minutes after the last portion was plated. Staff discover shortages during service, while prep spoilage and plate waste never get recorded against prime costs.
                            </p>
                            <div className="pt-4 border-t border-stone-200/80">
                                <div className="font-mono text-xs font-bold text-[#10B981] uppercase tracking-wider">
                                    The Restrly Solution
                                </div>
                                <p className="mt-1 text-xs text-stone-700 leading-relaxed">
                                    Recipe Bill-of-Materials (BOM). Every dish settled automatically decrements raw inventory down to the gram. Instant low-stock alerts and one-tap 86’d availability toggling.
                                </p>
                            </div>
                        </div>

                        {/* Pain 3: Cash & Shift Variance */}
                        <div className="rounded-2xl border border-stone-200/90 bg-[#FBFBF9] p-8 space-y-4 hover:border-stone-300 transition-all">
                            <div className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-600">
                                The End-of-Day Mystery
                            </div>
                            <h3 className="font-display text-xl font-bold text-stone-900">
                                Shift Till Discrepancies
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed">
                                Cash drawers don't balance at closing. Mid-shift payouts for produce deliveries aren't logged. Discounting is handed out without manager oversight, eating into gross profit.
                            </p>
                            <div className="pt-4 border-t border-stone-200/80">
                                <div className="font-mono text-xs font-bold text-[#10B981] uppercase tracking-wider">
                                    The Restrly Solution
                                </div>
                                <p className="mt-1 text-xs text-stone-700 leading-relaxed">
                                    Blind cash register reconciliation. Shifts require declared opening floats and audited pay-in/pay-out reasons. Discounts over threshold require a Manager Security PIN.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* CORE PRODUCT WORKFLOWS (TABBED DEEP DIVE)                                 */}
            {/* ========================================================================= */}
            <section className="py-20 sm:py-28 bg-[#FBFBF9]">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="02 / CONNECTED WORKFLOWS"
                        title="Every Station Connected in Real-Time"
                        description="Explore how floor staff, kitchen line cooks, stock managers, and owners collaborate on one shared system."
                    />

                    {/* Workflow Tabs */}
                    <div className="mt-10 flex flex-wrap items-center justify-center gap-2 border-b border-stone-200 pb-4">
                        {[
                            { key: 'pos', label: '1. Fast POS Terminal' },
                            { key: 'kds', label: '2. Kitchen Display (KDS)' },
                            { key: 'tables', label: '3. Tables & Floor Plan' },
                            { key: 'inventory', label: '4. Recipe & Inventory Costing' },
                            { key: 'shifts', label: '5. Cash Shifts & Security' },
                        ].map((tab) => (
                            <button
                                key={tab.key}
                                type="button"
                                onClick={() => setActiveFeatureTab(tab.key as any)}
                                className={`rounded-xl px-4 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                                    activeFeatureTab === tab.key
                                        ? 'bg-[#0B271F] text-white shadow-xs'
                                        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab Panels */}
                    <div className="mt-10">
                        {activeFeatureTab === 'pos' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm">
                                <div className="space-y-6">
                                    <div className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                        FRONT OF HOUSE
                                    </div>
                                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                        Built for Peak-Rush Speed & Split Bills
                                    </h3>
                                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                        A clean, intuitive interface designed for rapid order entry on touchscreens. Staff can modify items, add custom prep notes, split checks by seat or custom amount, and apply promotional discounts with complete manager oversight.
                                    </p>
                                    <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Multi-tender payment: Cash, Card, Mobile Banking, and House Accounts
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Service types supported: Dine-in, Takeaway, Counter & Delivery dispatch
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Thermal receipt and kitchen chit printing via ESC/POS standards
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <Link
                                            href="/features/restaurant-pos"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                        >
                                            <span>Deep dive into POS capabilities</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-4">
                                    <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                                        <span className="font-mono text-xs font-bold text-stone-700">SPLIT PAYMENT TERMINAL</span>
                                        <span className="text-xs text-emerald-600 font-semibold">Balance: $0.00</span>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center rounded-lg bg-white p-3 border border-stone-200">
                                            <span className="font-medium text-stone-800">Tender 1: Visa (Ending 4192)</span>
                                            <span className="font-mono font-bold text-stone-900">$45.00</span>
                                        </div>
                                        <div className="flex justify-between items-center rounded-lg bg-white p-3 border border-stone-200">
                                            <span className="font-medium text-stone-800">Tender 2: Cash (Drawer #1)</span>
                                            <span className="font-mono font-bold text-stone-900">$20.00</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-[#0B271F] p-4 text-white text-xs space-y-1">
                                        <div className="font-bold flex items-center justify-between">
                                            <span>Total Bill: $65.00</span>
                                            <span className="text-emerald-400 font-mono">FULLY SETTLED</span>
                                        </div>
                                        <div className="text-stone-300 text-[11px]">
                                            Change Due: $5.00 · Receipt Printed Automatically
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeatureTab === 'kds' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm">
                                <div className="space-y-6">
                                    <div className="inline-flex rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                                        KITCHEN OPERATIONS
                                    </div>
                                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                        Real-Time Kitchen Kanban Display (KDS)
                                    </h3>
                                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                        Replace lost paper slips with crisp, digital order boards. Orders route automatically to designated prep stations (Grill, Cold Larder, Bar). Tickets alert staff when tickets exceed target prep times.
                                    </p>
                                    <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                            Interactive statuses: New → Preparing → Ready → Served
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                            Urgent priority flag for VIP or delayed orders
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                                            Station routing: filter by Grill, Fryer, Salad, or Bar stations
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <Link
                                            href="/features/kitchen-display"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                        >
                                            <span>Explore Kitchen Display features</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 bg-stone-100 p-4 rounded-2xl border border-stone-200">
                                    {/* KDS Card 1 */}
                                    <div className="rounded-xl bg-white p-3 border-2 border-indigo-500 shadow-xs space-y-2 text-xs">
                                        <div className="flex justify-between items-center font-mono">
                                            <span className="font-bold text-indigo-900">#0480 · T-04</span>
                                            <span className="text-indigo-600 font-bold">4m ago</span>
                                        </div>
                                        <div className="space-y-1 text-stone-800 font-medium">
                                            <div>2x Truffle Burger (Medium)</div>
                                            <div className="text-[11px] text-amber-700">⚠️ No Onions</div>
                                            <div>1x Rosemary Fries</div>
                                        </div>
                                        <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-[11px]">
                                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-indigo-700 font-semibold">PREPARING</span>
                                            <span className="text-stone-400">Station: Grill</span>
                                        </div>
                                    </div>

                                    {/* KDS Card 2 */}
                                    <div className="rounded-xl bg-white p-3 border border-emerald-500 shadow-xs space-y-2 text-xs">
                                        <div className="flex justify-between items-center font-mono">
                                            <span className="font-bold text-emerald-900">#0478 · T-08</span>
                                            <span className="text-emerald-700 font-bold">12m</span>
                                        </div>
                                        <div className="space-y-1 text-stone-800 font-medium">
                                            <div>1x Salmon Fillet</div>
                                            <div>1x Heirloom Salad</div>
                                        </div>
                                        <div className="pt-2 border-t border-stone-100 flex justify-between items-center text-[11px]">
                                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800 font-semibold">READY</span>
                                            <span className="text-stone-400">Pass Station</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeatureTab === 'tables' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm">
                                <div className="space-y-6">
                                    <div className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">
                                        FLOOR MANAGEMENT
                                    </div>
                                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                        Visual Table Floorplans & Order Transfers
                                    </h3>
                                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                        Design custom dining areas (Main Dining, Patio Terrace, Bar Lounge) matching your physical layout. Track real-time table turnover, occupancy times, and transfer checks seamlessly between tables.
                                    </p>
                                    <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Visual statuses: Available, Occupied, Reserved, Cleaning
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            Cover count tracking for accurate spend-per-guest analysis
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                            One-click table order transfers with audit logs
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <Link
                                            href="/features/table-management"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                        >
                                            <span>Explore Table Management</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="bg-stone-50 p-6 rounded-2xl border border-stone-200 grid grid-cols-3 gap-3 text-xs">
                                    <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-rose-900">Table 01</div>
                                        <div className="text-[11px] text-rose-700">4 Guests · 32m</div>
                                        <div className="font-mono font-bold text-xs">$84.50</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-emerald-900">Table 02</div>
                                        <div className="text-[11px] text-emerald-700">Available</div>
                                        <div className="font-mono text-xs text-stone-400">2 Seats</div>
                                    </div>
                                    <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-rose-900">Table 03</div>
                                        <div className="text-[11px] text-rose-700">6 Guests · 18m</div>
                                        <div className="font-mono font-bold text-xs">$142.00</div>
                                    </div>
                                    <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-amber-900">Table 04</div>
                                        <div className="text-[11px] text-amber-700">Cleaning</div>
                                        <div className="font-mono text-xs text-stone-400">4 Seats</div>
                                    </div>
                                    <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-emerald-900">Table 05</div>
                                        <div className="text-[11px] text-emerald-700">Available</div>
                                        <div className="font-mono text-xs text-stone-400">4 Seats</div>
                                    </div>
                                    <div className="rounded-xl border border-blue-300 bg-blue-50/70 p-3 text-center space-y-1">
                                        <div className="font-bold text-blue-900">VIP Booth</div>
                                        <div className="text-[11px] text-blue-700">Reserved 8:00PM</div>
                                        <div className="font-mono text-xs text-stone-400">8 Seats</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeatureTab === 'inventory' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm">
                                <div className="space-y-6">
                                    <div className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                                        INVENTORY & FOOD COSTING
                                    </div>
                                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                        Automatic Recipe Stock Deduction
                                    </h3>
                                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                        Eliminate manual stock-taking spreadsheets. Map raw ingredients (beef, dairy, produce, spirits) to recipes with exact units. Watch your Cost of Goods Sold (COGS) update dynamically with every settled ticket.
                                    </p>
                                    <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Recipe Bill of Materials (BOM) with automatic yield costing
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Low stock threshold alerts sent before stockouts occur
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Supplier Purchase Orders (PO) with receiving reconciliation
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <Link
                                            href="/features/inventory-management"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                        >
                                            <span>Explore Inventory & Recipes</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-4">
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-stone-200">
                                        <span className="font-mono font-bold text-stone-700">RECIPE BOM: TRUFFLE BURGER</span>
                                        <span className="font-mono font-bold text-emerald-700">Margin: 70.9%</span>
                                    </div>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span>Brioche Bun (1 pc)</span>
                                            <span className="font-mono text-stone-600">$0.85 cost</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span>Ground Wagyu Blend (180g)</span>
                                            <span className="font-mono text-stone-600">$2.70 cost</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span>Black Truffle Aioli (25ml)</span>
                                            <span className="font-mono text-stone-600">$0.80 cost</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span>Aged Gruyère (40g)</span>
                                            <span className="font-mono text-stone-600">$0.45 cost</span>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-stone-200/70 p-3 flex justify-between items-center text-xs font-mono font-bold">
                                        <span>Total Food Cost (COGS)</span>
                                        <span>$4.80 / Sell $16.50</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeFeatureTab === 'shifts' && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center rounded-3xl border border-stone-200/90 bg-white p-8 sm:p-12 shadow-sm">
                                <div className="space-y-6">
                                    <div className="inline-flex rounded-md bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-800">
                                        FINANCIAL INTEGRITY
                                    </div>
                                    <h3 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                        Cash Shift Control & Manager Security PINs
                                    </h3>
                                    <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                        Hold staff accountable with blind till closes. Require cashiers to count the actual drawer cash before the system reveals expected totals. Audited logs track every void, payout, and discount.
                                    </p>
                                    <ul className="space-y-3 text-xs sm:text-sm text-stone-700">
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Opening and closing shift float declarations
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Audited mid-shift cash pay-ins and pay-outs
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            Manager PIN required for voids, comp meals, and drawer pops
                                        </li>
                                    </ul>
                                    <div className="pt-2">
                                        <Link
                                            href="/features/cash-management"
                                            className="inline-flex items-center gap-2 text-sm font-bold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                        >
                                            <span>Explore Cash & Shift Security</span>
                                            <span>→</span>
                                        </Link>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6 space-y-4">
                                    <div className="flex justify-between items-center text-xs pb-3 border-b border-stone-200">
                                        <span className="font-mono font-bold text-stone-700">SHIFT RECONCILIATION AUDIT</span>
                                        <span className="text-emerald-700 font-bold">Variance: {currencySymbol}0.00</span>
                                    </div>
                                    <div className="space-y-2 text-xs font-mono">
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span className="text-stone-600 font-sans">Opening Float:</span>
                                            <span>{currencySymbol}250.00</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span className="text-stone-600 font-sans">Cash Orders Collected:</span>
                                            <span>{currencySymbol}684.00</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span className="text-stone-600 font-sans">Mid-Shift Payout (Ice Delivery):</span>
                                            <span className="text-rose-600">-{currencySymbol}24.00</span>
                                        </div>
                                        <div className="flex justify-between py-1 border-b border-stone-200/60">
                                            <span className="text-stone-600 font-sans">Expected Drawer Total:</span>
                                            <span>{currencySymbol}910.00</span>
                                        </div>
                                        <div className="flex justify-between py-1.5 bg-emerald-50 px-2 rounded-lg text-emerald-900 font-bold">
                                            <span className="font-sans">Counted Drawer Cash:</span>
                                            <span>{currencySymbol}910.00 (Balanced)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* HOW IT WORKS: 4-STEP ONBOARDING JOURNEY                                   */}
            {/* ========================================================================= */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="03 / SIMPLE ONBOARDING"
                        title="Up and Running in 4 Clear Steps"
                        description="No three-week enterprise installations or mandatory consultant visits. Set up your restaurant step by step on your own schedule."
                    />

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8">
                        {/* Step 1 */}
                        <div className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B271F] text-white font-mono font-bold text-lg">
                                01
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900">
                                Create Your Account
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Enter your business name and email. Your tenant-isolated restaurant workspace is instantly provisioned with a 14-day trial.
                            </p>
                        </div>

                        {/* Step 2 */}
                        <div className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B271F] text-white font-mono font-bold text-lg">
                                02
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900">
                                Configure Restaurant
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Set your local currency, tax rates (inclusive or exclusive), service charge %, opening hours, and receipt footer message.
                            </p>
                        </div>

                        {/* Step 3 */}
                        <div className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B271F] text-white font-mono font-bold text-lg">
                                03
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900">
                                Add Menu & Tables
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Input your categories, dish variants, and dining table numbers. Link ingredient recipes whenever you are ready for stock tracking.
                            </p>
                        </div>

                        {/* Step 4 */}
                        <div className="space-y-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10B981] text-white font-mono font-bold text-lg">
                                04
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900">
                                Ring Your First Sale
                            </h3>
                            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Open a register shift with your float, ring up orders on any tablet or computer, and watch live sales update across reports.
                            </p>
                        </div>
                    </div>

                    <div className="mt-12 text-center">
                        <Button
                            href="/register"
                            variant="primary"
                            size="md"
                        >
                            Start Step 1: Create Account Free
                        </Button>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* TAILORED SOLUTIONS FOR DIFFERENT VENUE TYPES                              */}
            {/* ========================================================================= */}
            <section className="py-20 sm:py-28 bg-[#FBFBF9] border-t border-stone-200/80">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="04 / USE CASES"
                        title="Tailored to How Your Kitchen Operates"
                        description="Restrly adapts to your service model. Never force table management onto a cloud kitchen, or lose speed in a high-volume café."
                    />

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <Link
                            href="/solutions/restaurants"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                DINE-IN SERVICE
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Full-Service & Casual Dining
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Multi-course pacing, floor table occupancy, split checks, and seamless communication between waitstaff and kitchen stations.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See restaurant workflow</span>
                                <span>→</span>
                            </div>
                        </Link>

                        <Link
                            href="/solutions/cafes"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                HIGH VELOCITY
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Cafés, Coffee Bars & Bakeries
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Rapid modifier selections (milks, roasts, syrups), morning peak speed, customer loyalty point accrual, and pastry batch wastage.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See café workflow</span>
                                <span>→</span>
                            </div>
                        </Link>

                        <Link
                            href="/solutions/cloud-kitchens"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                DELIVERY ONLY
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Cloud & Ghost Kitchens
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Zero table clutter. Run multi-brand virtual menus from a single kitchen, coordinate high-volume dispatch, and track prep times.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See ghost kitchen workflow</span>
                                <span>→</span>
                            </div>
                        </Link>

                        <Link
                            href="/solutions/quick-service-restaurants"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                COUNTER FIRST
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Quick Service (QSR) & Fast Casual
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Line-busting order entry, high-throughput cash registers, combo meals, and instant bump-bar kitchen tickets.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See QSR workflow</span>
                                <span>→</span>
                            </div>
                        </Link>

                        <Link
                            href="/solutions/takeaway-delivery"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                LOGISTICS & PICKUP
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Takeaway & Delivery Outlets
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Delivery zone fees, minimum order rules, driver dispatch tickets, customer phone lookups, and scheduled pickup orders.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See delivery workflow</span>
                                <span>→</span>
                            </div>
                        </Link>

                        <Link
                            href="/solutions/multi-location-restaurants"
                            className="group block rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-md transition-all"
                        >
                            <div className="text-xs font-mono font-bold uppercase text-[#10B981] mb-2">
                                MULTI-UNIT
                            </div>
                            <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F]">
                                Multi-Location Groups & Chains
                            </h3>
                            <p className="mt-2 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                Centralized catalog management, inter-branch stock transfers, consolidated sales reports, and branch-specific manager PINs.
                            </p>
                            <div className="mt-4 text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981] flex items-center gap-1">
                                <span>See multi-branch workflow</span>
                                <span>→</span>
                            </div>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* HARDWARE, INTEGRATIONS & SECURITY                                         */}
            {/* ========================================================================= */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div className="space-y-6">
                            <div className="inline-flex items-center gap-2 rounded-full px-3.5 py-1 text-[11px] font-mono uppercase tracking-widest font-semibold bg-[#0B271F]/5 text-[#0B271F] border border-[#0B271F]/10">
                                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                <span>HARDWARE AGNOSTIC & SECURE</span>
                            </div>

                            <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#0B271F] sm:text-4xl">
                                Zero Proprietary Hardware Lock-In. Total Data Isolation.
                            </h2>

                            <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
                                Unlike legacy POS vendors that force you to buy expensive proprietary terminals, Restrly runs in any modern browser on hardware you already own.
                            </p>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="rounded-xl border border-stone-200 p-4">
                                    <div className="font-bold text-stone-900 text-sm">Any Modern Screen</div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        iPads, Android tablets, touch monitors, Mac, PC, or Linux.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-stone-200 p-4">
                                    <div className="font-bold text-stone-900 text-sm">ESC/POS Printers</div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Standard USB, Ethernet, and Bluetooth thermal receipt printers.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-stone-200 p-4">
                                    <div className="font-bold text-stone-900 text-sm">Tenant Isolation</div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Strict database-level tenant scoping prevents any cross-tenant data leaks.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-stone-200 p-4">
                                    <div className="font-bold text-stone-900 text-sm">Automated Backups</div>
                                    <p className="mt-1 text-xs text-stone-500">
                                        Encrypted database snapshots with verified restore procedures.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Security & Reliability Infographic */}
                        <div className="rounded-3xl border border-stone-200/90 bg-[#0B271F] p-8 sm:p-10 text-white space-y-6 shadow-xl">
                            <div className="flex items-center justify-between pb-4 border-b border-white/10">
                                <div className="font-mono text-xs text-[#10B981] font-bold">
                                    SYSTEM ARCHITECTURE SPECIFICATION
                                </div>
                                <span className="rounded bg-white/10 px-2 py-0.5 text-[11px] font-mono text-stone-300">
                                    SOC-2 ALIGNED
                                </span>
                            </div>

                            <div className="space-y-4 text-xs font-mono text-stone-300">
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-stone-400">Database Multi-Tenancy:</span>
                                    <span className="text-white font-bold">Strict BelongsToTenant Scoping</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-stone-400">Payment Gateway Support:</span>
                                    <span className="text-white font-bold">SSLCommerz, Stripe, Cash, Terminals</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-stone-400">Manager Security Overrides:</span>
                                    <span className="text-white font-bold">Hashed PIN + Audited Event Trail</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-stone-400">Document Generation:</span>
                                    <span className="text-white font-bold">Native Thermal DomPDF Receipts</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-white/10">
                                    <span className="text-stone-400">Readiness Probe:</span>
                                    <span className="text-[#10B981] font-bold">Realtime /health Probe Active</span>
                                </div>
                            </div>

                            <div className="pt-2 text-xs text-stone-400 leading-relaxed font-sans">
                                Restrly guarantees complete operational data sovereignty. You own your customer relationships, sales histories, and menu recipes forever. Export anytime with one click.
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* TRANSPARENT PRICING PREVIEW                                               */}
            {/* ========================================================================= */}
            <section className="py-20 sm:py-28 bg-[#FBFBF9] border-t border-stone-200/80">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="05 / TRANSPARENT PRICING"
                        title="Simple, Predictable Plans"
                        description="Start with our 14-day free trial. Choose monthly flexibility or save with annual billing. No setup fees, no hidden hardware contracts."
                    />

                    {/* Annual Billing Switcher */}
                    <div className="mt-10 flex items-center justify-center gap-3">
                        <span className={`text-xs sm:text-sm font-semibold ${!annualBilling ? 'text-[#0B271F]' : 'text-stone-500'}`}>
                            Monthly Billing
                        </span>
                        <button
                            type="button"
                            onClick={() => setAnnualBilling(!annualBilling)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                annualBilling ? 'bg-[#10B981]' : 'bg-stone-300'
                            }`}
                        >
                            <span
                                className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                    annualBilling ? 'translate-x-5' : 'translate-x-0'
                                }`}
                            />
                        </button>
                        <span className={`text-xs sm:text-sm font-semibold flex items-center gap-1.5 ${annualBilling ? 'text-[#0B271F]' : 'text-stone-500'}`}>
                            <span>Annual Billing</span>
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                SAVE ~2 MONTHS
                            </span>
                        </span>
                    </div>

                    {/* Pricing Cards Grid */}
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const planCurrency = plan.currency || platformCurrency;
                            const symbol = getCurrencySymbol(planCurrency);
                            const price = annualBilling ? Math.round(plan.price_yearly / 12) : plan.price_monthly;
                            const billedAmount = annualBilling ? plan.price_yearly : plan.price_monthly;

                            return (
                                <div
                                    key={plan.id}
                                    className={`relative flex flex-col rounded-3xl p-8 transition-all ${
                                        plan.is_popular
                                            ? 'border-2 border-[#10B981] bg-white shadow-xl'
                                            : 'border border-stone-200/90 bg-white/80 shadow-xs hover:border-stone-300'
                                    }`}
                                >
                                    {plan.is_popular && (
                                        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-[#10B981] px-3.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider text-white shadow-xs">
                                            MOST POPULAR FOR BUSY RESTAURANTS
                                        </div>
                                    )}

                                    <div>
                                        <h3 className="font-display text-2xl font-bold text-stone-900">
                                            {plan.name}
                                        </h3>
                                        <p className="mt-2 text-xs text-stone-500 min-h-[36px]">
                                            {plan.description}
                                        </p>

                                        <div className="mt-6 flex items-baseline gap-1">
                                            <span className="font-mono text-4xl sm:text-5xl font-extrabold text-[#0B271F]">
                                                {symbol}{price}
                                            </span>
                                            <span className="text-xs text-stone-500 font-medium">/ month</span>
                                        </div>
                                        <div className="mt-1 text-[11px] font-mono text-stone-400">
                                            {annualBilling ? `Billed ${symbol}${billedAmount}/yr annually` : 'Billed monthly'}
                                        </div>
                                    </div>

                                    {/* Plan Entitlements & Limits */}
                                    <div className="mt-6 pt-6 border-t border-stone-100 space-y-3 text-xs text-stone-700 flex-1">
                                        <div className="font-semibold text-stone-900 text-xs">
                                            Usage Limits:
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>
                                                {plan.limits.branches ? `${plan.limits.branches} Branch Location` : 'Unlimited Branch Locations'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>
                                                {plan.limits.users ? `Up to ${plan.limits.users} Staff User Accounts` : 'Unlimited Staff User Accounts'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>
                                                {plan.limits.orders_this_month
                                                    ? `Up to ${plan.limits.orders_this_month.toLocaleString()} orders / month`
                                                    : 'Unlimited Monthly Orders'}
                                            </span>
                                        </div>

                                        <div className="pt-2 font-semibold text-stone-900 text-xs">
                                            Included Modules:
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>Point of Sale (POS Terminal)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>Kitchen Display System (KDS)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                            <span>Daily Shift Reconciliations & Reports</span>
                                        </div>

                                        {plan.slug !== 'starter' && (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                                    <span>Table & Dining Area Floorplan</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                                    <span>Recipe Bill of Materials & Inventory</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                                    <span>Supplier Purchase Orders (PO)</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                                                    <span>Food Waste & Loss Log</span>
                                                </div>
                                            </>
                                        )}

                                        {plan.slug === 'business' && (
                                            <div className="flex items-center gap-2 text-[#0B271F] font-semibold">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#0B271F]" />
                                                <span>Inter-Branch Stock Transfers & Central Hub</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-stone-100">
                                        <Button
                                            href="/register"
                                            variant={plan.is_popular ? 'accent' : 'primary'}
                                            size="md"
                                            className="w-full"
                                            onClick={() =>
                                                trackConversion('plan_selected', {
                                                    plan: plan.slug,
                                                    billing: annualBilling ? 'yearly' : 'monthly',
                                                })
                                            }
                                        >
                                            Start 14-Day Free Trial
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-12 text-center text-xs text-stone-500">
                        Need a full enterprise rollout or 10+ locations?{' '}
                        <Link href="/contact" className="font-bold text-[#0B271F] underline underline-offset-4 hover:text-[#10B981]">
                            Talk to our restaurant solutions team →
                        </Link>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* FREQUENTLY ASKED QUESTIONS (ACCORDIONS)                                   */}
            {/* ========================================================================= */}
            <section className="border-t border-stone-200/80 bg-white py-20 sm:py-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="06 / COMMON QUESTIONS"
                        title="Frequently Asked Questions"
                        description="Clear, honest answers about hardware compatibility, offline tolerance, and onboarding."
                    />

                    <div className="mt-12 space-y-4">
                        {faqs.map((faq, idx) => (
                            <div
                                key={idx}
                                className="rounded-2xl border border-stone-200 bg-stone-50/70 overflow-hidden transition-all"
                            >
                                <button
                                    type="button"
                                    onClick={() => {
                                        const next = openFaq === idx ? null : idx;
                                        setOpenFaq(next);
                                        if (next !== null) {
                                            trackConversion('faq_toggled', { faq_question: faq.q });
                                        }
                                    }}
                                    className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-display font-bold text-stone-900 text-sm sm:text-base hover:text-[#0B271F]"
                                >
                                    <span>{faq.q}</span>
                                    <span className="ml-4 font-mono text-stone-400 text-lg">
                                        {openFaq === idx ? '−' : '+'}
                                    </span>
                                </button>

                                {openFaq === idx && (
                                    <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-200/60 pt-4">
                                        {faq.a}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* FINAL CONVERSION BANNER                                                   */}
            {/* ========================================================================= */}
            <section className="relative overflow-hidden bg-[#0B271F] py-20 sm:py-28 text-white">
                <div className="pointer-events-none absolute inset-0 -z-10 flex justify-center">
                    <div className="h-[400px] w-[900px] bg-gradient-to-r from-[#10B981]/20 via-[#165B47]/20 to-[#071F18]/40 blur-3xl opacity-60" />
                </div>

                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1 text-xs font-mono font-bold uppercase tracking-wider text-[#10B981]">
                        <span>GET STARTED TODAY</span>
                    </div>

                    <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl leading-[1.12]">
                        Ready to Run Your Restaurant
                        <br />
                        With Complete Clarity?
                    </h2>

                    <p className="mx-auto max-w-xl text-stone-300 text-sm sm:text-lg leading-relaxed">
                        Join modern dining establishments, busy cafes, and restaurant groups operating on Restrly. Your 14-day free trial starts immediately with zero payment required.
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                        <Button
                            href="/register"
                            variant="accent"
                            size="lg"
                            className="text-base px-9 py-4 font-bold"
                            onClick={() => trackConversion('hero_cta_clicked', { cta: 'final_cta_trial' })}
                        >
                            Start 14-Day Free Trial
                        </Button>

                        <Button
                            href="/contact"
                            variant="secondary"
                            size="lg"
                            className="text-base px-7 py-4"
                            onClick={() => trackConversion('hero_cta_clicked', { cta: 'final_cta_contact' })}
                        >
                            Talk to a Specialist
                        </Button>
                    </div>

                    <div className="pt-4 text-xs font-mono text-stone-400">
                        Setup takes less than 5 minutes · No proprietary hardware · Cancel anytime
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
