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

interface PricingProps {
    plans?: Plan[];
    platformCurrency?: string;
}

export default function Pricing({
    plans = [],
    platformCurrency = 'USD',
}: PricingProps) {
    const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>('annual');
    const [cardVolume, setCardVolume] = useState<number>(60000);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    // Processing calculator calculations
    // Approx 2.4% + 10c on average ticket of $45
    const txCount = cardVolume / 45;
    const miseProcessingFee = cardVolume * 0.024 + txCount * 0.1;
    // Competitor closed bundle benchmark ~3.2% + 15c
    const compProcessingFee = cardVolume * 0.032 + txCount * 0.15;
    const monthlySavings = Math.max(0, compProcessingFee - miseProcessingFee);

    const isAnnual = billingCycle === 'annual';

    return (
        <MarketingLayout>
            <Head>
                <title>Pricing &amp; Plans - Mise Restaurant POS</title>
                <meta
                    name="description"
                    content="Transparent, scale-tested restaurant POS pricing. Zero hidden transaction fees, no proprietary hardware lock-in, and 14-day unrestricted trial."
                />
            </Head>

            <div className="flex flex-col w-full">
                {/* SECTION 1: EDITORIAL PRICING HEADER */}
                <section className="relative w-full max-w-7xl mx-auto px-gutter pt-space-2xl pb-space-xl">
                    <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-space-xs bg-surface-container px-space-md py-space-xs rounded-full shadow-xs mb-space-md">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                            <span className="font-label-caps text-label-caps uppercase text-on-surface-variant tracking-wider font-bold">
                                Transparent, Scale-Tested Pricing
                            </span>
                        </div>

                        <h1 className="font-display-xl text-4xl sm:text-5xl lg:text-display-xl text-on-surface tracking-tight mb-space-md font-extrabold">
                            Simple, honest plans for every hospitality stage
                            <span className="text-primary">.</span>
                        </h1>

                        <p className="font-body-lg text-lg sm:text-body-lg text-on-surface-variant leading-relaxed max-w-2xl">
                            No hidden transaction penalties, no forced hardware bundles, and no surprise
                            termination fees. Choose your tier or explore a 14-day unrestricted trial.
                        </p>

                        {/* Billing Switcher */}
                        <div className="mt-space-xl inline-flex items-center p-1 bg-surface-container rounded-full shadow-xs">
                            <button
                                type="button"
                                onClick={() => setBillingCycle('monthly')}
                                className={`px-space-lg py-space-xs rounded-full font-body-sm text-body-sm transition-all duration-200 ${
                                    !isAnnual
                                        ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                Monthly Billing
                            </button>
                            <button
                                type="button"
                                onClick={() => setBillingCycle('annual')}
                                className={`px-space-lg py-space-xs rounded-full font-body-sm text-body-sm font-semibold transition-all duration-200 flex items-center gap-space-xs ${
                                    isAnnual
                                        ? 'bg-surface-container-lowest text-on-surface shadow-xs font-semibold'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                <span>Billed Annually</span>
                                <span className="font-label-caps text-[10px] uppercase text-primary bg-primary-fixed px-2 py-0.5 rounded-full font-bold">
                                    Save 20%
                                </span>
                            </button>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: THREE-COLUMN ARCHITECTURAL TIER CARDS */}
                <section className="w-full max-w-7xl mx-auto px-gutter py-space-lg">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter items-stretch">
                        {/* Tier 1: Counter & Café */}
                        <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-xl shadow-xs hover:shadow-md transition-all border border-surface-container-high">
                            <div>
                                <div className="flex items-center justify-between mb-space-md">
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider font-bold">
                                        Tier 01 • Entry
                                    </span>
                                    <span className="material-symbols-outlined text-tertiary text-[20px]">
                                        local_cafe
                                    </span>
                                </div>
                                <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                                    Counter &amp; Café
                                </h2>
                                <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mb-space-lg">
                                    Single-station cafes, artisan bakeries, coffee roasters, and high-velocity
                                    takeaway windows.
                                </p>

                                <div className="py-space-md bg-surface-container-low rounded-lg px-space-md mb-space-lg flex items-baseline gap-space-xs">
                                    <span className="font-mono-metric text-mono-metric text-on-surface font-bold">
                                        ${isAnnual ? '49' : '59'}
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                        / month
                                    </span>
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary ml-auto font-bold">
                                        {isAnnual ? 'Billed annually' : 'Billed monthly'}
                                    </span>
                                </div>

                                <div className="space-y-space-sm mb-space-xl">
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary block mb-space-xs font-bold">
                                        Included Operations
                                    </span>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            1 dedicated POS Register terminal
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Unlimited menu items &amp; modifier cascades
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Basic ingredient inventory &amp; 86-list tracking
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Staff PIN switching &amp; cash drawer audits
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Standard priority email &amp; in-app chat support
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-space-md border-t border-surface-container-low">
                                <Link
                                    href="/register"
                                    className="w-full inline-flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold px-space-lg py-space-sm rounded-lg transition-all"
                                >
                                    Start 14-Day Free Trial
                                </Link>
                                <span className="font-label-caps text-center text-[10px] text-tertiary block mt-space-xs uppercase tracking-wider">
                                    No credit card required
                                </span>
                            </div>
                        </div>

                        {/* Tier 2: Full-Service Restaurant (Most Popular / Highlighted) */}
                        <div className="relative flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-xl shadow-lg border-2 border-primary lg:-translate-y-2">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-on-primary font-label-caps text-[10px] uppercase font-bold tracking-widest px-space-md py-1 rounded-full shadow-xs whitespace-nowrap">
                                Recommended for Dining Rooms
                            </div>
                            <div>
                                <div className="flex items-center justify-between mb-space-md pt-space-xs">
                                    <span className="font-label-caps text-label-caps uppercase text-primary font-bold tracking-wider">
                                        Tier 02 • Dining &amp; Bar
                                    </span>
                                    <span className="material-symbols-outlined text-primary text-[20px]">
                                        restaurant
                                    </span>
                                </div>
                                <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                                    Full-Service Restaurant
                                </h2>
                                <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mb-space-lg">
                                    Neighborhood bistros, fine dining spaces, craft bars, and multi-station
                                    service dining rooms.
                                </p>

                                <div className="py-space-md bg-secondary-container rounded-lg px-space-md mb-space-lg flex items-baseline gap-space-xs">
                                    <span className="font-mono-metric text-mono-metric text-on-secondary-fixed font-bold">
                                        ${isAnnual ? '99' : '119'}
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-secondary-fixed-variant">
                                        / month
                                    </span>
                                    <span className="font-label-caps text-label-caps uppercase text-secondary ml-auto font-bold">
                                        {isAnnual ? 'Billed annually' : 'Billed monthly'}
                                    </span>
                                </div>

                                <div className="space-y-space-sm mb-space-xl">
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary block mb-space-xs font-bold">
                                        Full Hospitality Suite
                                    </span>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface font-semibold">
                                            Up to 3 active POS / Handheld stations
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Native Kitchen Display System (KDS) chit routing
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Interactive floor map &amp; table turn timer metrics
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Sub-recipe cost yields &amp; threshold stock warnings
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Granular split checks, seat pacing &amp; auto-gratuity
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            24/7 priority emergency live phone hotline
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-space-md border-t border-surface-container-low">
                                <Link
                                    href="/register"
                                    className="w-full inline-flex items-center justify-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-lg py-space-sm rounded-lg shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                                >
                                    Start 14-Day Free Trial
                                </Link>
                                <span className="font-label-caps text-center text-[10px] text-tertiary block mt-space-xs uppercase tracking-wider">
                                    Unrestricted access • instant setup
                                </span>
                            </div>
                        </div>

                        {/* Tier 3: Enterprise & Multi-Branch */}
                        <div className="flex flex-col justify-between bg-surface-container-lowest rounded-xl p-space-xl shadow-xs hover:shadow-md transition-all border border-surface-container-high">
                            <div>
                                <div className="flex items-center justify-between mb-space-md">
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider font-bold">
                                        Tier 03 • Group
                                    </span>
                                    <span className="material-symbols-outlined text-tertiary text-[20px]">
                                        domain
                                    </span>
                                </div>
                                <h2 className="font-headline-md text-headline-md font-bold text-on-surface mb-space-xs">
                                    Enterprise &amp; Multi-Branch
                                </h2>
                                <p className="font-body-sm text-body-sm text-on-surface-variant min-h-[40px] mb-space-lg">
                                    Multi-concept hospitality groups, regional chains, and shared
                                    commissary production hubs.
                                </p>

                                <div className="py-space-md bg-surface-container-low rounded-lg px-space-md mb-space-lg flex items-baseline gap-space-xs">
                                    <span className="font-mono-metric text-mono-metric text-on-surface font-bold">
                                        ${isAnnual ? '199' : '239'}
                                    </span>
                                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                                        / mo / branch
                                    </span>
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary ml-auto font-bold">
                                        {isAnnual ? 'Billed annually' : 'Billed monthly'}
                                    </span>
                                </div>

                                <div className="space-y-space-sm mb-space-xl">
                                    <span className="font-label-caps text-label-caps uppercase text-tertiary block mb-space-xs font-bold">
                                        Enterprise Orchestration
                                    </span>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Unlimited POS, handheld &amp; KDS stations per hub
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Centralized master menu matrix &amp; regional pricing
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Commissary transfer logistics &amp; combined supplier POs
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Cross-unit consolidated P&amp;L and royalty tracking
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Dedicated Account Director &amp; menu migration concierge
                                        </span>
                                    </div>
                                    <div className="flex items-start gap-space-sm">
                                        <span className="material-symbols-outlined text-secondary text-[18px] shrink-0 mt-0.5">
                                            check_circle
                                        </span>
                                        <span className="font-body-sm text-body-sm text-on-surface">
                                            Custom ERP sync, custom webhooks &amp; 99.99% SLA
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-space-md border-t border-surface-container-low">
                                <Link
                                    href="/contact"
                                    className="w-full inline-flex items-center justify-center bg-on-surface hover:bg-inverse-surface text-surface-container-lowest font-body-sm text-body-sm font-semibold px-space-lg py-space-sm rounded-lg transition-all"
                                >
                                    Schedule Executive Walkthrough
                                </Link>
                                <span className="font-label-caps text-center text-[10px] text-tertiary block mt-space-xs uppercase tracking-wider">
                                    Volume discounts at 5+ units
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 3: MODULAR ADD-ONS & HARDWARE AGNOSTIC PHILOSOPHY */}
                <section className="w-full max-w-7xl mx-auto px-gutter py-space-2xl">
                    <div className="bg-surface-container-low rounded-xl p-space-xl lg:p-space-2xl border border-surface-container-high shadow-xs">
                        <div className="max-w-2xl mb-space-xl">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider block mb-space-xs font-bold">
                                Modular Architecture
                            </span>
                            <h2 className="font-headline-lg text-3xl sm:text-headline-lg font-bold text-on-surface mb-space-sm">
                                Modular add-ons when you need them.
                            </h2>
                            <p className="font-body-md text-body-md text-on-surface-variant">
                                Expand system capability on your terms. No bloated locked bundles — scale your
                                operational stack precisely as your dining room grows.
                            </p>
                        </div>

                        {/* Addon Cards Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-space-2xl">
                            <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-xs flex flex-col justify-between border border-surface-container-high">
                                <div>
                                    <div className="flex items-center justify-between mb-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[22px]">
                                            desktop_windows
                                        </span>
                                        <span className="font-mono-metric text-[18px] font-bold text-on-surface">
                                            +$25<span className="text-body-sm font-normal text-on-surface-variant">/mo</span>
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        KDS Stations
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Expeditor &amp; line cook screens with real-time station timers and coursing hold toggles.
                                    </p>
                                </div>
                                <div className="mt-space-md pt-space-xs">
                                    <span className="font-label-caps text-[10px] uppercase text-secondary font-bold">
                                        Per screen license
                                    </span>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-xs flex flex-col justify-between border border-surface-container-high">
                                <div>
                                    <div className="flex items-center justify-between mb-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[22px]">
                                            qr_code_scanner
                                        </span>
                                        <span className="font-mono-metric text-[18px] font-bold text-on-surface">
                                            +$39<span className="text-body-sm font-normal text-on-surface-variant">/mo</span>
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Digital QR &amp; Web Order
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Direct table payment and web takeaway orders. 0% Mise commissions or marketplace fees.
                                    </p>
                                </div>
                                <div className="mt-space-md pt-space-xs">
                                    <span className="font-label-caps text-[10px] uppercase text-secondary font-bold">
                                        Zero commission model
                                    </span>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-xs flex flex-col justify-between border border-surface-container-high">
                                <div>
                                    <div className="flex items-center justify-between mb-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[22px]">
                                            calculate
                                        </span>
                                        <span className="font-mono-metric text-[18px] font-bold text-on-surface">
                                            +$45<span className="text-body-sm font-normal text-on-surface-variant">/mo</span>
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        Recipe COGS Engine
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Yield loss calculations, plate profit margin analytics, and automatic vendor invoice scanning.
                                    </p>
                                </div>
                                <div className="mt-space-md pt-space-xs">
                                    <span className="font-label-caps text-[10px] uppercase text-secondary font-bold">
                                        Live margin optimization
                                    </span>
                                </div>
                            </div>

                            <div className="bg-surface-container-lowest p-space-lg rounded-lg shadow-xs flex flex-col justify-between border border-surface-container-high">
                                <div>
                                    <div className="flex items-center justify-between mb-space-sm">
                                        <span className="material-symbols-outlined text-primary text-[22px]">
                                            devices
                                        </span>
                                        <span className="font-mono-metric text-[18px] font-bold text-secondary">
                                            $0<span className="text-body-sm font-normal text-on-surface-variant">/mo</span>
                                        </span>
                                    </div>
                                    <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-space-xs">
                                        BYO Handhelds
                                    </h3>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                                        Deploy server handheld terminals using standard iPhones or Android devices with zero hardware lock.
                                    </p>
                                </div>
                                <div className="mt-space-md pt-space-xs">
                                    <span className="font-label-caps text-[10px] uppercase text-secondary font-bold">
                                        Unmetered BYOD
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Hardware Agnostic Banner */}
                        <div className="bg-surface-container-lowest rounded-xl p-space-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg shadow-xs border border-surface-container-high">
                            <div className="flex items-start gap-space-md">
                                <div className="w-12 h-12 rounded-lg bg-secondary-container flex items-center justify-center shrink-0">
                                    <span className="material-symbols-outlined text-secondary text-[26px]">
                                        print
                                    </span>
                                </div>
                                <div>
                                    <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">
                                        Hardware Agnostic by Principle
                                    </h4>
                                    <p className="font-body-sm text-body-sm text-on-surface-variant max-w-2xl">
                                        Use the commercial equipment you already own. Mise runs natively on iPads, Android tablets, Elo touch displays, Star Micronics &amp; Epson thermal receipt printers, and APG cash drawers.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-space-md shrink-0">
                                <span className="font-mono-ticket text-mono-ticket text-secondary bg-secondary-container px-space-md py-1.5 rounded-full font-bold">
                                    ESC/POS • iOS • Android
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: GRANULAR FEATURE COMPARISON MATRIX */}
                <section className="w-full max-w-7xl mx-auto px-gutter py-space-2xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-xl">
                        <div>
                            <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider block mb-space-xs font-bold">
                                Operational Capabilities
                            </span>
                            <h2 className="font-headline-lg text-3xl sm:text-headline-lg font-bold text-on-surface">
                                Granular Feature Ledger
                            </h2>
                        </div>
                        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md mt-space-sm md:mt-0">
                            Every capability engineered for speed, table turnover velocity, and fiscal accountability during critical service hours.
                        </p>
                    </div>

                    <div className="overflow-x-auto bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container-high">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-surface-container-low border-b border-surface-container-high">
                                    <th className="py-space-md px-space-lg font-label-caps text-label-caps uppercase text-tertiary w-2/5 font-bold">
                                        System Module
                                    </th>
                                    <th className="py-space-md px-space-md font-label-caps text-label-caps uppercase text-center text-on-surface w-1/5 font-bold">
                                        Counter &amp; Café
                                    </th>
                                    <th className="py-space-md px-space-md font-label-caps text-label-caps uppercase text-center text-primary font-bold w-1/5">
                                        Full-Service
                                    </th>
                                    <th className="py-space-md px-space-lg font-label-caps text-label-caps uppercase text-center text-on-surface w-1/5 font-bold">
                                        Enterprise
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="font-body-sm text-body-sm divide-y divide-surface-container-high">
                                {/* Cat 1 */}
                                <tr className="bg-surface-container-high/60 font-bold">
                                    <td className="py-space-xs px-space-lg font-label-caps text-label-caps uppercase text-tertiary tracking-wider" colSpan={4}>
                                        01 • Point of Sale &amp; Register Speed
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Offline payment storage &amp; continuous mode</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Dynamic cascading modifiers &amp; combo builder</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Sub-second biometric &amp; numeric PIN staff switching</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Simultaneous multi-terminal split ticket checkouts</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>

                                {/* Cat 2 */}
                                <tr className="bg-surface-container-high/60 font-bold">
                                    <td className="py-space-xs px-space-lg font-label-caps text-label-caps uppercase text-tertiary tracking-wider" colSpan={4}>
                                        02 • Kitchen Operations &amp; Dining Floor
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Floor architect with table status &amp; turnaround timers</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Coursing management (Appetizer, Entree, Dessert holds)</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Multi-station chit routing (Grill, Cold, Bar, Pass)</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>

                                {/* Cat 3 */}
                                <tr className="bg-surface-container-high/60 font-bold">
                                    <td className="py-space-xs px-space-lg font-label-caps text-label-caps uppercase text-tertiary tracking-wider" colSpan={4}>
                                        03 • Inventory, Costing &amp; Sourcing
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Unit-level raw ingredient consumption tracking</td>
                                    <td className="py-space-sm px-space-md text-center font-mono-ticket text-[12px] text-tertiary">Basic</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Automated par-level purchase order generation</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Commissary transfers &amp; central supply replenishment</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>

                                {/* Cat 4 */}
                                <tr className="bg-surface-container-high/60 font-bold">
                                    <td className="py-space-xs px-space-lg font-label-caps text-label-caps uppercase text-tertiary tracking-wider" colSpan={4}>
                                        04 • Management, Labor &amp; Analytics
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Automated end-of-day Z-Report generation &amp; email</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Staff time-clock &amp; live sales-to-labor % monitoring</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Direct QuickBooks, Xero &amp; Restaurant365 ledger sync</td>
                                    <td className="py-space-sm px-space-md text-center text-tertiary">—</td>
                                    <td className="py-space-sm px-space-md text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                    <td className="py-space-sm px-space-lg text-center"><span className="material-symbols-outlined text-secondary text-[18px]">check</span></td>
                                </tr>

                                {/* Cat 5 */}
                                <tr className="bg-surface-container-high/60 font-bold">
                                    <td className="py-space-xs px-space-lg font-label-caps text-label-caps uppercase text-tertiary tracking-wider" colSpan={4}>
                                        05 • Support, SLA &amp; Concierge
                                    </td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Support channel coverage</td>
                                    <td className="py-space-sm px-space-md text-center font-body-sm text-[12px] text-on-surface-variant">Email &amp; Chat</td>
                                    <td className="py-space-sm px-space-md text-center font-body-sm text-[12px] text-primary font-semibold">24/7 Priority Phone</td>
                                    <td className="py-space-sm px-space-lg text-center font-body-sm text-[12px] text-on-surface font-semibold">Dedicated Lead</td>
                                </tr>
                                <tr className="hover:bg-surface-container-low transition-colors">
                                    <td className="py-space-sm px-space-lg text-on-surface">Guaranteed Uptime Service Level Agreement</td>
                                    <td className="py-space-sm px-space-md text-center font-mono-ticket text-[12px] text-on-surface-variant">99.9%</td>
                                    <td className="py-space-sm px-space-md text-center font-mono-ticket text-[12px] text-on-surface font-semibold">99.95%</td>
                                    <td className="py-space-sm px-space-lg text-center font-mono-ticket text-[12px] text-secondary font-bold">99.99%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECTION 5: TRANSPARENT PAYMENT PROCESSING CALCULATOR */}
                <section className="w-full max-w-7xl mx-auto px-gutter py-space-2xl">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
                        {/* Architecture left */}
                        <div className="lg:col-span-6 bg-surface-container-lowest rounded-xl p-space-xl shadow-xs border border-surface-container-high">
                            <div className="inline-flex items-center gap-space-xs bg-secondary-container px-space-md py-0.5 rounded-full mb-space-md">
                                <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                                <span className="font-label-caps text-label-caps uppercase text-on-secondary-container font-semibold">
                                    Clear interchange mechanics
                                </span>
                            </div>
                            <h3 className="font-headline-lg text-2xl sm:text-headline-lg font-bold text-on-surface mb-space-sm">
                                Zero markup processing. Or keep your existing merchant.
                            </h3>
                            <p className="font-body-md text-body-md text-on-surface-variant mb-space-lg">
                                Unlike legacy systems that lock you into predatory 3.5% credit card fees or penalize you for using external payment gateways, Mise provides radical transparency.
                            </p>
                            <div className="grid grid-cols-2 gap-space-md mb-space-lg">
                                <div className="p-space-md bg-surface-container-low rounded-lg">
                                    <span className="font-label-caps text-[10px] uppercase text-tertiary block mb-1 font-bold">
                                        Mise Direct Payments
                                    </span>
                                    <div className="font-mono-metric text-headline-md text-primary font-bold">
                                        2.4% + 10¢
                                    </div>
                                    <span className="font-body-sm text-[12px] text-on-surface-variant mt-1 block">
                                        In-person tap, chip, &amp; swipe. Next-day deposits.
                                    </span>
                                </div>
                                <div className="p-space-md bg-surface-container-low rounded-lg">
                                    <span className="font-label-caps text-[10px] uppercase text-tertiary block mb-1 font-bold">
                                        Bring Your Own Gateway
                                    </span>
                                    <div className="font-mono-metric text-headline-md text-on-surface font-bold">
                                        $0 Surcharge
                                    </div>
                                    <span className="font-body-sm text-[12px] text-on-surface-variant mt-1 block">
                                        Compatible with Worldpay, First Data, TSYS &amp; Stripe.
                                    </span>
                                </div>
                            </div>
                            <div className="p-space-md bg-surface-container rounded-lg flex items-start gap-space-sm">
                                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">
                                    verified
                                </span>
                                <p className="font-body-sm text-body-sm text-on-surface">
                                    We never charge non-compliance fines, monthly minimum statement penalties, or early account termination surcharges.
                                </p>
                            </div>
                        </div>

                        {/* Interactive Calculator Right */}
                        <div className="lg:col-span-6 bg-surface-container rounded-xl p-space-xl shadow-xs border border-surface-container-high">
                            <div className="flex items-center justify-between mb-space-md">
                                <h4 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                                    Fee Transparency Calculator
                                </h4>
                                <span className="font-label-caps text-label-caps uppercase text-tertiary font-bold">
                                    Real Estimates
                                </span>
                            </div>
                            <div className="space-y-space-lg">
                                <div>
                                    <div className="flex justify-between items-center mb-space-xs font-body-sm">
                                        <span className="text-on-surface font-medium">Estimated Monthly Card Volume</span>
                                        <span className="font-mono-metric text-[18px] text-primary font-bold">
                                            ${cardVolume.toLocaleString()}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min={15000}
                                        max={250000}
                                        step={5000}
                                        value={cardVolume}
                                        onChange={(e) => setCardVolume(Number(e.target.value))}
                                        className="w-full accent-primary h-2 bg-surface-container-highest rounded-lg cursor-pointer"
                                    />
                                    <div className="flex justify-between font-mono-ticket text-[11px] text-tertiary mt-1">
                                        <span>$15,000/mo</span>
                                        <span>$125,000/mo</span>
                                        <span>$250,000/mo</span>
                                    </div>
                                </div>

                                <div className="p-space-lg bg-surface-container-lowest rounded-lg shadow-xs space-y-space-md border border-surface-container-high">
                                    <div className="flex items-center justify-between">
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            Estimated Mise Monthly POS (Full-Service)
                                        </span>
                                        <span className="font-mono-ticket text-mono-ticket font-bold text-on-surface">
                                            ${isAnnual ? '99.00' : '119.00'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="font-body-sm text-body-sm text-on-surface-variant">
                                            Typical In-Person Card Processing (2.4% + 10¢)
                                        </span>
                                        <span className="font-mono-ticket text-mono-ticket font-bold text-on-surface">
                                            ${Math.round(miseProcessingFee).toLocaleString()}.00
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-secondary font-semibold pt-space-xs border-t border-surface-container-high">
                                        <span className="font-body-sm text-body-sm">
                                            Average Savings vs. Closed Systems (3.2%)
                                        </span>
                                        <span className="font-mono-ticket text-headline-sm font-bold text-secondary">
                                            +${Math.round(monthlySavings).toLocaleString()}.00/mo
                                        </span>
                                    </div>
                                </div>

                                <p className="font-mono-ticket text-[11px] text-on-surface-variant leading-relaxed">
                                    *Based on an average table ticket of $45. Closed system benchmark calculates a typical 3.2% proprietary terminal bundle rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 6: FAQS */}
                <section className="w-full max-w-7xl mx-auto px-gutter py-space-2xl">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-space-2xl">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary tracking-wider block mb-space-xs font-bold">
                                Clear Policies
                            </span>
                            <h2 className="font-headline-lg text-3xl sm:text-headline-lg font-bold text-on-surface">
                                Frequently Asked Questions
                            </h2>
                            <p className="font-body-md text-body-md text-on-surface-variant mt-space-xs">
                                Direct, honest answers for restaurant general managers, culinary directors, and operators.
                            </p>
                        </div>

                        <div className="space-y-space-md">
                            {[
                                {
                                    q: 'Is there any long-term contract or cancellation fee?',
                                    a: 'Never. Mise operates on pure monthly or annual subscription terms. You can cancel, downgrade, or upgrade your plan anytime without penalty, equipment clawback fees, or legal lock-ins.',
                                },
                                {
                                    q: 'How does the 14-day free trial work?',
                                    a: 'Your 14-day trial provides 100% unrestricted access to all features. You can import your actual restaurant menu, test receipt printing on existing network hardware, and run live demo service. No credit card is required to begin.',
                                },
                                {
                                    q: 'Do I need to buy proprietary hardware to switch to Mise?',
                                    a: 'In over 90% of transitions, restaurants repurpose their existing hardware. Mise is native to iPadOS, Android, and web. Standard thermal receipt printers (Epson, Star) and standard RJ12 cash drawers pair instantly without proprietary adapter fees.',
                                },
                                {
                                    q: 'How does billing work across multiple restaurant branches?',
                                    a: 'Multi-branch groups receive unified master invoicing with itemized branch summaries. Automated tiered volume discounts apply immediately once your group scales beyond 4 active dining locations.',
                                },
                            ].map((faq, index) => {
                                const isOpen = openFaq === index;
                                return (
                                    <div
                                        key={index}
                                        className="bg-surface-container-lowest rounded-xl p-space-lg shadow-xs border border-surface-container-high"
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

                {/* SECTION 7: FINAL CONVERSION RUNWAY */}
                <section className="w-full max-w-7xl mx-auto px-gutter pt-space-xl pb-space-3xl">
                    <div className="relative bg-surface-container-lowest rounded-2xl p-space-xl lg:p-space-3xl shadow-sm border border-surface-container-high overflow-hidden">
                        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
                        <div className="relative z-10 max-w-3xl">
                            <div className="inline-flex items-center gap-space-xs bg-secondary-container px-space-md py-space-xs rounded-full shadow-xs mb-space-md">
                                <span className="material-symbols-outlined text-secondary text-[16px]">
                                    bolt
                                </span>
                                <span className="font-label-caps text-label-caps uppercase text-on-secondary-container font-semibold">
                                    Average switchover time: Under 48 hours
                                </span>
                            </div>
                            <h2 className="font-display-xl text-3xl sm:text-headline-lg lg:text-display-xl text-on-surface tracking-tight mb-space-md font-extrabold">
                                Ready to elevate your dining room operations?
                            </h2>
                            <p className="font-body-lg text-body-lg text-on-surface-variant mb-space-2xl">
                                Get started with our 14-day zero-risk trial or speak directly with a former general manager who knows restaurant mechanics inside out.
                            </p>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md">
                                <Link
                                    href="/register"
                                    className="inline-flex items-center justify-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-xl py-space-md rounded-lg shadow transition-all hover:scale-[1.02] active:scale-[0.98]"
                                >
                                    Get Started in 20 Minutes
                                </Link>
                                <Link
                                    href="/contact"
                                    className="inline-flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold px-space-xl py-space-md rounded-lg transition-all"
                                >
                                    Book a 1-on-1 Consultation
                                </Link>
                            </div>
                            <div className="mt-space-xl flex flex-wrap items-center gap-space-lg font-mono-ticket text-mono-ticket text-tertiary">
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-secondary text-[16px]">check</span> Zero credit card required
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-secondary text-[16px]">check</span> Free menu file onboarding
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-secondary text-[16px]">check</span> Cancel anytime
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </MarketingLayout>
    );
}
