import { BrandSquares, CountUp, FaqSection, MarketingLayout, PricingPlans, Reveal, getCurrencySymbol, trackConversion } from '@/Components/Marketing';
import HeroQrScene from '@/Components/Marketing/Journey/HeroQrScene';
import JourneySection from '@/Components/Marketing/Journey/JourneySection';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/Components/ui/accordion';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/Card';
import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    Boxes,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    ChefHat,
    ChevronRight,
    Clock,
    CreditCard,
    DollarSign,
    Flame,
    HelpCircle,
    Layers,
    LayoutGrid,
    Minus,
    Monitor,
    Plus,
    Printer,
    Receipt,
    RefreshCw,
    Shield,
    Sparkles,
    Trash2,
    Users,
    Utensils,
    UtensilsCrossed,
    Wine,
    Zap,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

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
    plans?: Plan[];
    platformCurrency?: string;
    regionCurrency?: string;
    regionLabel?: string;
}

interface MenuItem {
    id: string;
    name: string;
    desc: string;
    price: number;
    tags: string[];
    category: 'mains' | 'small_plates' | 'cellar' | 'cocktails';
}

const MENU_ITEMS: MenuItem[] = [
    {
        id: 'ribeye',
        name: 'Prime Ribeye 45-Day Dry Aged',
        desc: 'Bone marrow jus, charred shallot, smoked salt',
        price: 68.0,
        tags: ['Woodfire', 'Med Rare'],
        category: 'mains',
    },
    {
        id: 'cod',
        name: 'Line-Caught Black Cod',
        desc: 'White miso emulsion, charred gai lan, sesame',
        price: 54.0,
        tags: ['Gluten Free'],
        category: 'mains',
    },
    {
        id: 'pasta',
        name: 'Morel Mushroom Tagliolini',
        desc: 'Aged parmigiano-reggiano, cultured thyme butter',
        price: 38.0,
        tags: ['Handmade Pasta'],
        category: 'mains',
    },
    {
        id: 'pork',
        name: 'Heritage Pork Chop',
        desc: 'Smoked apple gastrique, braised mustard greens',
        price: 46.0,
        tags: ['Heritage Breed'],
        category: 'mains',
    },
    {
        id: 'burrata',
        name: 'Burrata & Charred Peaches',
        desc: 'Wild mountain thyme, 25-yr Modena balsamico',
        price: 24.0,
        tags: ['Vegetarian'],
        category: 'small_plates',
    },
    {
        id: 'tartare',
        name: 'Hand-Cut Wagyu Tartare',
        desc: 'Confit egg yolk, caperberry, grilled sourdough',
        price: 26.0,
        tags: ['Signature'],
        category: 'small_plates',
    },
    {
        id: 'barolo',
        name: '2018 Barolo Serralunga d’Alba',
        desc: 'Piedmont, Nebbiolo 750ml, cellar temperature',
        price: 145.0,
        tags: ['Cellar Reserve'],
        category: 'cellar',
    },
    {
        id: 'fashion',
        name: 'Smoked Cherry Old Fashioned',
        desc: 'Small batch rye, charred cherry bitters, orange twist',
        price: 19.0,
        tags: ['Cocktail'],
        category: 'cocktails',
    },
];

interface TableData {
    id: string;
    label: string;
    guests: number;
    location: string;
    status: 'Active' | 'Course 2' | 'Holding' | 'Seated';
    badgeVariant: 'default' | 'secondary' | 'outline';
    total: number;
}

const DEMO_TABLES: TableData[] = [
    {
        id: 'tbl_14',
        label: 'TBL 14',
        guests: 3,
        location: 'Patio Terrace',
        status: 'Active',
        badgeVariant: 'default',
        total: 184.5,
    },
    {
        id: 'tbl_08',
        label: 'TBL 08',
        guests: 4,
        location: 'Main Salon',
        status: 'Course 2',
        badgeVariant: 'secondary',
        total: 310.0,
    },
    {
        id: 'bar_402',
        label: 'BAR #402',
        guests: 2,
        location: 'Lounge Rail',
        status: 'Holding',
        badgeVariant: 'outline',
        total: 64.0,
    },
    {
        id: 'patio_03',
        label: 'PATIO 03',
        guests: 5,
        location: 'Garden Pergola',
        status: 'Seated',
        badgeVariant: 'secondary',
        total: 0.0,
    },
];

export default function Welcome({
    canLogin = true,
    canRegister = true,
    plans = [],
    platformCurrency = 'USD',
    regionCurrency,
    regionLabel,
}: WelcomeProps) {
    // The visitor's billing currency takes precedence for any illustrative money.
    const displayCurrency = regionCurrency ?? platformCurrency;
    // POS Terminal Interactive State
    const [selectedTable, setSelectedTable] = useState<TableData>(DEMO_TABLES[0]);
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | 'mains' | 'small_plates' | 'cellar' | 'cocktails'
    >('all');
    const [cart, setCart] = useState<{ item: MenuItem; count: number }[]>([
        { item: MENU_ITEMS[0], count: 2 },
        { item: MENU_ITEMS[4], count: 1 },
        { item: MENU_ITEMS[7], count: 2 },
    ]);
    const [orderFired, setOrderFired] = useState(false);
    const [activeStage, setActiveStage] = useState<number>(1);
    const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

    const handleAddToCart = (item: MenuItem) => {
        setCart((prev) => {
            const exists = prev.find((entry) => entry.item.id === item.id);
            if (exists) {
                return prev.map((entry) =>
                    entry.item.id === item.id ? { ...entry, count: entry.count + 1 } : entry
                );
            }
            return [...prev, { item, count: 1 }];
        });
        setOrderFired(false);
    };

    const handleUpdateQuantity = (itemId: string, delta: number) => {
        setCart((prev) => {
            return prev
                .map((entry) => {
                    if (entry.item.id === itemId) {
                        const newCount = entry.count + delta;
                        return newCount > 0 ? { ...entry, count: newCount } : null;
                    }
                    return entry;
                })
                .filter(Boolean) as { item: MenuItem; count: number }[];
        });
        setOrderFired(false);
    };

    const subtotal = useMemo(() => {
        return cart.reduce((acc, entry) => acc + entry.item.price * entry.count, 0);
    }, [cart]);

    const tax = subtotal * 0.08875;
    const total = subtotal + tax;

    const filteredMenu = useMemo(() => {
        if (selectedCategory === 'all') return MENU_ITEMS;
        return MENU_ITEMS.filter((i) => i.category === selectedCategory);
    }, [selectedCategory]);

    const handleFireTicket = () => {
        if (cart.length === 0) return;
        setOrderFired(true);
        setTimeout(() => setOrderFired(false), 4500);
    };

    return (
        <MarketingLayout>
            <Head>
                <title>Touch Dine — Complete Restaurant Management Software & POS</title>
                <meta
                    name="description"
                    content="Touch Dine is the modern restaurant management system built for high-velocity operations: sub-second POS, kitchen display system, table management, and inventory."
                />
            </Head>

            <div className="flex flex-col w-full">
                {/* 1. HERO SECTION */}
                <section className="relative w-full overflow-hidden bg-[#F3F2F2] px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-20">
                    <div aria-hidden className="mk-grid pointer-events-none absolute inset-0" />
                    <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.02fr_1fr] lg:gap-10">
                        <div className="animate-fade-up text-left">
                            <span className="mk-eyebrow">Smarter restaurant management</span>
                            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
                                Your Restaurant.
                                <br />
                                Every Order.
                                <br />
                                <span className="text-[#EC3013]">Under Control.</span>
                            </h1>
                            <p className="mt-6 max-w-xl text-lg leading-relaxed text-stone-600">
                                Simplify restaurant operations with Touch Dine. Let customers order directly from their tables, streamline kitchen workflows, and manage your restaurant from one connected platform.
                            </p>
                            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row">
                                <Link
                                    href="/contact?topic=demo"
                                    onClick={() => trackConversion('hero_cta_clicked', { location: 'hero_book_demo' })}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#EC3013] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#D02710] active:bg-[#A81E0C] sm:w-auto"
                                >
                                    <span>Book a Demo</span>
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                                <a
                                    href="#how-it-works"
                                    onClick={() => trackConversion('hero_cta_clicked', { location: 'hero_how_it_works' })}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-800 shadow-xs transition-colors hover:bg-stone-50 sm:w-auto"
                                >
                                    <span>Explore How It Works</span>
                                </a>
                            </div>
                            <p className="mt-5 text-[14px] font-medium text-stone-500">
                                Prefer to try it yourself?{' '}
                                <Link
                                    href="/register"
                                    onClick={() => trackConversion('hero_cta_clicked', { location: 'hero_start_trial' })}
                                    className="font-semibold text-[#EC3013] underline-offset-2 hover:underline"
                                >
                                    Start the 14-day free trial
                                </Link>
                            </p>
                        </div>
                        <HeroQrScene currency={getCurrencySymbol(displayCurrency)} />
                    </div>
                </section>

                {/* 1b. CUSTOMER JOURNEY */}
                <JourneySection currency={getCurrencySymbol(displayCurrency)} />

                {/* STATS STRIP */}
                <section className="w-full border-y border-stone-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
                    <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-8 text-center lg:grid-cols-4">
                        {[
                            { to: 11, suffix: '', label: 'Connected modules' },
                            { to: 14, suffix: '-day', label: 'Free trial' },
                            { to: 0, prefix: '$', label: 'Hardware lock-in' },
                            { to: 100, suffix: '%', label: 'Browser based' },
                        ].map((stat) => (
                            <div key={stat.label}>
                                <dt className="order-2 mt-1 text-sm text-stone-600">{stat.label}</dt>
                                <dd className="text-4xl font-extrabold tracking-tight text-[#201E1D]">
                                    <CountUp to={stat.to} prefix={stat.prefix} suffix={stat.suffix} />
                                </dd>
                            </div>
                        ))}
                    </dl>
                </section>

                {/* 2. CORE CAPABILITIES (SHADCN CARD GRID) */}
                <Reveal as="section" className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-50 border-y border-stone-200">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#EC3013] block mb-2">
                                Complete Architecture
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                Every restaurant station in harmony
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                Eliminate disjointed point solutions. Touch Dine coordinates orders, kitchen stations, floor layouts, and multi-branch inventory.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: POS */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <Monitor className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Point of Sale (POS)
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Fast touch register with offline resilience
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Process high-volume shifts with customizable quick-keys, modifier groupings, barcode scanning, and instant receipt printing. Works even if your internet goes offline.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features/restaurant-pos"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        POS features &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 2: KDS */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <ChefHat className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Kitchen Display System (KDS)
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Paperless station routing &amp; pacing
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Route appetizers, mains, and desserts to distinct prep stations. Monitor ticket elapsed times with automatic visual alerts and coursing pacing.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features/kitchen-display"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        KDS features &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 3: Floor & Tables */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <LayoutGrid className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Table &amp; Floor Management
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Live visual dining room status
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Design multi-zone floor maps matching your dining room, patio, and bar. Track occupancy, server section assignments, and turn countdowns in real time.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features/table-management"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        Floor management &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 4: Menu & Modifiers */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <UtensilsCrossed className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Menu &amp; Modifier Controls
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Dynamic pricing &amp; 86 management
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Configure nested modifiers, temperature specs, and allergy warnings. 86 sold-out ingredients with one click across all terminals and QR dining menus.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        Menu management &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 5: Inventory */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <Boxes className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Recipe &amp; Stock Ledger
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Automated ingredient depletion
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Link menu items directly to raw ingredient batches. Every order automatically deducts stock, triggers low-stock reorder thresholds, and calculates food cost margins.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features/inventory-management"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        Inventory controls &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 6: Multi-Branch Analytics */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#EC3013]/10 text-[#EC3013] flex items-center justify-center mb-2">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <CardTitle className="text-lg font-bold text-stone-900">
                                        Multi-Location Intelligence
                                    </CardTitle>
                                    <CardDescription className="text-stone-600 text-xs">
                                        Centralized branch management
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="text-sm text-stone-600 leading-relaxed">
                                    Manage multiple restaurant locations from a single dashboard. Compare branch performance, sync standard menus, and aggregate purchasing power effortlessly.
                                </CardContent>
                                <CardFooter className="pt-0">
                                    <Link
                                        href="/features/multi-branch-management"
                                        className="text-xs font-semibold text-[#EC3013] hover:underline flex items-center gap-1"
                                    >
                                        Multi-branch hub &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </Reveal>

                {/* 3. HOW IT WORKS / OPERATIONAL FLOW */}
                <Reveal as="section" className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#EC3013] block mb-2">
                                Operational Flow
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                How hospitality moves through Touch Dine
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                From guest seating to kitchen pacing and end-of-day reconciliation.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Step 1 */}
                            <div className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                                <div className="w-8 h-8 rounded-full bg-[#EC3013] text-white flex items-center justify-center font-bold text-xs">
                                    01
                                </div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Seating &amp; Order Intake
                                </h3>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                    Servers select tables on interactive floor plans, take orders with customizable modifier prompts, or guests order directly via table QR codes.
                                </p>
                            </div>

                            {/* Step 2 */}
                            <div className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                                    02
                                </div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Instant Kitchen Routing
                                </h3>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                    Orders route to individual station screens (Grill, Saute, Bar) in milliseconds. Automated timers pace appetizers and entrees to prevent rush bottlenecking.
                                </p>
                            </div>

                            {/* Step 3 */}
                            <div className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                                    03
                                </div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Split-by-Guest Settlement
                                </h3>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                    Tender payments table-side or at counter stations. Split checks by seat, item, or custom amount without holding up table turnover.
                                </p>
                            </div>

                            {/* Step 4 */}
                            <div className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                                <div className="w-8 h-8 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-xs">
                                    04
                                </div>
                                <h3 className="text-base font-bold text-stone-900">
                                    Auto Stock &amp; Reports
                                </h3>
                                <p className="text-xs text-stone-600 leading-relaxed">
                                    Every settled ticket deducts ingredient inventory in grams. End-of-shift reports reconcile cash drawers, staff tips, and export to accounting systems.
                                </p>
                            </div>
                        </div>
                    </div>
                </Reveal>

                {/* 4. INTERACTIVE POS SANDBOX TERMINAL */}
                <section
                    className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-50 border-t border-stone-200"
                    id="terminal-demo"
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#EC3013] block mb-2">
                                Hands-On Sandbox
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                Test the live register interface
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                Click menu items below to build a check, select a table, and fire a ticket to the virtual kitchen display.
                            </p>
                        </div>

                        {/* Interactive Register Frame */}
                        <div className="bg-white rounded-2xl border border-stone-200 shadow-md overflow-hidden">
                            {/* Terminal Header */}
                            <div className="bg-stone-900 text-stone-200 px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-3">
                                    <span className="bg-[#EC3013] text-white px-2 py-0.5 rounded font-mono font-bold text-[11px]">
                                        REGISTER #01
                                    </span>
                                    <span className="font-semibold text-white">
                                        Active Order &bull; Table: {selectedTable.label} ({selectedTable.guests} guests)
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-stone-400 font-mono text-[11px]">
                                    <span>DRAWER: $1,450.00</span>
                                    <span className="text-emerald-400">&bull; SYSTEM READY</span>
                                </div>
                            </div>

                            {/* Main Register Body */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">
                                {/* Left Side: Category tabs & Item buttons (7 cols) */}
                                <div className="lg:col-span-7 p-6 border-r border-stone-200 space-y-6">
                                    {/* Table Selector Pills */}
                                    <div className="space-y-2">
                                        <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                            Select Active Table:
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {DEMO_TABLES.map((table) => (
                                                <button
                                                    key={table.id}
                                                    type="button"
                                                    onClick={() => setSelectedTable(table)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                        selectedTable.id === table.id
                                                            ? 'bg-[#EC3013] text-white border-[#EC3013]'
                                                            : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                                                    }`}
                                                >
                                                    {table.label} ({table.guests}p)
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Category Filter */}
                                    <div className="flex flex-wrap gap-2 border-b border-stone-200 pb-4">
                                        {[
                                            { id: 'all', label: 'All Items' },
                                            { id: 'mains', label: 'Mains' },
                                            { id: 'small_plates', label: 'Small Plates' },
                                            { id: 'cellar', label: 'Wine & Cellar' },
                                            { id: 'cocktails', label: 'Cocktails' },
                                        ].map((cat) => (
                                            <button
                                                key={cat.id}
                                                type="button"
                                                onClick={() => setSelectedCategory(cat.id as any)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                                    selectedCategory === cat.id
                                                        ? 'bg-stone-900 text-white'
                                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                                }`}
                                            >
                                                {cat.label}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Item Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
                                        {filteredMenu.map((item) => (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => handleAddToCart(item)}
                                                className="group p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-[#EC3013] text-left transition-all hover:shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="font-semibold text-stone-900 text-sm group-hover:text-[#EC3013]">
                                                            {item.name}
                                                        </span>
                                                        <span className="font-mono text-sm font-bold text-stone-900 shrink-0">
                                                            ${item.price.toFixed(2)}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-stone-500 mt-1 line-clamp-1">
                                                        {item.desc}
                                                    </p>
                                                </div>

                                                <div className="flex items-center gap-1.5 mt-3">
                                                    {item.tags.map((t) => (
                                                        <span
                                                            key={t}
                                                            className="text-[10px] bg-stone-200/70 text-stone-700 px-1.5 py-0.5 rounded"
                                                        >
                                                            {t}
                                                        </span>
                                                    ))}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Right Side: Current Ticket Summary (5 cols) */}
                                <div className="lg:col-span-5 p-6 bg-stone-50 flex flex-col justify-between">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                                            <div>
                                                <span className="text-xs font-bold text-stone-900 block">
                                                    Current Check: {selectedTable.label}
                                                </span>
                                                <span className="text-[11px] text-stone-500">
                                                    Server: Staff ID #04 &bull; Dine-In
                                                </span>
                                            </div>
                                            {cart.length > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setCart([])}
                                                    className="text-xs text-stone-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Clear
                                                </button>
                                            )}
                                        </div>

                                        {/* Cart Items List */}
                                        <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
                                            {cart.length === 0 ? (
                                                <div className="text-center py-10 text-stone-400 text-xs">
                                                    <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                                    No items added yet. Click menu items to begin.
                                                </div>
                                            ) : (
                                                cart.map((entry) => (
                                                    <div
                                                        key={entry.item.id}
                                                        className="p-2.5 rounded-lg bg-white border border-stone-200 flex items-center justify-between gap-3 text-xs"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="font-semibold text-stone-900 truncate">
                                                                {entry.item.name}
                                                            </div>
                                                            <div className="text-stone-500 text-[11px] font-mono">
                                                                ${entry.item.price.toFixed(2)} each
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateQuantity(entry.item.id, -1)
                                                                }
                                                                className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-6 text-center font-bold text-stone-900 font-mono">
                                                                {entry.count}
                                                            </span>
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    handleUpdateQuantity(entry.item.id, 1)
                                                                }
                                                                className="w-6 h-6 rounded bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>

                                                        <div className="font-mono font-bold text-stone-900 w-16 text-right">
                                                            ${(entry.item.price * entry.count).toFixed(2)}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Financial Calculation & Action */}
                                    <div className="pt-4 border-t border-stone-200 space-y-3 mt-4">
                                        <div className="space-y-1.5 text-xs text-stone-600">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span className="font-mono font-semibold text-stone-900">
                                                    ${subtotal.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tax (8.875%):</span>
                                                <span className="font-mono font-semibold text-stone-900">
                                                    ${tax.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm font-bold text-stone-900 pt-1.5 border-t border-stone-200">
                                                <span>Total Due:</span>
                                                <span className="font-mono text-base text-[#EC3013]">
                                                    ${total.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {orderFired ? (
                                            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                <span>Ticket fired to Kitchen KDS &bull; Stock auto-deducted</span>
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handleFireTicket}
                                                disabled={cart.length === 0}
                                                className="w-full bg-[#EC3013] hover:bg-[#D02710] active:bg-[#A81E0C] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Flame className="w-4 h-4" />
                                                <span>Fire Order to Kitchen ({cart.reduce((a, b) => a + b.count, 0)} items)</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. PRICING */}
                {plans.length > 0 && (
                <section id="pricing" className="w-full bg-white px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
                    <div className="mx-auto max-w-6xl">
                        <Reveal className="mx-auto mb-12 max-w-2xl text-center">
                            <span className="mk-eyebrow">Pricing</span>
                            <h2 className="mk-h2 mt-3">Pick a plan and start your free trial</h2>
                            <p className="mt-3 text-base text-stone-600">
                                Real prices, no hidden fees. Upgrade, downgrade or cancel whenever you like.
                            </p>
                        </Reveal>
                        <PricingPlans plans={plans} regionLabel={regionLabel} />
                    </div>
                </section>
                )}

                {/* 6. FAQ */}
                <FaqSection className="border-t border-stone-200 bg-[#F3F2F2]" />

                {/* 7. FINAL HIGH-CONVERSION SECTION */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-900 text-white">
                    <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#EC3013] text-white flex items-center justify-center mb-6">
                            <UtensilsCrossed className="w-6 h-6" />
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl leading-tight">
                            Ready to modernize your restaurant operations?
                        </h2>

                        <p className="text-stone-300 mt-4 max-w-xl text-base leading-relaxed">
                            Join leading restaurateurs who rely on Touch Dine for sub-second POS velocity, real-time kitchen coordination, and inventory precision.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#EC3013] hover:bg-[#D02710] active:bg-[#A81E0C] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors"
                            >
                                <span>Start 14-Day Free Trial</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/contact"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold px-6 py-3 rounded-lg border border-stone-700 transition-colors"
                            >
                                <span>Schedule Product Walkthrough</span>
                            </Link>
                        </div>

                        <p className="text-xs text-stone-400 mt-4">
                            No credit card required &bull; Immediate setup &bull; Cancel anytime
                        </p>
                    </div>
                </section>
            </div>
        </MarketingLayout>
    );
}
