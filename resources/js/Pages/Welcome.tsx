import { MarketingLayout } from '@/Components/Marketing';
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
        desc: 'Bone marrow jus, charred shallot',
        price: 68.0,
        tags: ['Med Rare', 'Woodfire'],
        category: 'mains',
    },
    {
        id: 'cod',
        name: 'Line-Caught Black Cod',
        desc: 'White miso, charred gai lan',
        price: 54.0,
        tags: ['Gluten Free'],
        category: 'mains',
    },
    {
        id: 'pasta',
        name: 'Morel Mushroom Tagliolini',
        desc: 'Aged parmigiano, cultured butter',
        price: 38.0,
        tags: ['Hand Rolled'],
        category: 'mains',
    },
    {
        id: 'pork',
        name: 'Kurobuta Pork Chop',
        desc: 'Smoked apple butter, mustard greens',
        price: 46.0,
        tags: ['Heritage'],
        category: 'mains',
    },
    {
        id: 'burrata',
        name: 'Burrata & Charred Peaches',
        desc: 'Wild thyme, 25-yr balsamico',
        price: 24.0,
        tags: ['Organic'],
        category: 'small_plates',
    },
    {
        id: 'tartare',
        name: 'Hand-Cut Wagyu Tartare',
        desc: 'Cured egg yolk, grilled sourdough',
        price: 26.0,
        tags: ['Chef Signature'],
        category: 'small_plates',
    },
    {
        id: 'barolo',
        name: '2018 Barolo Serralunga d’Alba',
        desc: 'Piedmont, Nebbiolo 750ml',
        price: 145.0,
        tags: ['Cellar Reserve'],
        category: 'cellar',
    },
    {
        id: 'fashion',
        name: 'Smoked Old Fashioned',
        desc: 'Small batch rye, orange peel, angostura',
        price: 19.0,
        tags: ['House Smoked'],
        category: 'cocktails',
    },
];

interface TableData {
    id: string;
    label: string;
    guests: number;
    location: string;
    status: 'Active' | 'Course 2' | 'Holding' | 'Seated';
    badgeColor: string;
    total: number;
}

const DEMO_TABLES: TableData[] = [
    {
        id: 'tbl_14',
        label: 'TBL 14',
        guests: 3,
        location: 'Patio',
        status: 'Active',
        badgeColor: 'bg-primary-fixed text-on-primary-fixed',
        total: 184.5,
    },
    {
        id: 'tbl_08',
        label: 'TBL 08',
        guests: 4,
        location: 'Main Salon',
        status: 'Course 2',
        badgeColor: 'bg-secondary-container text-on-secondary-fixed-variant',
        total: 310.0,
    },
    {
        id: 'bar_402',
        label: 'BAR #402',
        guests: 2,
        location: 'Lounge Rail',
        status: 'Holding',
        badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed-variant',
        total: 64.0,
    },
    {
        id: 'patio_03',
        label: 'PATIO 03',
        guests: 5,
        location: 'Terrace Garden',
        status: 'Seated',
        badgeColor: 'bg-surface-container-high text-on-surface',
        total: 142.0,
    },
];

export default function Welcome({
    plans = [],
    platformCurrency = 'USD',
}: WelcomeProps) {
    // POS Terminal Simulator State
    const [selectedTable, setSelectedTable] = useState<TableData>(DEMO_TABLES[0]);
    const [selectedCategory, setSelectedCategory] = useState<'mains' | 'small_plates' | 'cellar' | 'cocktails'>('mains');
    const [ticketItems, setTicketItems] = useState<Array<{ name: string; mod: string; price: number; qty: number }>>([
        { name: '1x Prime Dry-Aged Ribeye', mod: 'Temp: Med Rare, Extra Char', price: 68.0, qty: 1 },
        { name: '1x Line-Caught Black Cod', mod: 'Allergen Safe: Zero Allium', price: 54.0, qty: 1 },
        { name: '2x Smoked Old Fashioned', mod: 'Rye Bourbon, Orange Peel', price: 38.0, qty: 2 },
        { name: '1x Morel Tagliolini', mod: 'Shaved Black Truffle Add-on', price: 24.5, qty: 1 },
    ]);
    const [splitMode, setSplitMode] = useState<'even' | 'seat' | 'custom'>('even');
    const [paymentFired, setPaymentFired] = useState(false);

    // Interactive Flow Stage Switcher
    const [activeStage, setActiveStage] = useState<number>(1);

    // FAQ Accordion State
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // Calculations
    const subtotal = ticketItems.reduce((acc, item) => acc + item.price, 0);
    const tax = subtotal * 0.08875;
    const dueTotal = subtotal + tax;
    const splitCount = selectedTable.guests || 3;
    const perGuest = dueTotal / splitCount;

    const addItemToTicket = (item: MenuItem) => {
        setTicketItems((prev) => [
            ...prev,
            {
                name: `1x ${item.name}`,
                mod: item.tags[0] || 'Standard Prep',
                price: item.price,
                qty: 1,
            },
        ]);
    };

    const handleFireCheck = () => {
        setPaymentFired(true);
        setTimeout(() => setPaymentFired(false), 3000);
    };

    const filteredMenuItems = MENU_ITEMS.filter((item) => item.category === selectedCategory);

    return (
        <MarketingLayout>
            <Head>
                <title>Mise Restaurant POS - Redefining Restaurant Velocity</title>
                <meta
                    name="description"
                    content="Manage live floor tables, sub-second terminal orders, recipe-level gram inventory, and multi-location revenue in one uncompromising platform. Built for hospitality perfectionists."
                />
            </Head>

            <div className="flex flex-col w-full">
                {/* 1. HERO SECTION */}
                <section className="relative w-full px-gutter pt-space-xl pb-space-3xl overflow-hidden bg-surface">
                    <div className="max-w-7xl mx-auto flex flex-col items-center text-center">
                        {/* Editorial Eyebrow */}
                        <div className="inline-flex items-center gap-space-xs px-space-md py-1 rounded-full bg-surface-container-high text-on-surface mb-space-lg shadow-xs">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                            <span className="font-label-caps text-label-caps tracking-widest uppercase text-tertiary">
                                Mise OS 3.0 • Redefining Restaurant Velocity
                            </span>
                        </div>

                        {/* Main Headline */}
                        <h1 className="font-display-xl text-4xl sm:text-6xl lg:text-display-xl tracking-tight text-on-surface max-w-5xl text-balance font-extrabold">
                            Run your restaurant.
                            <br className="hidden sm:inline" />
                            Not your chaos<span className="text-primary">.</span>
                        </h1>

                        {/* Subtitle */}
                        <p className="font-body-lg text-lg sm:text-body-lg text-on-surface-variant max-w-2xl mt-space-md mb-space-xl text-balance">
                            Manage live floor tables, sub-second terminal orders, recipe-level gram
                            inventory, and multi-location revenue in one uncompromising platform. Built
                            for hospitality perfectionists.
                        </p>

                        {/* Action Row */}
                        <div className="flex flex-col sm:flex-row items-center gap-space-md w-full justify-center">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-xl py-space-md rounded-lg shadow-md transition-all hover:scale-[1.01] active:scale-[0.98]"
                            >
                                <span>Start Free Trial</span>
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </Link>
                            <a
                                href="#interactive-flow"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-surface-container-lowest hover:bg-surface-container text-on-surface font-body-sm text-body-sm font-semibold px-space-lg py-space-md rounded-lg shadow-xs transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px] text-primary">play_circle</span>
                                <span>Explore Live Demo</span>
                            </a>
                        </div>

                        {/* Microcopy Reassurance */}
                        <div className="flex flex-wrap items-center justify-center gap-x-space-lg gap-y-1 mt-space-md text-on-surface-variant font-mono-ticket text-mono-ticket">
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                                14-day zero-risk trial
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                                No hardware lock-in
                            </span>
                            <span className="inline-flex items-center gap-1">
                                <span className="material-symbols-outlined text-secondary text-[16px]">check_circle</span>
                                20-min concierge onboarding
                            </span>
                        </div>

                        {/* LIVE POS ORCHESTRATION TERMINAL INTERFACE */}
                        <div className="w-full mt-space-2xl bg-surface-container-lowest rounded-xl shadow-xl overflow-hidden text-left border border-surface-container-highest">
                            {/* Terminal Master Bar */}
                            <div className="bg-inverse-surface text-inverse-on-surface px-space-lg py-space-sm flex flex-wrap items-center justify-between gap-space-sm">
                                <div className="flex items-center gap-space-md">
                                    <span className="font-label-caps text-label-caps uppercase bg-primary text-on-primary px-space-xs py-0.5 rounded font-bold">
                                        Terminal 01
                                    </span>
                                    <span className="font-body-sm text-body-sm font-semibold text-inverse-on-surface">
                                        Service: Dinner Rush • Station: Expediter Central
                                    </span>
                                </div>
                                <div className="flex items-center gap-space-lg font-mono-ticket text-mono-ticket text-surface-dim">
                                    <span>
                                        SYNC: <strong className="text-secondary-fixed">LIVE 0.12ms</strong>
                                    </span>
                                    <span>
                                        DRAWER: <strong className="text-surface-container-lowest">$1,450.00</strong>
                                    </span>
                                    <span>
                                        SERVER: <strong className="text-surface-container-lowest">MARCUS B.</strong>
                                    </span>
                                </div>
                            </div>

                            {/* Terminal Operational Pulse */}
                            <div className="bg-surface-container-low px-space-lg py-2 flex flex-wrap items-center justify-between gap-space-sm text-on-surface-variant font-mono-ticket text-mono-ticket border-b border-surface-container-high">
                                <div className="flex items-center gap-space-md">
                                    <span>
                                        Shift Gross:{' '}
                                        <strong className="text-on-surface font-bold">$4,820.00</strong>
                                    </span>
                                    <span className="text-tertiary">•</span>
                                    <span>
                                        Table Turn Velocity:{' '}
                                        <strong className="text-secondary font-bold">98.4%</strong>
                                    </span>
                                    <span className="text-tertiary">•</span>
                                    <span>
                                        Kitchen Prep Latency:{' '}
                                        <strong className="text-on-surface font-bold">11m 40s</strong>
                                    </span>
                                </div>
                                <div className="flex items-center gap-space-sm">
                                    <span className="w-2 h-2 rounded-full bg-secondary" />
                                    <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">
                                        KDS Line Clear
                                    </span>
                                </div>
                            </div>

                            {/* Main Workspace (3-column layout) */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-surface-container-high min-h-[520px]">
                                {/* Col 1: Active Tables (3 cols) */}
                                <div className="lg:col-span-3 bg-surface-container-lowest p-space-md flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-space-md pb-space-xs border-b border-surface-container">
                                            <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold tracking-wider">
                                                Active Tables
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket text-primary font-bold">
                                                4 Open
                                            </span>
                                        </div>

                                        <div className="space-y-space-xs">
                                            {DEMO_TABLES.map((table) => {
                                                const isSelected = selectedTable.id === table.id;
                                                return (
                                                    <div
                                                        key={table.id}
                                                        onClick={() => setSelectedTable(table)}
                                                        className={`p-space-sm rounded-lg cursor-pointer transition-all ${
                                                            isSelected
                                                                ? 'bg-surface-container-high shadow-xs'
                                                                : 'bg-surface-container-low hover:bg-surface-container'
                                                        }`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                                {table.label}
                                                            </span>
                                                            <span
                                                                className={`font-label-caps text-label-caps uppercase px-space-xs py-0.5 rounded font-bold ${table.badgeColor}`}
                                                            >
                                                                {table.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between mt-1 text-on-surface-variant font-body-sm text-body-sm">
                                                            <span>
                                                                {table.guests} Guests • {table.location}
                                                            </span>
                                                            <span className="font-mono-ticket text-mono-ticket text-on-surface font-bold">
                                                                ${table.total.toFixed(2)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Station Shortcuts */}
                                    <div className="mt-space-md pt-space-sm bg-surface-container-low p-space-sm rounded-lg">
                                        <span className="font-label-caps text-label-caps uppercase text-tertiary block mb-1">
                                            Station Shortcuts
                                        </span>
                                        <div className="grid grid-cols-2 gap-space-xs">
                                            <button
                                                type="button"
                                                className="bg-surface-container-lowest text-on-surface text-center py-1.5 rounded font-body-sm text-body-sm font-semibold hover:bg-surface-container-high transition-colors shadow-xs"
                                            >
                                                Course Hold
                                            </button>
                                            <button
                                                type="button"
                                                className="bg-surface-container-lowest text-on-surface text-center py-1.5 rounded font-body-sm text-body-sm font-semibold hover:bg-surface-container-high transition-colors shadow-xs"
                                            >
                                                Transfer Tab
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Col 2: Live Menu Category & Item Tiles (5 cols) */}
                                <div className="lg:col-span-5 bg-surface-container-low p-space-md flex flex-col justify-between">
                                    <div>
                                        {/* Culinary Category Tabs */}
                                        <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs mb-space-md">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('mains')}
                                                className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm font-semibold whitespace-nowrap transition-colors ${
                                                    selectedCategory === 'mains'
                                                        ? 'bg-inverse-surface text-inverse-on-surface'
                                                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                                                }`}
                                            >
                                                Woodfire Mains
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('small_plates')}
                                                className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm font-semibold whitespace-nowrap transition-colors ${
                                                    selectedCategory === 'small_plates'
                                                        ? 'bg-inverse-surface text-inverse-on-surface'
                                                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                                                }`}
                                            >
                                                Small Plates
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('cellar')}
                                                className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm font-semibold whitespace-nowrap transition-colors ${
                                                    selectedCategory === 'cellar'
                                                        ? 'bg-inverse-surface text-inverse-on-surface'
                                                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                                                }`}
                                            >
                                                Cellar Reserve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedCategory('cocktails')}
                                                className={`px-space-md py-1.5 rounded-lg font-body-sm text-body-sm font-semibold whitespace-nowrap transition-colors ${
                                                    selectedCategory === 'cocktails'
                                                        ? 'bg-inverse-surface text-inverse-on-surface'
                                                        : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-high'
                                                }`}
                                            >
                                                Cocktails
                                            </button>
                                        </div>

                                        {/* Item Tiles */}
                                        <div className="grid grid-cols-2 gap-space-sm">
                                            {filteredMenuItems.map((item) => (
                                                <div
                                                    key={item.id}
                                                    onClick={() => addItemToTicket(item)}
                                                    className="bg-surface-container-lowest p-space-sm rounded-lg shadow-xs flex flex-col justify-between hover:scale-[1.01] hover:border-primary border border-transparent transition-all cursor-pointer group"
                                                    title="Click to add item to ticket"
                                                >
                                                    <div>
                                                        <div className="flex justify-between items-start">
                                                            <h4 className="font-body-sm text-body-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                                                                {item.name}
                                                            </h4>
                                                            <span className="font-mono-ticket text-mono-ticket font-bold text-primary shrink-0 ml-1">
                                                                ${item.price.toFixed(0)}
                                                            </span>
                                                        </div>
                                                        <p className="font-body-sm text-[12px] text-on-surface-variant mt-1 line-clamp-1">
                                                            {item.desc}
                                                        </p>
                                                    </div>
                                                    <div className="flex gap-1 mt-space-sm flex-wrap">
                                                        {item.tags.map((tag, i) => (
                                                            <span
                                                                key={i}
                                                                className="font-label-caps text-label-caps uppercase bg-surface-container-high text-on-surface px-1.5 py-0.5 rounded"
                                                            >
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Allergy Alert Strip */}
                                    <div className="mt-space-md p-space-sm bg-primary-fixed rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-space-xs">
                                            <span className="material-symbols-outlined text-primary text-[20px]">
                                                warning
                                            </span>
                                            <span className="font-body-sm text-body-sm font-bold text-on-primary-fixed">
                                                Guest Flag: Shellfish &amp; Celiac Protocol
                                            </span>
                                        </div>
                                        <span className="font-label-caps text-label-caps uppercase bg-primary text-on-primary px-2 py-0.5 rounded font-bold">
                                            Kitchen Alert Fired
                                        </span>
                                    </div>
                                </div>

                                {/* Col 3: Active Ticket & Settlement (4 cols) */}
                                <div className="lg:col-span-4 bg-surface-container-lowest p-space-md flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container">
                                            <div>
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                    Ticket #1042
                                                </span>
                                                <span className="block font-mono-ticket text-mono-ticket text-tertiary">
                                                    {selectedTable.label} • Round 2 of 3
                                                </span>
                                            </div>
                                            <span className="font-label-caps text-label-caps uppercase bg-surface-container text-on-surface px-space-xs py-1 rounded font-bold">
                                                Order Live
                                            </span>
                                        </div>

                                        {/* Ticket Items List */}
                                        <div className="space-y-space-sm py-space-sm max-h-[220px] overflow-y-auto">
                                            {ticketItems.map((item, idx) => (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-start text-body-sm border-b border-surface-container-low pb-1.5"
                                                >
                                                    <div>
                                                        <span className="font-bold text-on-surface">{item.name}</span>
                                                        <span className="block font-mono-ticket text-mono-ticket text-tertiary pl-space-sm">
                                                            → {item.mod}
                                                        </span>
                                                    </div>
                                                    <span className="font-mono-ticket text-mono-ticket font-bold text-on-surface">
                                                        ${item.price.toFixed(2)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Bill Settlement Zone */}
                                    <div className="pt-space-sm bg-surface-container-low p-space-sm rounded-lg mt-space-sm">
                                        {/* Split Bill Toggles */}
                                        <div className="grid grid-cols-3 gap-1 mb-space-sm p-0.5 bg-surface-container rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setSplitMode('even')}
                                                className={`font-body-sm text-body-sm font-bold py-1 rounded transition-colors text-center ${
                                                    splitMode === 'even'
                                                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                                                        : 'text-on-surface-variant hover:text-on-surface'
                                                }`}
                                            >
                                                Even ({splitCount})
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSplitMode('seat')}
                                                className={`font-body-sm text-body-sm font-semibold py-1 rounded transition-colors text-center ${
                                                    splitMode === 'seat'
                                                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                                                        : 'text-on-surface-variant hover:text-on-surface'
                                                }`}
                                            >
                                                By Seat
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSplitMode('custom')}
                                                className={`font-body-sm text-body-sm font-semibold py-1 rounded transition-colors text-center ${
                                                    splitMode === 'custom'
                                                        ? 'bg-surface-container-lowest text-on-surface shadow-xs'
                                                        : 'text-on-surface-variant hover:text-on-surface'
                                                }`}
                                            >
                                                Custom
                                            </button>
                                        </div>

                                        {/* Calculation Rows */}
                                        <div className="space-y-1 font-mono-ticket text-mono-ticket text-on-surface-variant">
                                            <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span className="text-on-surface font-semibold">
                                                    ${subtotal.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Tax (8.875%):</span>
                                                <span className="text-on-surface font-semibold">
                                                    ${tax.toFixed(2)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-on-surface font-bold text-body-md pt-1 border-t border-surface-container-high">
                                                <span>Due Total:</span>
                                                <span className="font-mono-metric text-headline-sm text-primary">
                                                    ${dueTotal.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Fire Payment Action */}
                                        <button
                                            type="button"
                                            onClick={handleFireCheck}
                                            className={`w-full mt-space-sm py-space-sm rounded-lg font-body-sm text-body-sm font-bold flex items-center justify-center gap-space-xs shadow-md transition-all ${
                                                paymentFired
                                                    ? 'bg-secondary text-on-secondary'
                                                    : 'bg-primary hover:bg-primary-container text-on-primary'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-[18px]">
                                                {paymentFired ? 'check_circle' : 'contactless'}
                                            </span>
                                            <span>
                                                {paymentFired
                                                    ? 'Check Fired & Thermal Printed!'
                                                    : `Tap to Fire Check / $${perGuest.toFixed(2)} per guest`}
                                            </span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 2. THE ARCHITECTURE GAP / OPERATIONAL FRICTION SECTION */}
                <section className="w-full px-gutter py-space-3xl bg-surface-container-low">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-space-2xl gap-space-md">
                            <div>
                                <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block mb-space-xs">
                                    The Architecture Gap
                                </span>
                                <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight max-w-xl font-bold">
                                    Fragmented tech stacks bleed dining room margins.
                                </h2>
                            </div>
                            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                                Most restaurants juggle three disparate tablets, disconnected inventory
                                spreadsheets, and legacy POS terminals that freeze on Friday night at 8 PM.
                            </p>
                        </div>

                        {/* Asymmetric Contrast Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg mb-space-3xl">
                            {/* Fragmented Stack */}
                            <div className="lg:col-span-5 bg-surface-container-high p-space-xl rounded-xl flex flex-col justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-space-xs bg-error-container text-on-error-container px-space-sm py-1 rounded-full mb-space-lg font-label-caps text-label-caps uppercase font-bold">
                                        <span className="material-symbols-outlined text-[16px]">close</span>
                                        The Fragmented Legacy Stack
                                    </div>
                                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-md font-bold">
                                        Paper chokeholds &amp; modifier drops
                                    </h3>
                                    <ul className="space-y-space-md font-body-md text-body-md text-on-surface-variant">
                                        <li className="flex items-start gap-space-sm">
                                            <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                                                cancel
                                            </span>
                                            <span>Delivery apps on standalone iPads requiring double re-entry by hostesses.</span>
                                        </li>
                                        <li className="flex items-start gap-space-sm">
                                            <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                                                cancel
                                            </span>
                                            <span>Inventory is a Monday morning guess, resulting in 86’d high-margin ribeyes mid-service.</span>
                                        </li>
                                        <li className="flex items-start gap-space-sm">
                                            <span className="material-symbols-outlined text-error text-[20px] shrink-0 mt-0.5">
                                                cancel
                                            </span>
                                            <span>Proprietary hardware leases costing upwards of $4,000 per terminal with locked processing.</span>
                                        </li>
                                    </ul>
                                </div>
                                <div className="mt-space-xl pt-space-md bg-surface-container-highest p-space-md rounded-lg">
                                    <span className="font-mono-ticket text-mono-ticket text-on-surface-variant block font-bold">
                                        Estimated Cost of Stack Chaos:
                                    </span>
                                    <span className="font-mono-metric text-mono-metric text-error font-bold block mt-1">
                                        -$2,850 / month
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                        in comps, lost kitchen tickets, and food waste
                                    </span>
                                </div>
                            </div>

                            {/* Unified Mise OS */}
                            <div className="lg:col-span-7 bg-surface-container-lowest p-space-xl rounded-xl shadow-md flex flex-col justify-between">
                                <div>
                                    <div className="inline-flex items-center gap-space-xs bg-secondary-container text-on-secondary-fixed-variant px-space-sm py-1 rounded-full mb-space-lg font-label-caps text-label-caps uppercase font-bold">
                                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                                        The Unified Mise Operating System
                                    </div>
                                    <h3 className="font-headline-md text-headline-md text-on-surface mb-space-md font-bold">
                                        Total synchronization from pass to ledger
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md text-body-md">
                                        <div className="bg-surface-container-low p-space-md rounded-lg">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface block mb-1">
                                                0.12s Sync
                                            </span>
                                            <p className="text-on-surface-variant font-body-sm text-body-sm">
                                                Offline local mesh network keeps kitchen tickets firing even if fiber internet goes down.
                                            </p>
                                        </div>
                                        <div className="bg-surface-container-low p-space-md rounded-lg">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface block mb-1">
                                                Zero Aggregator iPads
                                            </span>
                                            <p className="text-on-surface-variant font-body-sm text-body-sm">
                                                UberEats, DoorDash, and online orders route directly to the designated hot line station.
                                            </p>
                                        </div>
                                        <div className="bg-surface-container-low p-space-md rounded-lg">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface block mb-1">
                                                Gram Precision
                                            </span>
                                            <p className="text-on-surface-variant font-body-sm text-body-sm">
                                                Each fire deducts 220g wagyu and 40ml truffle glaze, updating commissary stock dynamically.
                                            </p>
                                        </div>
                                        <div className="bg-surface-container-low p-space-md rounded-lg">
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface block mb-1">
                                                Open Hardware
                                            </span>
                                            <p className="text-on-surface-variant font-body-sm text-body-sm">
                                                Runs on consumer iPads, industrial Sunmi terminals, and standard Epson thermal printers.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-space-xl pt-space-md bg-secondary-container p-space-md rounded-lg text-on-secondary-fixed-variant flex items-center justify-between">
                                    <div>
                                        <span className="font-mono-ticket text-mono-ticket block font-bold">
                                            Average Margin Recovery:
                                        </span>
                                        <span className="font-mono-metric text-mono-metric font-bold text-on-secondary-fixed mt-1">
                                            +4.2% Net Margin
                                        </span>
                                    </div>
                                    <span className="material-symbols-outlined text-secondary text-[36px]">
                                        trending_up
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4 Architectural Pillars */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-md">
                            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow">
                                <span className="font-mono-metric text-headline-sm text-primary font-bold block mb-space-sm">
                                    01
                                </span>
                                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                                    Sub-Second Checkout
                                </h4>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                    Single-tap split bills by seat, quick-fire modifier flows, and seamless EMV tap payments with tip balancing under 3 seconds.
                                </p>
                                <div className="font-mono-ticket text-mono-ticket text-secondary font-bold inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">bolt</span> Sub-second response
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow">
                                <span className="font-mono-metric text-headline-sm text-primary font-bold block mb-space-sm">
                                    02
                                </span>
                                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                                    Live KDS Routing
                                </h4>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                    Pacing tickets across saute, grill, and pastry stations. Built-in allergen shield alerts the chef pass before the ticket is struck.
                                </p>
                                <div className="font-mono-ticket text-mono-ticket text-secondary font-bold inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">timer</span> Pacing automation
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow">
                                <span className="font-mono-metric text-headline-sm text-primary font-bold block mb-space-sm">
                                    03
                                </span>
                                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                                    Recipe-to-Gram Ledger
                                </h4>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                    Theoretical vs. actual inventory tracking. Automated supplier purchase orders triggered when dry-age inventory drops below par.
                                </p>
                                <div className="font-mono-ticket text-mono-ticket text-secondary font-bold inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">scale</span> Automatic PO trigger
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs hover:shadow-md transition-shadow">
                                <span className="font-mono-metric text-headline-sm text-primary font-bold block mb-space-sm">
                                    04
                                </span>
                                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-space-xs">
                                    Multi-Unit P&amp;L Clarity
                                </h4>
                                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                    Consolidated operator dashboards. Track real-time labor cost against hourly sales velocity across 1 to 50 branch locations.
                                </p>
                                <div className="font-mono-ticket text-mono-ticket text-secondary font-bold inline-flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[16px]">hub</span> Group telemetry
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 3. INTERACTIVE SERVICE CHOREOGRAPHY FLOW */}
                <section className="w-full px-gutter py-space-3xl bg-surface" id="interactive-flow">
                    <div className="max-w-7xl mx-auto">
                        <div className="text-center max-w-3xl mx-auto mb-space-2xl">
                            <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block mb-space-xs">
                                Service Choreography
                            </span>
                            <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
                                How hospitality flows with Mise
                            </h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant mt-space-sm">
                                A continuous, low-friction loop engineered for both front-of-house grace and
                                back-of-house culinary tempo.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-center">
                            {/* Step Selectors Left (5 cols) */}
                            <div className="lg:col-span-5 space-y-space-md">
                                <div
                                    onClick={() => setActiveStage(1)}
                                    className={`p-space-lg rounded-xl cursor-pointer transition-all ${
                                        activeStage === 1
                                            ? 'bg-surface-container-lowest shadow-md'
                                            : 'bg-surface-container-low hover:bg-surface-container-lowest'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`font-mono-ticket text-mono-ticket font-bold ${
                                                activeStage === 1 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            STAGE 01
                                        </span>
                                        <span
                                            className={`material-symbols-outlined text-[20px] ${
                                                activeStage === 1 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            table_restaurant
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">
                                        Floor &amp; Order Intake
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                        Visual floor architect with live turn countdowns, quick party resizing, and server section locks.
                                    </p>
                                </div>

                                <div
                                    onClick={() => setActiveStage(2)}
                                    className={`p-space-lg rounded-xl cursor-pointer transition-all ${
                                        activeStage === 2
                                            ? 'bg-surface-container-lowest shadow-md'
                                            : 'bg-surface-container-low hover:bg-surface-container-lowest'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`font-mono-ticket text-mono-ticket font-bold ${
                                                activeStage === 2 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            STAGE 02
                                        </span>
                                        <span
                                            className={`material-symbols-outlined text-[20px] ${
                                                activeStage === 2 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            soup_kitchen
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">
                                        Kitchen Firing &amp; Line Pacing
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                        Color-coded ticket pacing with automated delay timers so appetizers and entrees hit the pass together.
                                    </p>
                                </div>

                                <div
                                    onClick={() => setActiveStage(3)}
                                    className={`p-space-lg rounded-xl cursor-pointer transition-all ${
                                        activeStage === 3
                                            ? 'bg-surface-container-lowest shadow-md'
                                            : 'bg-surface-container-low hover:bg-surface-container-lowest'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`font-mono-ticket text-mono-ticket font-bold ${
                                                activeStage === 3 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            STAGE 03
                                        </span>
                                        <span
                                            className={`material-symbols-outlined text-[20px] ${
                                                activeStage === 3 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            contactless
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">
                                        Split-by-Guest Table Payment
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                        Mobile handheld settlement. Split bottles across 4 cards or tender individual item lines in seconds.
                                    </p>
                                </div>

                                <div
                                    onClick={() => setActiveStage(4)}
                                    className={`p-space-lg rounded-xl cursor-pointer transition-all ${
                                        activeStage === 4
                                            ? 'bg-surface-container-lowest shadow-md'
                                            : 'bg-surface-container-low hover:bg-surface-container-lowest'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span
                                            className={`font-mono-ticket text-mono-ticket font-bold ${
                                                activeStage === 4 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            STAGE 04
                                        </span>
                                        <span
                                            className={`material-symbols-outlined text-[20px] ${
                                                activeStage === 4 ? 'text-primary' : 'text-tertiary'
                                            }`}
                                        >
                                            receipt_long
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mt-1">
                                        Midnight Close &amp; Auto-Ledger
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                                        Blind cash drops, tip pool distributions, and automated journal exports direct to QuickBooks and Xero.
                                    </p>
                                </div>
                            </div>

                            {/* Dynamic Visual Stage Mockup Right (7 cols) */}
                            <div className="lg:col-span-7 bg-surface-container-lowest p-space-xl rounded-xl shadow-lg border border-surface-container-highest min-h-[460px] flex flex-col justify-center">
                                {activeStage === 1 && (
                                    <div className="space-y-space-md">
                                        <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                            <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">
                                                Floor Map: Dining Room East
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket text-on-surface-variant">
                                                Capacity: 74% Seated
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-3 gap-space-md py-space-sm">
                                            <div className="p-space-md bg-secondary-container rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-secondary-fixed">
                                                    T-01 • 4p
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-on-secondary-fixed-variant">
                                                    Appetizers (14m)
                                                </span>
                                            </div>
                                            <div className="p-space-md bg-primary-fixed rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-primary-fixed">
                                                    T-02 • 2p
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-on-primary-fixed-variant">
                                                    Payment Ready
                                                </span>
                                            </div>
                                            <div className="p-space-md bg-surface-container-high rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                    T-03 • 6p
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-tertiary">
                                                    Available • Clean
                                                </span>
                                            </div>
                                            <div className="p-space-md bg-secondary-container rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-secondary-fixed">
                                                    T-04 • 2p
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-on-secondary-fixed-variant">
                                                    Dessert Fired
                                                </span>
                                            </div>
                                            <div className="p-space-md bg-secondary-container rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-secondary-fixed">
                                                    T-05 • 4p
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-on-secondary-fixed-variant">
                                                    Mains Seated
                                                </span>
                                            </div>
                                            <div className="p-space-md bg-primary-fixed rounded-lg flex flex-col justify-between">
                                                <span className="font-headline-sm text-headline-sm font-bold text-on-primary-fixed">
                                                    T-06 • 8p VIP
                                                </span>
                                                <span className="font-mono-ticket text-mono-ticket text-on-primary-fixed-variant">
                                                    Sommelier Pour
                                                </span>
                                            </div>
                                        </div>
                                        <div className="bg-surface-container-low p-space-sm rounded-lg flex items-center justify-between text-body-sm">
                                            <span className="font-body-sm text-body-sm text-on-surface">
                                                Turnover optimization active: Average table turnover down 8 minutes.
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket font-bold text-primary">
                                                +12 Covers/Night
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {activeStage === 2 && (
                                    <div className="space-y-space-md">
                                        <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                            <span className="font-label-caps text-label-caps uppercase text-primary font-bold">
                                                Live Kitchen Display (KDS 02 - Sauté Station)
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket text-error font-bold">
                                                RUSH TIME: 08m 12s
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-space-md">
                                            <div className="bg-surface-container-low p-space-md rounded-lg shadow-xs">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                        Ticket #1043 • TBL 04
                                                    </span>
                                                    <span className="font-mono-ticket text-mono-ticket text-primary font-bold">
                                                        FIRE C-2
                                                    </span>
                                                </div>
                                                <div className="space-y-1 text-body-sm text-on-surface-variant font-mono-ticket">
                                                    <div>• 2x Crispy Duck Breast (Med)</div>
                                                    <div>• 1x Wild Chashu Broth</div>
                                                    <div className="text-primary font-bold">
                                                        • ALLERGY: Pine Nut Severe
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="bg-surface-container-low p-space-md rounded-lg shadow-xs">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                                        Ticket #1044 • BAR 01
                                                    </span>
                                                    <span className="font-mono-ticket text-mono-ticket text-secondary font-bold">
                                                        HOLD C-2
                                                    </span>
                                                </div>
                                                <div className="space-y-1 text-body-sm text-on-surface-variant font-mono-ticket">
                                                    <div>• 1x Wagyu Smash Burger</div>
                                                    <div>• 1x Truffle Fries (Extra Aioli)</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-surface-container-low p-space-sm rounded-lg text-body-sm text-on-surface">
                                            Expediter latency auto-adjusted to prevent cold pass staging.
                                        </div>
                                    </div>
                                )}

                                {activeStage === 3 && (
                                    <div className="space-y-space-md">
                                        <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                            <span className="font-label-caps text-label-caps uppercase text-secondary font-bold">
                                                Handheld Card Terminal • Tap-to-Pay
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket text-secondary font-bold">
                                                EMV CONTACTLESS READY
                                            </span>
                                        </div>
                                        <div className="bg-surface-container-low p-space-lg rounded-xl text-center space-y-space-sm">
                                            <span className="font-body-md text-body-md text-on-surface-variant">
                                                Table 12 • Guest 3 of 4
                                            </span>
                                            <div className="font-mono-metric text-mono-metric text-on-surface font-bold">
                                                $48.25
                                            </div>
                                            <div className="flex justify-center gap-space-sm">
                                                <button
                                                    type="button"
                                                    className="bg-surface-container-lowest px-space-md py-1 rounded font-mono-ticket font-bold text-on-surface shadow-xs"
                                                >
                                                    18% ($8.68)
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-inverse-surface text-inverse-on-surface px-space-md py-1 rounded font-mono-ticket font-bold"
                                                >
                                                    20% ($9.65)
                                                </button>
                                                <button
                                                    type="button"
                                                    className="bg-surface-container-lowest px-space-md py-1 rounded font-mono-ticket font-bold text-on-surface shadow-xs"
                                                >
                                                    25% ($12.06)
                                                </button>
                                            </div>
                                            <p className="font-body-sm text-body-sm text-secondary font-semibold">
                                                Tapped via Apple Pay • Fast close in 1.4s
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {activeStage === 4 && (
                                    <div className="space-y-space-md">
                                        <div className="flex items-center justify-between border-b border-surface-container-high pb-space-sm">
                                            <span className="font-label-caps text-label-caps uppercase text-on-surface font-bold">
                                                Nightly Financial Reconcile
                                            </span>
                                            <span className="font-mono-ticket text-mono-ticket text-secondary font-bold">
                                                MATCHED 100%
                                            </span>
                                        </div>
                                        <div className="space-y-space-xs font-mono-ticket text-mono-ticket text-on-surface-variant">
                                            <div className="flex justify-between p-space-sm bg-surface-container-low rounded">
                                                <span>Credit &amp; Digital Tender:</span>
                                                <span className="font-bold text-on-surface">$14,280.40</span>
                                            </div>
                                            <div className="flex justify-between p-space-sm bg-surface-container-low rounded">
                                                <span>Cash Reconciled Drawer:</span>
                                                <span className="font-bold text-on-surface">$1,450.00 ($0.00 Variance)</span>
                                            </div>
                                            <div className="flex justify-between p-space-sm bg-surface-container-low rounded">
                                                <span>Auto-Export Status:</span>
                                                <span className="text-secondary font-bold">
                                                    Xero &amp; QuickBooks Synced (01:14 AM)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* 4. SUPPORTED HOSPITALITY CONCEPTS */}
                <section className="w-full px-gutter py-space-3xl bg-surface-container-low">
                    <div className="max-w-7xl mx-auto">
                        <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-2xl gap-space-md">
                            <div>
                                <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block mb-space-xs">
                                    Tailored Engine
                                </span>
                                <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
                                    Designed for how your dining room actually works
                                </h2>
                            </div>
                            <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
                                No two dining concepts run identical shifts. Mise adapts to service mechanics, not the other way around.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-space-lg">
                            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mb-space-md">
                                        <span className="material-symbols-outlined text-[28px]">wine_bar</span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Fine &amp; Casual Dining
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                        Dynamic multi-course holding, sommelier cellar reserve lookups, seat-specific firing, and precise guest allergy tracking.
                                    </p>
                                </div>
                                <div className="pt-space-sm border-t border-surface-container font-mono-ticket text-mono-ticket text-on-surface">
                                    Key Metric: <strong className="text-secondary">+18% faster course turnover</strong>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mb-space-md">
                                        <span className="material-symbols-outlined text-[28px]">coffee</span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Cafés &amp; Bakeries
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                        Morning line queue busting, fast milk &amp; roast modifier toggles, barista counter display screens, and batch baking schedule counts.
                                    </p>
                                </div>
                                <div className="pt-space-sm border-t border-surface-container font-mono-ticket text-mono-ticket text-on-surface">
                                    Key Metric: <strong className="text-secondary">4.2s average queue checkout</strong>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mb-space-md">
                                        <span className="material-symbols-outlined text-[28px]">takeout_dining</span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Cloud &amp; Ghost Kitchens
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                        Direct API aggregation for UberEats, DoorDash, and online menus into unified kitchen tickets. Zero manual re-punching.
                                    </p>
                                </div>
                                <div className="pt-space-sm border-t border-surface-container font-mono-ticket text-mono-ticket text-on-surface">
                                    Key Metric: <strong className="text-secondary">0% re-entry error rate</strong>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center text-primary mb-space-md">
                                        <span className="material-symbols-outlined text-[28px]">corporate_fare</span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Multi-Unit Hospitality
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-md">
                                        Centralized master menu engineering, cross-branch commissary transfers, global pricing updates, and enterprise role permissions.
                                    </p>
                                </div>
                                <div className="pt-space-sm border-t border-surface-container font-mono-ticket text-mono-ticket text-on-surface">
                                    Key Metric: <strong className="text-secondary">One-click rollout to all branches</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 5. HARDWARE AGNOSTIC & ECOSYSTEM PARTNERS */}
                <section className="w-full px-gutter py-space-3xl bg-surface">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-2xl items-center">
                            <div className="lg:col-span-5 space-y-space-md">
                                <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block">
                                    Zero Extortion Guarantee
                                </span>
                                <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
                                    Bring your own iPads. Or use industrial hardware.
                                </h2>
                                <p className="font-body-lg text-body-lg text-on-surface-variant">
                                    Unlike legacy POS providers that lock you into overpriced proprietary
                                    hardware leases, Mise runs smoothly on standard off-the-shelf equipment.
                                </p>
                                <div className="space-y-space-sm pt-space-xs">
                                    <div className="flex items-center gap-space-sm font-body-md text-body-md text-on-surface">
                                        <span className="material-symbols-outlined text-secondary text-[22px]">
                                            check_box
                                        </span>
                                        <span>Works with standard Apple iPads (iOS 15+)</span>
                                    </div>
                                    <div className="flex items-center gap-space-sm font-body-md text-body-md text-on-surface">
                                        <span className="material-symbols-outlined text-secondary text-[22px]">
                                            check_box
                                        </span>
                                        <span>Connects to industry standard Epson &amp; Star Micronics thermal printers</span>
                                    </div>
                                    <div className="flex items-center gap-space-sm font-body-md text-body-md text-on-surface">
                                        <span className="material-symbols-outlined text-secondary text-[22px]">
                                            check_box
                                        </span>
                                        <span>Direct tap-to-pay EMV readers via Stripe Terminal &amp; Square</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-7 bg-surface-container-low p-space-xl rounded-xl border border-surface-container-high">
                                <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold tracking-wider block mb-space-md">
                                    Verified Hardware &amp; Ecosystem Partners
                                </span>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-md">
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            Stripe Terminal
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            EMV Certified
                                        </span>
                                    </div>
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            Star Micronics
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            KDS &amp; Receipt
                                        </span>
                                    </div>
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            Epson Pass
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            Impact Kitchen
                                        </span>
                                    </div>
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            QuickBooks
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            Auto-Ledger
                                        </span>
                                    </div>
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            Xero Accounting
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            Live Sync
                                        </span>
                                    </div>
                                    <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-xs flex flex-col items-center justify-center text-center">
                                        <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                            7shifts
                                        </span>
                                        <span className="font-label-caps text-label-caps uppercase text-secondary font-bold mt-1">
                                            Labor &amp; Tips
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 6. TRANSPARENT PRICING PREVIEW */}
                <section className="w-full px-gutter py-space-3xl bg-surface-container-low">
                    <div className="max-w-5xl mx-auto text-center">
                        <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block mb-space-xs">
                            Simple • Predictable
                        </span>
                        <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
                            Transparent pricing. Zero hidden transaction gouging.
                        </h2>
                        <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs max-w-xl mx-auto">
                            No setup fees, no required multi-year lockups, and no forced merchant processing fees.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg mt-space-2xl text-left">
                            {/* Tier 1 */}
                            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-xs flex flex-col justify-between">
                                <div>
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold block mb-1">
                                        Café • Single Terminal
                                    </span>
                                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                                        Essential
                                    </h3>
                                    <div className="mt-space-md mb-space-lg">
                                        <span className="font-mono-metric text-headline-lg text-on-surface font-extrabold">
                                            $69
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            / month
                                        </span>
                                    </div>
                                    <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            1 POS Station &amp; Card Reader
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Real-time menu management
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Basic shift sales reporting
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href="/register"
                                    className="mt-space-xl block text-center bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold py-space-sm rounded-lg transition-colors"
                                >
                                    Start Free Trial
                                </Link>
                            </div>

                            {/* Tier 2 (Featured) */}
                            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-xl flex flex-col justify-between relative ring-2 ring-primary">
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-caps text-label-caps uppercase px-space-md py-0.5 rounded-full font-bold">
                                    Most Popular
                                </div>
                                <div>
                                    <span className="font-label-caps text-label-caps uppercase text-primary font-bold block mb-1">
                                        Full Service • KDS Included
                                    </span>
                                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                                        Professional
                                    </h3>
                                    <div className="mt-space-md mb-space-lg">
                                        <span className="font-mono-metric text-headline-lg text-on-surface font-extrabold">
                                            $149
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            / month
                                        </span>
                                    </div>
                                    <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Unlimited terminals &amp; floor maps
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Up to 3 Kitchen Display screens (KDS)
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Recipe-level gram inventory ledger
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Split-by-seat handheld checkout
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href="/register"
                                    className="mt-space-xl block text-center bg-primary hover:bg-primary-container text-on-primary font-body-sm font-semibold py-space-sm rounded-lg shadow transition-colors"
                                >
                                    Start Free Trial
                                </Link>
                            </div>

                            {/* Tier 3 */}
                            <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-xs flex flex-col justify-between">
                                <div>
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold block mb-1">
                                        Multi-Unit • Group Ops
                                    </span>
                                    <h3 className="font-headline-md text-headline-md font-bold text-on-surface">
                                        Hospitality Group
                                    </h3>
                                    <div className="mt-space-md mb-space-lg">
                                        <span className="font-mono-metric text-headline-lg text-on-surface font-extrabold">
                                            $289
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            / month / location
                                        </span>
                                    </div>
                                    <ul className="space-y-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Centralized multi-branch commissary
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Consolidated multi-location P&amp;L
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-secondary text-[18px]">
                                                check
                                            </span>
                                            Dedicated restaurant success architect
                                        </li>
                                    </ul>
                                </div>
                                <Link
                                    href="/pricing"
                                    className="mt-space-xl block text-center bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm font-semibold py-space-sm rounded-lg transition-colors"
                                >
                                    Compare All Features
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 7. FREQUENTLY ASKED QUESTIONS */}
                <section className="w-full px-gutter py-space-3xl bg-surface">
                    <div className="max-w-4xl mx-auto">
                        <div className="text-center mb-space-2xl">
                            <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-widest block mb-space-xs">
                                Clear Answers
                            </span>
                            <h2 className="font-headline-lg text-3xl sm:text-headline-lg text-on-surface tracking-tight font-bold">
                                Frequently Asked Questions
                            </h2>
                        </div>
                        <div className="space-y-space-md">
                            {[
                                {
                                    q: 'What happens if our restaurant internet cuts out during Friday dinner rush?',
                                    a: 'Mise operates on an offline-first local mesh architecture. Even if your ISP drops completely, terminals communicate directly with kitchen printers and KDS screens over your local router. Orders fire, checks print, and offline card taps store safely in encrypted storage, automatically re-syncing to the cloud once connectivity resumes.',
                                },
                                {
                                    q: 'How fast can we migrate our existing menu and nested modifier groups?',
                                    a: 'Our concierge culinary team handles full menu ingestion within 24 hours. Simply email us your PDF menu or export from your previous POS (Toast, Square, Micros, or Lightspeed). We map all coursing flags, modifier groups, and allergen tags so you can launch immediately.',
                                },
                                {
                                    q: 'Can we test Mise alongside our current POS without breaking operations?',
                                    a: 'Yes. We frequently set up parallel pilot trials for dining rooms. You can run Mise on a single patio station or test our Kitchen Display System alongside your existing setup during our 14-day zero-risk trial period.',
                                },
                            ].map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <div
                                        key={index}
                                        className="bg-surface-container-lowest p-space-lg rounded-xl shadow-xs border border-surface-container-high"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setOpenFaq(isOpen ? null : index)}
                                            className="w-full flex items-center justify-between text-left group"
                                        >
                                            <span className="font-headline-sm text-headline-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                                                {faq.q}
                                            </span>
                                            <span className="material-symbols-outlined text-tertiary group-hover:text-primary transition-transform">
                                                {isOpen ? 'expand_less' : 'expand_more'}
                                            </span>
                                        </button>
                                        {isOpen && (
                                            <div className="mt-space-md text-on-surface-variant font-body-md text-body-md pt-space-sm border-t border-surface-container-low leading-relaxed">
                                                {faq.a}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </section>

                {/* 8. FINAL HIGH-IMPACT CONVERSION BANNER */}
                <section className="w-full px-gutter py-space-3xl bg-inverse-surface text-inverse-on-surface">
                    <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
                        <span className="font-label-caps text-label-caps uppercase bg-primary text-on-primary px-space-sm py-1 rounded font-bold mb-space-md">
                            Dinner Rush Ready
                        </span>
                        <h2 className="font-display-xl text-4xl sm:text-5xl lg:text-display-xl tracking-tight text-surface-container-lowest max-w-3xl font-extrabold">
                            Ready to quiet the dinner rush?
                        </h2>
                        <p className="font-body-lg text-body-lg text-surface-dim max-w-2xl mt-space-md mb-space-2xl">
                            Join over 1,200 ambitious restaurateurs running calm, high-velocity dining
                            rooms on Mise OS. Zero hardware lock-in. Setup in under 20 minutes.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center gap-space-md w-full justify-center">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-2xl py-space-md rounded-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <span>Start Free Trial</span>
                                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                            </Link>
                            <Link
                                href="/contact"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-space-xs bg-surface-container-high/20 hover:bg-surface-container-high/30 text-surface-container-lowest font-body-sm text-body-sm font-semibold px-space-xl py-space-md rounded-lg transition-colors"
                            >
                                <span className="material-symbols-outlined text-[18px]">support_agent</span>
                                <span>Talk to a Hospitality Specialist</span>
                            </Link>
                        </div>
                        <div className="mt-space-xl font-mono-ticket text-mono-ticket text-surface-dim">
                            No credit card required • 14-day full access • Complimentary 24-hr menu concierge
                        </div>
                    </div>
                </section>
            </div>
        </MarketingLayout>
    );
}
