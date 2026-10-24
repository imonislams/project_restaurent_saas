import { Link } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { formatPrice } from './Currency';
import { Reveal } from './Motion';

export interface PricingPlan {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    currency: string;
    price_monthly: number;
    price_yearly: number;
    trial_days: number;
    features: string[];
    limits: { branches?: number | null; users?: number | null; orders_this_month?: number | null };
    is_popular?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
    pos: 'Point of sale & billing',
    kitchen: 'Kitchen display system',
    tables: 'Tables & floor plan',
    menu: 'Menu & modifiers',
    qr_dining: 'QR table ordering',
    inventory: 'Inventory & recipes',
    purchasing: 'Purchasing & suppliers',
    waste: 'Waste tracking',
    transfers: 'Branch stock transfers',
    accounts: 'Accounts & expenses',
    reports: 'Reports & analytics',
};

const limitText = (value: number | null | undefined, singular: string, plural: string) =>
    value === null || value === undefined ? `Unlimited ${plural}` : `${value.toLocaleString()} ${value === 1 ? singular : plural}`;

export default function PricingPlans({ plans, regionLabel }: { plans: PricingPlan[]; regionLabel?: string }) {
    const [cycle, setCycle] = useState<'monthly' | 'yearly'>('yearly');
    const yearly = cycle === 'yearly';

    const maxSaving = Math.max(
        0,
        ...plans.map((p) => (p.price_monthly > 0 ? Math.round((1 - p.price_yearly / (p.price_monthly * 12)) * 100) : 0)),
    );

    // No plans are published for the visitor's region yet — never show another
    // region's pricing (or fabricated numbers).
    if (plans.length === 0) {
        return (
            <div className="mx-auto max-w-xl rounded-2xl border border-stone-200 bg-stone-50 p-10 text-center">
                <h3 className="text-lg font-bold tracking-tight text-stone-900">
                    {regionLabel ? `${regionLabel} pricing is being finalised` : 'Pricing is being finalised'}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">
                    Plans for your region will be available shortly. In the meantime, our team can put together a tailored quote for your restaurant.
                </p>
                <Link
                    href="/contact"
                    className="mt-6 inline-flex items-center justify-center rounded-xl bg-[#EC3013] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#D02710]"
                >
                    Talk to sales
                </Link>
            </div>
        );
    }

    return (
        <div>
            {regionLabel && (
                <p className="mb-6 text-center text-xs font-semibold uppercase tracking-wider text-stone-500">
                    Showing {regionLabel} pricing
                </p>
            )}
            <div className="flex justify-center">
                <div className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 p-1" role="group" aria-label="Billing cycle">
                    {(['monthly', 'yearly'] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            aria-pressed={cycle === c}
                            onClick={() => setCycle(c)}
                            className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                                cycle === c ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-600 hover:text-stone-900'
                            }`}
                        >
                            {c === 'monthly' ? 'Monthly' : 'Yearly'}
                            {c === 'yearly' && maxSaving > 0 && (
                                <span className="rounded-full bg-[#EC3013]/10 px-2 py-0.5 text-[11px] font-bold text-[#EC3013]">
                                    Save {maxSaving}%
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-12 grid grid-cols-1 items-stretch gap-6 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan, i) => {
                    const price = yearly ? plan.price_yearly : plan.price_monthly;
                    const perMonth = yearly ? plan.price_yearly / 12 : plan.price_monthly;
                    const highlight = !!plan.is_popular;
                    const modules = plan.features.map((f) => FEATURE_LABELS[f] ?? f.replace(/_/g, ' '));
                    const items = [
                        limitText(plan.limits.branches, 'branch', 'branches'),
                        limitText(plan.limits.users, 'staff account', 'staff accounts'),
                        limitText(plan.limits.orders_this_month, 'order / month', 'orders / month'),
                        ...modules,
                    ];

                    return (
                        <Reveal key={plan.id} delay={i * 90} className="flex">
                            <article
                                className={`relative flex w-full flex-col rounded-2xl border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                                    highlight ? 'border-[#EC3013] shadow-lg ring-1 ring-[#EC3013]/20' : 'border-stone-200 shadow-sm'
                                }`}
                            >
                                {highlight && (
                                    <span className="absolute -top-3 left-7 rounded-full bg-[#EC3013] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white">
                                        Most popular
                                    </span>
                                )}

                                <h3 className="text-xl font-bold tracking-tight text-stone-900">{plan.name}</h3>
                                <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-stone-600">{plan.description}</p>

                                <div className="mt-6 flex items-baseline gap-1.5">
                                    <span className="text-5xl font-extrabold tracking-tight text-stone-900 tabular-nums">
                                        {formatPrice(Math.round(perMonth), plan.currency)}
                                    </span>
                                    <span className="text-sm text-stone-500">/ month</span>
                                </div>
                                <p className="mt-1 h-5 text-xs text-stone-500">
                                    {yearly ? `Billed ${formatPrice(price, plan.currency)} per year` : 'Billed monthly'}
                                </p>

                                <Link
                                    href={`/register?plan=${plan.slug}&cycle=${cycle}`}
                                    className={`mt-6 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 ${
                                        highlight
                                            ? 'bg-[#EC3013] text-white shadow-sm hover:bg-[#D02710]'
                                            : 'border border-stone-300 text-stone-900 hover:border-stone-900 hover:bg-stone-900 hover:text-white'
                                    }`}
                                >
                                    Start {plan.trial_days}-day free trial
                                </Link>
                                <p className="mt-2 text-center text-xs text-stone-500">No credit card required</p>

                                <div className="my-6 h-px bg-stone-200" />

                                <ul className="flex flex-1 flex-col gap-3 text-sm text-stone-700">
                                    {items.map((text, idx) => (
                                        <li key={text} className="flex items-start gap-2.5">
                                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#EC3013]" strokeWidth={2.5} />
                                            <span className={idx < 3 ? 'font-semibold text-stone-900' : ''}>{text}</span>
                                        </li>
                                    ))}
                                </ul>
                            </article>
                        </Reveal>
                    );
                })}
            </div>
        </div>
    );
}
