import {
    Button,
    formatPrice,
    getCurrencySymbol,
    MarketingHead,
    MarketingLayout,
    SectionHeading,
    trackConversion,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';
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

export default function Pricing({
    plans = [],
    platformCurrency = 'USD',
}: {
    plans: Plan[];
    platformCurrency?: string;
}) {
    const [annualBilling, setAnnualBilling] = useState(true);
    const [openFaq, setOpenFaq] = useState<number | null>(0);

    const billingFaqs = [
        {
            q: 'How does the 14-day free trial work?',
            a: 'When you create a Restrly account, you immediately receive full access to your selected plan for 14 days. No credit card or billing details are required. If you decide not to continue, your workspace safely pauses with zero charges.',
        },
        {
            q: 'Can I change my plan or billing cycle later?',
            a: 'Yes. You can upgrade, downgrade, or switch between monthly and annual billing at any time from your tenant Subscription settings. Upgrades take effect immediately with prorated credits applied to your next invoice.',
        },
        {
            q: 'What payment methods do you accept?',
            a: 'Restrly accepts Visa, Mastercard, American Express, and regional gateway settlements including SSLCommerz and mobile banking. High-volume and multi-branch customers can also arrange annual bank transfer invoicing.',
        },
        {
            q: 'What happens if we reach our monthly order limit on Starter or Growth?',
            a: 'We never shut down your point of sale during active service. If your order volume exceeds plan limits, we notify you to upgrade to the next tier before the start of the next billing cycle.',
        },
        {
            q: 'Are there hidden setup fees or terminal licensing fees?',
            a: 'No. The subscription price covers all cloud hosting, database isolation, feature updates, and customer support. You bring your own tablets or computers with zero proprietary hardware licensing fees.',
        },
        {
            q: 'What is your cancellation and refund policy?',
            a: 'You can cancel anytime with one click in your settings. Your access continues until the end of your prepaid billing period. We provide prorated refunds on annual subscriptions within the first 30 days if Restrly does not fit your operational workflow.',
        },
    ];

    const comparisonRows = [
        { category: 'General & Limits' },
        { name: 'Locations / Branches Included', starter: '1 Branch', growth: 'Up to 3 Branches', business: 'Unlimited Branches' },
        { name: 'Staff User Accounts', starter: 'Up to 5 Users', growth: 'Up to 25 Users', business: 'Unlimited Users' },
        { name: 'Monthly Order Volume', starter: '1,000 Orders / mo', growth: '10,000 Orders / mo', business: 'Unlimited Orders' },
        { name: '14-Day Free Trial', starter: '✓ Full Access', growth: '✓ Full Access', business: '✓ Full Access' },

        { category: 'Front of House Service' },
        { name: 'Point of Sale (POS Terminal)', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
        { name: 'Split Checks & Multi-Tender', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
        { name: 'Kitchen Display System (KDS)', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
        { name: 'Table & Dining Area Floorplan', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Order Fulfillment Pipeline', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },

        { category: 'Kitchen, Menu & Inventory' },
        { name: 'Menu & Category Catalog', starter: '✓ Core Catalog', growth: '✓ Advanced Variants', business: '✓ Multi-Tier Master' },
        { name: 'Recipe Bill of Materials (BOM)', starter: '—', growth: '✓ Gram-Level Costing', business: '✓ Gram-Level Costing' },
        { name: 'Real-Time Stock Auto-Deduction', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Supplier Purchase Orders (PO)', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Food Waste & Spoilage Log', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Inter-Branch Stock Transfers', starter: '—', growth: '—', business: '✓ Dispatch & Receipt' },

        { category: 'Operations, Finance & Control' },
        { name: 'Cash Register Shifts & Blind Closes', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
        { name: 'Manager Security PIN Overrides', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
        { name: 'Expense & Petty Cash Accounts', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Sales, Tax & Margin Reports', starter: '✓ Standard Sales', growth: '✓ Advanced COGS & Rush', business: '✓ Consolidated Chain' },
        { name: 'Customer Profiles & Loyalty Points', starter: '—', growth: '✓ Included', business: '✓ Included' },
        { name: 'Multi-Tenant Data Isolation & Backups', starter: '✓ Included', growth: '✓ Included', business: '✓ Included' },
    ];

    const starterDesc = plans[0] ? formatPrice(plans[0].price_monthly, plans[0].currency || platformCurrency) : '$29';
    const growthDesc = plans[1] ? formatPrice(plans[1].price_monthly, plans[1].currency || platformCurrency) : '$79';
    const businessDesc = plans[2] ? formatPrice(plans[2].price_monthly, plans[2].currency || platformCurrency) : '$199';

    return (
        <MarketingLayout>
            <MarketingHead
                title="Transparent Restaurant POS Pricing & Plans"
                description={`Simple, predictable restaurant POS pricing. Starter (${starterDesc}/mo), Growth (${growthDesc}/mo), Business (${businessDesc}/mo). 14-day free trial on all plans, no credit card required.`}
            />

            {/* Pricing Hero */}
            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="TRANSPARENT SUBSCRIPTION PRICING"
                        title="Simple Plans for Every Stage of Growth"
                        description="Start with our 14-day free trial. Choose monthly flexibility or save with annual billing. No setup fees, no proprietary hardware mandates."
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

                    {/* Pricing Cards */}
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-8">
                        {plans.map((plan) => {
                            const currencyCode = plan.currency || platformCurrency;
                            const symbol = getCurrencySymbol(currencyCode);
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

                                    {/* Limits */}
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

                    {/* Detailed Feature Comparison Matrix */}
                    <div className="mt-24">
                        <div className="text-center max-w-2xl mx-auto mb-10">
                            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#0B271F]">
                                Comprehensive Plan Comparison
                            </h2>
                            <p className="mt-2 text-xs sm:text-sm text-stone-500">
                                Detailed breakdown of capabilities, limits, and modules across all three tiers.
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="border-b border-stone-200 bg-stone-50 text-stone-900 font-bold">
                                        <th className="p-4 sm:p-5 w-1/3">Feature / Module</th>
                                        <th className="p-4 sm:p-5 text-center">
                                            {plans[0] ? `${plans[0].name} (${formatPrice(plans[0].price_monthly, plans[0].currency || platformCurrency)}/mo)` : 'Starter'}
                                        </th>
                                        <th className="p-4 sm:p-5 text-center bg-emerald-50/50 text-[#0B271F]">
                                            {plans[1] ? `${plans[1].name} (${formatPrice(plans[1].price_monthly, plans[1].currency || platformCurrency)}/mo)` : 'Growth'}
                                        </th>
                                        <th className="p-4 sm:p-5 text-center">
                                            {plans[2] ? `${plans[2].name} (${formatPrice(plans[2].price_monthly, plans[2].currency || platformCurrency)}/mo)` : 'Business'}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-200/70 font-sans">
                                    {comparisonRows.map((row, idx) => {
                                        if (row.category) {
                                            return (
                                                <tr key={idx} className="bg-stone-100/70 text-[#0B271F] font-bold font-mono text-[11px] uppercase tracking-wider">
                                                    <td colSpan={4} className="p-3 sm:px-5">
                                                        {row.category}
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-stone-50/70 transition-colors">
                                                <td className="p-4 sm:px-5 font-semibold text-stone-800">
                                                    {row.name}
                                                </td>
                                                <td className="p-4 sm:px-5 text-center text-stone-600">
                                                    {row.starter}
                                                </td>
                                                <td className="p-4 sm:px-5 text-center text-[#0B271F] font-medium bg-emerald-50/30">
                                                    {row.growth}
                                                </td>
                                                <td className="p-4 sm:px-5 text-center text-stone-900 font-semibold">
                                                    {row.business}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Billing FAQs */}
                    <div className="mt-24 max-w-3xl mx-auto">
                        <SectionHeading
                            badge="BILLING FAQS"
                            title="Frequently Asked Billing Questions"
                            description="Clear, honest terms. No hidden hardware leases or surprise contract extensions."
                        />

                        <div className="mt-12 space-y-4">
                            {billingFaqs.map((faq, idx) => (
                                <div
                                    key={idx}
                                    className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs"
                                >
                                    <button
                                        type="button"
                                        onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                                        className="flex w-full items-center justify-between p-5 text-left font-display font-bold text-stone-900 text-sm sm:text-base hover:text-[#0B271F]"
                                    >
                                        <span>{faq.q}</span>
                                        <span className="ml-4 font-mono text-stone-400">
                                            {openFaq === idx ? '−' : '+'}
                                        </span>
                                    </button>
                                    {openFaq === idx && (
                                        <div className="px-5 pb-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
                                            {faq.a}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-20 rounded-3xl bg-[#0B271F] p-8 sm:p-12 text-white text-center">
                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold">
                            Start Your 14-Day Free Trial Today
                        </h2>
                        <p className="mt-3 text-stone-300 text-xs sm:text-sm max-w-lg mx-auto">
                            Join restaurants running faster service and tighter food margins on Restrly.
                        </p>
                        <div className="mt-6">
                            <Button href="/register" variant="accent" size="lg">
                                Create Free Workspace
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
