import { BrandSquares, FaqSection, formatPrice, MarketingLayout, PricingPlans, Reveal } from '@/Components/Marketing';
import type { PricingPlan } from '@/Components/Marketing/PricingPlans';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Calculator, ShieldCheck } from 'lucide-react';
import { useState } from 'react';

interface PricingProps {
    plans?: PricingPlan[];
    platformCurrency?: string;
}

export default function Pricing({ plans = [], platformCurrency = 'USD' }: PricingProps) {
    const [cardVolume, setCardVolume] = useState<number>(60000);
    const featured = plans.find((p) => p.is_popular) ?? plans[0];
    const featuredMonthly = featured?.price_monthly ?? 0;

    // Approx 2.4% + 10c on an average $45 ticket vs a legacy bundle of ~3.2% + 15c
    const txCount = cardVolume / 45;
    const touchdineProcessingFee = cardVolume * 0.024 + txCount * 0.1;
    const compProcessingFee = cardVolume * 0.032 + txCount * 0.15;
    const monthlySavings = Math.max(0, compProcessingFee - touchdineProcessingFee);

    return (
        <MarketingLayout>
            <Head>
                <title>Pricing &amp; Plans — Touch Dine Restaurant Management</title>
                <meta
                    name="description"
                    content="Transparent restaurant POS pricing. Choose a plan, start a free trial and upgrade whenever you are ready."
                />
            </Head>

            <div className="flex w-full flex-col">
                <section className="relative w-full overflow-hidden bg-[#F3F2F2] px-4 pb-16 pt-20 text-center sm:px-6 lg:px-8">
                    <BrandSquares />
                    <div className="relative mx-auto max-w-3xl">
                        <Reveal>
                            <span className="mk-eyebrow">Pricing</span>
                            <h1 className="mt-4 text-4xl font-extrabold leading-[1.08] text-[#201E1D] sm:text-5xl lg:text-6xl">
                                Simple plans that grow with your restaurant
                            </h1>
                            <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">
                                Start free for {featured?.trial_days ?? 14} days. No credit card, no hardware lock-in and no cancellation fees.
                            </p>
                        </Reveal>
                    </div>
                </section>

                <section className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 lg:px-8">
                    <PricingPlans plans={plans} />
                    <Reveal className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-stone-600">
                        <span className="inline-flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-[#EC3013]" /> Secure online payment
                        </span>
                        <span>Upgrade or downgrade anytime</span>
                        <span>
                            Need a custom setup?{' '}
                            <Link href="/contact" className="font-semibold text-[#EC3013] hover:underline">
                                Contact sales
                            </Link>
                        </span>
                    </Reveal>
                </section>

                {/* SECTION 3: PROCESSING SAVINGS CALCULATOR */}
                <Reveal as="section" className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                    <div className="bg-stone-50 rounded-2xl border border-stone-200 p-6 sm:p-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            <div className="lg:col-span-6 space-y-4">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-stone-200/70 text-xs font-semibold uppercase tracking-wider text-stone-700">
                                    <Calculator className="w-3.5 h-3.5 text-[#EC3013]" />
                                    <span>Direct Processing Comparison</span>
                                </div>
                                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-900">
                                    Stop paying proprietary hardware processing gouges
                                </h2>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    Legacy restaurant POS vendors force you into locked merchant processing rates of 3.2% + 15¢. Touch Dine lets you connect transparent merchant accounts (2.4% + 10¢), saving thousands every month.
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
                                        className="w-full accent-[#EC3013] cursor-pointer"
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
                                        <span className="text-stone-600">Touch Dine {featured?.name ?? 'Software'} plan</span>
                                        <span className="font-mono font-semibold text-stone-900">
                                            {formatPrice(Math.round(featuredMonthly), featured?.currency ?? platformCurrency)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between pb-2 border-b border-stone-100">
                                        <span className="text-stone-600">Touch Dine Card Processing (~2.4% + 10¢)</span>
                                        <span className="font-mono font-semibold text-stone-900">
                                            ${Math.round(touchdineProcessingFee).toLocaleString()}.00
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
                </Reveal>

                <FaqSection className="bg-[#F3F2F2]" />

                <section className="mx-auto w-full max-w-6xl px-4 pb-20 pt-4 sm:px-6 lg:px-8">
                    <Reveal className="mx-auto max-w-4xl rounded-3xl bg-[#201E1D] p-10 text-center text-[#F3F2F2] sm:p-14">
                        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Ready to run a smoother service?</h2>
                        <p className="mx-auto mt-3 max-w-xl text-base text-stone-300">
                            Start your free trial today, or talk to a specialist about your floor and menu.
                        </p>
                        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                            <Link
                                href="/register"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EC3013] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D02710] sm:w-auto"
                            >
                                Start free trial <ArrowRight className="h-4 w-4" />
                            </Link>
                            <Link
                                href="/contact"
                                className="inline-flex w-full items-center justify-center rounded-xl border border-white/20 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
                            >
                                Talk to sales
                            </Link>
                        </div>
                    </Reveal>
                </section>
            </div>
        </MarketingLayout>
    );
}
