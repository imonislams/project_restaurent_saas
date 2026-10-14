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
    Building2,
    Calculator,
    Check,
    CheckCircle2,
    Coffee,
    CreditCard,
    DollarSign,
    HelpCircle,
    Info,
    Shield,
    Sparkles,
    Utensils,
    Zap,
} from 'lucide-react';
import React, { useState } from 'react';

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

    const isAnnual = billingCycle === 'annual';

    // Processing calculator calculations
    // Approx 2.4% + 10c on average ticket of $45
    const txCount = cardVolume / 45;
    const restrlyProcessingFee = cardVolume * 0.024 + txCount * 0.1;
    // Legacy competitor closed bundle benchmark ~3.2% + 15c
    const compProcessingFee = cardVolume * 0.032 + txCount * 0.15;
    const monthlySavings = Math.max(0, compProcessingFee - restrlyProcessingFee);

    return (
        <MarketingLayout>
            <Head>
                <title>Pricing &amp; Plans — Restrly Restaurant Management</title>
                <meta
                    name="description"
                    content="Transparent, scale-tested restaurant POS pricing. Zero hidden transaction fees, no proprietary hardware lock-in, and 14-day unrestricted trial."
                />
            </Head>

            <div className="flex flex-col w-full">
                {/* SECTION 1: EDITORIAL PRICING HEADER */}
                <section className="relative w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-100 border border-stone-200 text-stone-800 mb-6">
                        <span className="w-2 h-2 rounded-full bg-[#B53014] animate-pulse" />
                        <span className="text-xs font-semibold tracking-wide uppercase text-stone-700">
                            Transparent &bull; No Hidden Hardware Fees
                        </span>
                    </div>

                    <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-stone-900 max-w-3xl mx-auto leading-tight">
                        Simple, honest plans for every hospitality stage
                    </h1>

                    <p className="text-base sm:text-lg text-stone-600 max-w-2xl mx-auto mt-4 leading-relaxed">
                        No arbitrary per-transaction markup, no forced proprietary hardware bundles, and no cancellation penalties. Choose your tier or explore a 14-day unrestricted trial.
                    </p>

                    {/* Billing Switcher */}
                    <div className="mt-8 inline-flex items-center p-1 rounded-full bg-stone-100 border border-stone-200">
                        <button
                            type="button"
                            onClick={() => setBillingCycle('monthly')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                                !isAnnual
                                    ? 'bg-white text-stone-900 shadow-xs'
                                    : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            Monthly Billing
                        </button>
                        <button
                            type="button"
                            onClick={() => setBillingCycle('annual')}
                            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                                isAnnual
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
                </section>

                {/* SECTION 2: THREE-COLUMN PLAN CARDS */}
                <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
                        {/* Tier 1: Counter & Café */}
                        <Card className="bg-white border-stone-200 flex flex-col justify-between">
                            <CardHeader>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                        Tier 01 &bull; Entry
                                    </span>
                                    <Coffee className="w-4 h-4 text-stone-400" />
                                </div>
                                <CardTitle className="text-xl font-bold text-stone-900">
                                    Counter &amp; Café
                                </CardTitle>
                                <CardDescription className="text-xs text-stone-600 min-h-[36px] mt-1">
                                    Single-station cafés, artisan bakeries, and high-velocity takeaway windows.
                                </CardDescription>

                                <div className="py-3 bg-stone-50 rounded-lg px-4 my-4 flex items-baseline justify-between border border-stone-100">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            ${isAnnual ? '49' : '59'}
                                        </span>
                                        <span className="text-xs text-stone-500">/ mo</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-stone-500">
                                        {isAnnual ? 'Billed annually' : 'Billed monthly'}
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 text-xs text-stone-600">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-900">
                                    Included Features
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>1 Main POS Station &amp; Card Reader</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Fast touch quick-keys &amp; modifiers</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Receipt &amp; kitchen printer routing</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>End-of-shift sales reconciliation</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Cloud backup &amp; offline mode</span>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-4">
                                <Link
                                    href="/register?plan=starter"
                                    className="w-full text-center py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors"
                                >
                                    Start 14-Day Free Trial
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Tier 2: Full Service (Featured) */}
                        <Card className="bg-white border-2 border-[#B53014] shadow-md flex flex-col justify-between relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#B53014] text-white text-[11px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
                                Most Popular
                            </div>
                            <CardHeader>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-[#B53014]">
                                        Tier 02 &bull; Growth
                                    </span>
                                    <Utensils className="w-4 h-4 text-[#B53014]" />
                                </div>
                                <CardTitle className="text-xl font-bold text-stone-900">
                                    Full Service Dining
                                </CardTitle>
                                <CardDescription className="text-xs text-stone-600 min-h-[36px] mt-1">
                                    Bistros, fine dining, and busy establishments requiring live KDS and floor plans.
                                </CardDescription>

                                <div className="py-3 bg-stone-50 rounded-lg px-4 my-4 flex items-baseline justify-between border border-stone-100">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            ${isAnnual ? '119' : '149'}
                                        </span>
                                        <span className="text-xs text-stone-500">/ mo</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-stone-500">
                                        {isAnnual ? 'Billed annually' : 'Billed monthly'}
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 text-xs text-stone-600">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-900">
                                    Everything in Counter, plus:
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Unlimited POS terminals &amp; floor maps</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Up to 3 Kitchen Display System screens (KDS)</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Live floor architect &amp; seat turn timers</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Recipe-level gram inventory ledger</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Handheld table-side check splits</span>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-4">
                                <Link
                                    href="/register?plan=professional"
                                    className="w-full text-center py-2.5 rounded-lg bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-xs font-semibold shadow-xs transition-colors"
                                >
                                    Start 14-Day Free Trial
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Tier 3: Multi-Location Group */}
                        <Card className="bg-white border-stone-200 flex flex-col justify-between">
                            <CardHeader>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                                        Tier 03 &bull; Enterprise
                                    </span>
                                    <Building2 className="w-4 h-4 text-stone-400" />
                                </div>
                                <CardTitle className="text-xl font-bold text-stone-900">
                                    Hospitality Group
                                </CardTitle>
                                <CardDescription className="text-xs text-stone-600 min-h-[36px] mt-1">
                                    Multi-branch operators, commissaries, and fast casual franchise systems.
                                </CardDescription>

                                <div className="py-3 bg-stone-50 rounded-lg px-4 my-4 flex items-baseline justify-between border border-stone-100">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-3xl font-extrabold text-stone-900">
                                            ${isAnnual ? '239' : '289'}
                                        </span>
                                        <span className="text-xs text-stone-500">/ mo / branch</span>
                                    </div>
                                    <span className="text-[11px] font-medium text-stone-500">
                                        Volume discounts 4+
                                    </span>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-3 text-xs text-stone-600">
                                <div className="text-[11px] font-bold uppercase tracking-wider text-stone-900">
                                    Enterprise Scale
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Centralized multi-branch commissary stock</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Consolidated group P&amp;L &amp; sales analytics</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Unlimited KDS screens &amp; stations</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Master recipe management &amp; cost auditing</span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Check className="w-4 h-4 text-[#B53014] shrink-0 mt-0.5" />
                                    <span>Dedicated onboarding specialist &amp; 99.99% SLA</span>
                                </div>
                            </CardContent>

                            <CardFooter className="pt-4">
                                <Link
                                    href="/contact"
                                    className="w-full text-center py-2.5 rounded-lg border border-stone-300 hover:bg-stone-50 text-stone-900 text-xs font-semibold transition-colors"
                                >
                                    Contact Hospitality Sales
                                </Link>
                            </CardFooter>
                        </Card>
                    </div>
                </section>

                {/* SECTION 3: PROCESSING SAVINGS CALCULATOR */}
                <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 sm:p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-6 space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 text-xs font-semibold uppercase tracking-wider text-stone-700">
                                    <Calculator className="w-3.5 h-3.5 text-[#B53014]" />
                                    <span>Direct Processing Comparison</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                                    Stop paying proprietary hardware processing gouges
                                </h2>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    Legacy restaurant POS vendors force you into locked merchant processing rates of 3.2% + 15¢. Restrly lets you connect transparent merchant accounts (2.4% + 10¢), saving thousands every month.
                                </p>

                                <div className="space-y-2 pt-2">
                                    <div className="flex justify-between text-xs font-semibold text-stone-700">
                                        <span>Monthly Card Volume</span>
                                        <span className="font-mono text-stone-900">
                                            ${cardVolume.toLocaleString()} / month
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="15000"
                                        max="250000"
                                        step="5000"
                                        value={cardVolume}
                                        onChange={(e) => setCardVolume(Number(e.target.value))}
                                        className="w-full accent-[#B53014] cursor-pointer"
                                    />
                                    <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                                        <span>$15,000</span>
                                        <span>$100,000</span>
                                        <span>$250,000+</span>
                                    </div>
                                </div>
                            </div>

                            <div className="lg:col-span-6 bg-white rounded-xl border border-stone-200 p-6 space-y-4 shadow-xs">
                                <div className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                    Estimated Monthly Cost Breakdown
                                </div>

                                <div className="space-y-3 text-xs">
                                    <div className="flex justify-between pb-2 border-b border-stone-100">
                                        <span className="text-stone-600">Restrly Software Tier</span>
                                        <span className="font-mono font-semibold text-stone-900">
                                            ${isAnnual ? '119.00' : '149.00'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pb-2 border-b border-stone-100">
                                        <span className="text-stone-600">Restrly Card Processing (~2.4% + 10¢)</span>
                                        <span className="font-mono font-semibold text-stone-900">
                                            ${Math.round(restrlyProcessingFee).toLocaleString()}.00
                                        </span>
                                    </div>
                                    <div className="flex justify-between pb-2 border-b border-stone-100 text-stone-500">
                                        <span>Legacy Closed POS Processing (~3.2% + 15¢)</span>
                                        <span className="font-mono font-semibold text-stone-700 line-through">
                                            ${Math.round(compProcessingFee).toLocaleString()}.00
                                        </span>
                                    </div>
                                    <div className="flex justify-between pt-2 text-sm font-bold text-stone-900">
                                        <span className="text-emerald-700">Estimated Monthly Savings:</span>
                                        <span className="font-mono text-emerald-700 text-base">
                                            +${Math.round(monthlySavings).toLocaleString()}.00 / mo
                                        </span>
                                    </div>
                                </div>

                                <p className="text-[11px] text-stone-500 pt-2 border-t border-stone-100">
                                    *Based on typical $45 check sizes. Savings scale with credit card ticket volume.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: GENUINE ACCORDION FAQ */}
                <section className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                            Clear Policies
                        </span>
                        <h2 className="text-3xl font-bold tracking-tight text-stone-900">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-stone-600 mt-2 text-sm">
                            Direct, straightforward answers for restaurant owners and general managers.
                        </p>
                    </div>

                    <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs">
                        <Accordion type="single" collapsible className="w-full space-y-2">
                            <AccordionItem value="faq-1">
                                <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                    Is there any long-term contract or cancellation penalty?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Never. Restrly operates on standard monthly or annual terms with zero cancellation fees. If your restaurant closes or changes platforms, you can export all historical data, receipts, and inventory logs in one click.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="faq-2">
                                <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                    How does the 14-day free trial work?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Your 14-day trial provides full access to the Professional tier. You can test live register transactions, design floor maps, pair network receipt printers, and configure staff PINs. No credit card is required to begin.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="faq-3">
                                <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                    Do I need to buy proprietary hardware to switch to Restrly?
                                </AccordionTrigger>
                                <AccordionContent>
                                    In over 90% of transitions, restaurants repurpose their existing iPads, Android tablets, touch displays, or PCs. Standard thermal receipt printers (Epson, Star Micronics) and RJ12 cash drawers pair directly over your local Wi-Fi router.
                                </AccordionContent>
                            </AccordionItem>

                            <AccordionItem value="faq-4">
                                <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                    How does multi-location billing work?
                                </AccordionTrigger>
                                <AccordionContent>
                                    Multi-branch accounts receive unified master billing with itemized breakdowns per restaurant location. Automated tiered volume discounts apply immediately once your group operates 4 or more active locations.
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </div>
                </section>

                {/* SECTION 5: FINAL CONVERSION CTA */}
                <section className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
                    <div className="bg-stone-900 text-white rounded-2xl p-8 sm:p-12 text-center max-w-4xl mx-auto">
                        <h2 className="text-3xl font-extrabold tracking-tight">
                            Ready to modernize your restaurant POS?
                        </h2>
                        <p className="text-stone-300 mt-3 text-base max-w-xl mx-auto">
                            Start your 14-day free trial now or speak with a specialist to review your floor setup and menu configuration.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                            <Link
                                href="/register"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-sm font-semibold px-6 py-3 rounded-lg shadow-xs transition-colors"
                            >
                                <span>Start 14-Day Free Trial</span>
                                <ArrowRight className="w-4 h-4" />
                            </Link>
                            <Link
                                href="/contact"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-700 text-white text-sm font-semibold px-6 py-3 rounded-lg border border-stone-700 transition-colors"
                            >
                                <span>Schedule Specialist Walkthrough</span>
                            </Link>
                        </div>
                    </div>
                </section>
            </div>
        </MarketingLayout>
    );
}
