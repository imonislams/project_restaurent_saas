import { MarketingLayout } from '@/Components/Marketing';
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
}: WelcomeProps) {
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
                <title>Restrly — Complete Restaurant Management Software & POS</title>
                <meta
                    name="description"
                    content="Restrly is the modern restaurant management system built for high-velocity operations: sub-second POS, kitchen display system, table management, and inventory."
                />
            </Head>

            <div className="flex flex-col w-full">
                {/* 1. HERO SECTION */}
                <section className="relative w-full px-4 sm:px-6 lg:px-8 pt-14 pb-20 lg:pt-20 lg:pb-28 overflow-hidden bg-white">
                    <div className="max-w-6xl mx-auto flex flex-col items-center text-center">
                        {/* Refined Eyebrow */}
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 mb-6">
                            <span className="w-2 h-2 rounded-full bg-[#B53014] animate-pulse" />
                            <span className="text-xs font-semibold tracking-wide uppercase text-stone-700">
                                Restrly OS &bull; Built for High-Performing Hospitality
                            </span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-900 max-w-4xl leading-[1.12]">
                            Run your restaurant with{' '}
                            <span className="text-[#B53014]">complete clarity &amp; speed</span>.
                        </h1>

                        {/* Subtitle */}
                        <p className="text-lg sm:text-xl text-stone-600 max-w-2xl mt-5 mb-8 leading-relaxed">
                            Sub-second POS terminals, live kitchen display routing, interactive floor tables, and recipe-level inventory control in one unified platform.
                        </p>

                        {/* Action Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full justify-center">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors"
                            >
                                <span>Start 14-Day Free Trial</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <a
                                href="#terminal-demo"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-800 text-sm font-semibold px-6 py-3 rounded-lg border border-stone-300 shadow-xs transition-colors"
                            >
                                <Zap className="w-4 h-4 text-[#B53014]" />
                                <span>Try Interactive Register</span>
                            </a>
                        </div>

                        {/* Factual Trust Indicators */}
                        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-8 text-xs text-stone-500 font-medium">
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                14-day zero-risk trial
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                No proprietary hardware lock-in
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                Fast menu import &amp; onboarding
                            </span>
                        </div>

                        {/* REALISTIC APPLICATION PREVIEW MOCKUP */}
                        <div className="w-full mt-14 rounded-2xl border border-stone-200 bg-stone-900 p-2 sm:p-3 shadow-xl">
                            {/* Device Frame Bar */}
                            <div className="flex items-center justify-between px-3 py-2 text-xs text-stone-400 border-b border-stone-800 mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-2.5 h-2.5 rounded-full bg-stone-700" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-stone-700" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-stone-700" />
                                    </div>
                                    <span className="text-stone-300 font-mono text-[11px] ml-2">
                                        Restrly POS Terminal &bull; Downtown Branch #01
                                    </span>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] font-mono">
                                    <span className="inline-flex items-center gap-1 text-emerald-400">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                        CLOUD SYNC ACTIVE
                                    </span>
                                    <span className="text-stone-400 hidden sm:inline">DRAWER: $1,840.00</span>
                                </div>
                            </div>

                            {/* Inner Application Screen */}
                            <div className="bg-white rounded-xl p-4 sm:p-6 text-left grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Left: Active Floor Tables Overview */}
                                <div className="lg:col-span-4 border-r-0 lg:border-r border-stone-200 pr-0 lg:pr-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                            Active Dining Room
                                        </span>
                                        <span className="text-xs font-medium text-stone-700 bg-stone-100 px-2 py-0.5 rounded">
                                            18 / 24 Seated
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2.5">
                                        {DEMO_TABLES.map((t) => (
                                            <div
                                                key={t.id}
                                                className={`p-3 rounded-lg border transition-all text-xs ${
                                                    selectedTable.id === t.id
                                                        ? 'border-[#B53014] bg-[#B53014]/5 shadow-xs'
                                                        : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between font-semibold text-stone-900">
                                                    <span>{t.label}</span>
                                                    <span className="text-[10px] text-stone-500">{t.guests}p</span>
                                                </div>
                                                <div className="mt-2 flex items-center justify-between text-[11px]">
                                                    <span className="text-stone-500">{t.status}</span>
                                                    <span className="font-semibold text-stone-900">
                                                        ${t.total.toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="pt-2 border-t border-stone-100 text-xs text-stone-500 space-y-2">
                                        <div className="flex justify-between">
                                            <span>Shift Volume:</span>
                                            <span className="font-semibold text-stone-900">84 Checks</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Average Ticket:</span>
                                            <span className="font-semibold text-stone-900">$57.40</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Avg Table Turn:</span>
                                            <span className="font-semibold text-stone-900">42 mins</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Center: Live Order Tickets & Coursing */}
                                <div className="lg:col-span-5 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                            Live Kitchen Expediter (KDS)
                                        </span>
                                        <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" /> 3 Tickets in Prep
                                        </span>
                                    </div>

                                    <div className="space-y-2.5">
                                        <div className="p-3 rounded-lg border border-stone-200 bg-white shadow-xs">
                                            <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100">
                                                <span className="font-bold text-stone-900">#104 &bull; TBL 14</span>
                                                <span className="text-[#B53014] font-semibold flex items-center gap-1">
                                                    <Flame className="w-3 h-3" /> Firing &bull; 4m
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs space-y-1 text-stone-700">
                                                <div className="flex justify-between">
                                                    <span>2x Prime Ribeye (Med-Rare)</span>
                                                    <span className="font-mono text-stone-500">GRILL</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>1x Morel Mushroom Tagliolini</span>
                                                    <span className="font-mono text-stone-500">PASTA</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-3 rounded-lg border border-stone-200 bg-white shadow-xs">
                                            <div className="flex justify-between items-center text-xs pb-2 border-b border-stone-100">
                                                <span className="font-bold text-stone-900">#102 &bull; TBL 08</span>
                                                <span className="text-amber-700 font-semibold flex items-center gap-1">
                                                    <Clock className="w-3 h-3" /> Course 2 &bull; 11m
                                                </span>
                                            </div>
                                            <div className="mt-2 text-xs space-y-1 text-stone-700">
                                                <div className="flex justify-between">
                                                    <span>1x Line-Caught Black Cod</span>
                                                    <span className="font-mono text-stone-500">FISH</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>1x Heritage Pork Chop</span>
                                                    <span className="font-mono text-stone-500">GRILL</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Shift Sales & Real-Time Performance */}
                                <div className="lg:col-span-3 border-l-0 lg:border-l border-stone-200 pl-0 lg:pl-6 space-y-4">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
                                        Shift Summary
                                    </span>
                                    <div className="p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-1">
                                        <span className="text-xs text-stone-500">Gross Sales Today</span>
                                        <div className="text-2xl font-extrabold text-stone-900">
                                            $4,820.50
                                        </div>
                                        <span className="text-[11px] text-emerald-600 font-medium">
                                            &uarr; 14% vs. last Friday
                                        </span>
                                    </div>

                                    <div className="space-y-2 text-xs">
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>Card Payments</span>
                                            <span className="font-semibold text-stone-900">$4,310.00</span>
                                        </div>
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>Cash Drawer</span>
                                            <span className="font-semibold text-stone-900">$510.50</span>
                                        </div>
                                        <div className="flex items-center justify-between text-stone-600">
                                            <span>Tax Collected</span>
                                            <span className="font-semibold text-stone-900">$428.14</span>
                                        </div>
                                    </div>

                                    <div className="pt-2">
                                        <Link
                                            href="/register"
                                            className="w-full text-center block text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white py-2 rounded-lg transition-colors"
                                        >
                                            Explore Platform
                                        </Link>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. CORE CAPABILITIES (SHADCN CARD GRID) */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-50 border-y border-stone-200">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                                Complete Architecture
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                Every restaurant station in harmony
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                Eliminate disjointed point solutions. Restrly coordinates orders, kitchen stations, floor layouts, and multi-branch inventory.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Card 1: POS */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        POS features &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 2: KDS */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        KDS features &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 3: Floor & Tables */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        Floor management &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 4: Menu & Modifiers */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        Menu management &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 5: Inventory */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        Inventory controls &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Card 6: Multi-Branch Analytics */}
                            <Card className="bg-white border-stone-200 hover:border-stone-300 transition-shadow hover:shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="w-10 h-10 rounded-lg bg-[#B53014]/10 text-[#B53014] flex items-center justify-center mb-2">
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
                                        className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                    >
                                        Multi-branch hub &rarr;
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 3. HOW IT WORKS / OPERATIONAL FLOW */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-14">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                                Operational Flow
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                How hospitality moves through Restrly
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                From guest seating to kitchen pacing and end-of-day reconciliation.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Step 1 */}
                            <div className="p-6 rounded-xl border border-stone-200 bg-stone-50/50 space-y-3 relative">
                                <div className="w-8 h-8 rounded-full bg-[#B53014] text-white flex items-center justify-center font-bold text-xs">
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
                </section>

                {/* 4. INTERACTIVE POS SANDBOX TERMINAL */}
                <section
                    className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-50 border-t border-stone-200"
                    id="terminal-demo"
                >
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
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
                                    <span className="bg-[#B53014] text-white px-2 py-0.5 rounded font-mono font-bold text-[11px]">
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
                                                            ? 'bg-[#B53014] text-white border-[#B53014]'
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
                                                className="group p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 hover:bg-white hover:border-[#B53014] text-left transition-all hover:shadow-xs flex flex-col justify-between"
                                            >
                                                <div>
                                                    <div className="flex items-start justify-between gap-2">
                                                        <span className="font-semibold text-stone-900 text-sm group-hover:text-[#B53014]">
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
                                                <span className="font-mono text-base text-[#B53014]">
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
                                                className="w-full bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] disabled:opacity-50 disabled:pointer-events-none text-white text-xs font-bold py-3 rounded-lg shadow-sm transition-colors flex items-center justify-center gap-2"
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

                {/* 5. TRANSPARENT PRICING PREVIEW */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-white">
                    <div className="max-w-6xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                                Simple &amp; Predictable
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                Honest pricing for every restaurant scale
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                No proprietary hardware penalties, no hidden monthly lock-ins, and no arbitrary per-transaction markup.
                            </p>

                            {/* Billing Cycle Switcher */}
                            <div className="mt-8 inline-flex items-center p-1 rounded-full bg-stone-100 border border-stone-200">
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('monthly')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                        billingCycle === 'monthly'
                                            ? 'bg-white text-stone-900 shadow-xs'
                                            : 'text-stone-600 hover:text-stone-900'
                                    }`}
                                >
                                    Monthly Billing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBillingCycle('yearly')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                        billingCycle === 'yearly'
                                            ? 'bg-white text-stone-900 shadow-xs'
                                            : 'text-stone-600 hover:text-stone-900'
                                    }`}
                                >
                                    <span>Annual Billing</span>
                                    <span className="bg-[#B53014]/10 text-[#B53014] text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                                        Save 20%
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Pricing Tiers Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Tier 1: Starter */}
                            <Card className="bg-white border-stone-200 flex flex-col justify-between">
                                <CardHeader>
                                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                                        Café &bull; Single Register
                                    </div>
                                    <CardTitle className="text-xl font-bold text-stone-900">
                                        Starter
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-600 mt-1">
                                        Essential touch POS and shift sales reporting for small coffee shops and food trucks.
                                    </CardDescription>
                                    <div className="mt-4">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            {billingCycle === 'yearly' ? '$55' : '$69'}
                                        </span>
                                        <span className="text-xs text-stone-500 ml-1">/ month</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2.5 text-xs text-stone-600">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>1 POS Station &amp; Card Reader</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Menu &amp; modifier builder</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Receipt printer integration</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Daily shift closing reports</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Link
                                        href="/register"
                                        className="w-full text-center py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors"
                                    >
                                        Start 14-Day Free Trial
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Tier 2: Professional (Featured) */}
                            <Card className="bg-white border-2 border-[#B53014] shadow-md flex flex-col justify-between relative">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B53014] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                                    Most Popular
                                </div>
                                <CardHeader>
                                    <div className="text-xs font-bold uppercase tracking-wider text-[#B53014] mb-1">
                                        Full Service &bull; KDS Included
                                    </div>
                                    <CardTitle className="text-xl font-bold text-stone-900">
                                        Professional
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-600 mt-1">
                                        Complete floor management, kitchen routing screens, and inventory ledger.
                                    </CardDescription>
                                    <div className="mt-4">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            {billingCycle === 'yearly' ? '$119' : '$149'}
                                        </span>
                                        <span className="text-xs text-stone-500 ml-1">/ month</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2.5 text-xs text-stone-600">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Unlimited POS terminals &amp; floor maps</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Up to 3 Kitchen Display screens (KDS)</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Recipe-level gram inventory ledger</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Handheld split-by-guest checkout</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Staff shift scheduling &amp; role permissions</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Link
                                        href="/register"
                                        className="w-full text-center py-2.5 rounded-lg bg-[#B53014] hover:bg-[#9E2A11] text-white text-xs font-semibold shadow-xs transition-colors"
                                    >
                                        Start 14-Day Free Trial
                                    </Link>
                                </CardFooter>
                            </Card>

                            {/* Tier 3: Multi-Location */}
                            <Card className="bg-white border-stone-200 flex flex-col justify-between">
                                <CardHeader>
                                    <div className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-1">
                                        Multi-Location &bull; Enterprise
                                    </div>
                                    <CardTitle className="text-xl font-bold text-stone-900">
                                        Hospitality Group
                                    </CardTitle>
                                    <CardDescription className="text-xs text-stone-600 mt-1">
                                        Centralized operations, shared commissary kitchen stock, and group P&amp;L reporting.
                                    </CardDescription>
                                    <div className="mt-4">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            {billingCycle === 'yearly' ? '$239' : '$289'}
                                        </span>
                                        <span className="text-xs text-stone-500 ml-1">/ mo / branch</span>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-2.5 text-xs text-stone-600">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Centralized multi-branch commissary stock</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Consolidated group financial reporting</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Unlimited KDS screens &amp; printers</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-[#B53014] shrink-0" />
                                        <span>Dedicated restaurant onboarding architect</span>
                                    </div>
                                </CardContent>
                                <CardFooter>
                                    <Link
                                        href="/contact"
                                        className="w-full text-center py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors"
                                    >
                                        Contact Restaurant Sales
                                    </Link>
                                </CardFooter>
                            </Card>
                        </div>
                    </div>
                </section>

                {/* 6. GENUINE SHADCN ACCORDION FAQ */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-50 border-t border-stone-200">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center max-w-2xl mx-auto mb-12">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                                Clear Answers
                            </span>
                            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-stone-900">
                                Frequently asked questions
                            </h2>
                            <p className="text-stone-600 mt-3 text-base">
                                Everything you need to know about Restrly architecture, hardware, and onboarding.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs">
                            <Accordion type="single" collapsible className="w-full space-y-2">
                                <AccordionItem value="item-1">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        What hardware does Restrly support?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        Restrly runs smoothly on standard modern hardware: iPads, Android tablets, touch displays, Mac, Windows, or Linux browsers. We connect seamlessly with standard ESC/POS thermal receipt printers (Epson, Star Micronics), cash drawers, and barcode scanners without proprietary hardware markups.
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-2">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        What happens if our restaurant internet drops during peak service?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        Restrly includes robust offline-resilient local sync. Even if your internet connection cuts out, registers continue firing tickets directly to kitchen displays and printers across your local Wi-Fi router. All transactions buffer securely and auto-synchronize to the cloud when connectivity returns.
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-3">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        Can we import our existing menu and nested modifier groups?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        Yes. You can import menus via CSV spreadsheet or export from Toast, Square, Lightspeed, or Clover. Our onboarding team also provides concierge assistance to structure nested modifiers, coursing sequences, and ingredient recipes before your go-live date.
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-4">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        How does inventory deduction work with recipes and modifiers?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        Every menu item and modifier can be tied directly to ingredient batches in your inventory ledger. When a guest orders a burger with extra cheese and gluten-free bread, Restrly calculates and deducts the precise gram amounts from raw stock and recalculates plate margin in real time.
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-5">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        Can I manage multiple restaurant branches or commissary kitchens?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        Yes. Restrly features a centralized multi-branch architecture. You can switch between locations in seconds, push standardized menus or seasonal specials to specific branches, and analyze consolidated sales reports or individual store margins.
                                    </AccordionContent>
                                </AccordionItem>

                                <AccordionItem value="item-6">
                                    <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                        Are there long-term contracts or cancellation fees?
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        No. All standard Restrly subscriptions operate on month-to-month or annual terms with zero cancellation fees. You can upgrade, downgrade, or cancel whenever your operational needs change.
                                    </AccordionContent>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </div>
                </section>

                {/* 7. FINAL HIGH-CONVERSION SECTION */}
                <section className="w-full px-4 sm:px-6 lg:px-8 py-20 bg-stone-900 text-white">
                    <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-xl bg-[#B53014] text-white flex items-center justify-center mb-6">
                            <UtensilsCrossed className="w-6 h-6" />
                        </div>

                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight max-w-2xl leading-tight">
                            Ready to modernize your restaurant operations?
                        </h2>

                        <p className="text-stone-300 mt-4 max-w-xl text-base leading-relaxed">
                            Join leading restaurateurs who rely on Restrly for sub-second POS velocity, real-time kitchen coordination, and inventory precision.
                        </p>

                        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full justify-center">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-sm transition-colors"
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
