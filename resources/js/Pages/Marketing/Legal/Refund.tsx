import {
    MarketingHead,
    MarketingLayout,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

export default function Refund() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="Refund & Subscription Policy — Restrly"
                description="Our 14-day free trial terms, monthly and annual subscription conditions, and refund procedures."
            />

            <section className="pt-12 pb-20 sm:pt-16 sm:pb-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-xs font-mono font-bold text-[#B53014] uppercase mb-3">
                        BILLING POLICY
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                        Refund & Billing Policy
                    </h1>
                    <div className="mt-2 text-xs font-mono text-stone-400 pb-8 border-b border-stone-200">
                        Effective Date: October 2026 · Restrly Inc.
                    </div>

                    <div className="mt-8 space-y-8 text-stone-700 text-xs sm:text-sm leading-relaxed font-sans">
                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                1. 14-Day Free Trial Terms
                            </h2>
                            <p>
                                Every new restaurant registered on Restrly begins with a 14-day free trial of your selected plan (Starter, Growth, or Business). During the trial, you have complete access to all included modules without providing a credit card. You will never be automatically charged upon trial expiration unless you choose to activate a paid plan.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                2. Monthly Subscriptions
                            </h2>
                            <p>
                                Monthly subscriptions are billed in advance on a recurring monthly cycle. You may cancel your subscription at any time. When cancelled, your workspace remains fully operational through the end of the current paid monthly cycle. Monthly fees are generally non-refundable once the billing month has begun.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                3. Annual Subscriptions & 30-Day Money-Back Guarantee
                            </h2>
                            <p>
                                Annual subscriptions provide a discount equivalent to approximately two months free. If within the first 30 days of purchasing an annual plan you find that Restrly does not meet your operational requirements, contact our support team to receive a full refund.
                            </p>
                            <p>
                                After 30 days, annual subscriptions cancelled mid-term are eligible for a prorated credit toward future services.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                4. Plan Upgrades & Downgrades
                            </h2>
                            <p>
                                When you upgrade your plan (for example, moving from Starter to Growth), the new features and higher branch/user limits activate immediately. A prorated charge for the remaining days of your current billing cycle will be generated.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                5. Requesting a Refund
                            </h2>
                            <p>
                                To request a refund or inquire about an invoice adjustment, email our billing team at <a href="mailto:billing@restrly.com" className="font-bold text-[#B53014] underline">billing@restrly.com</a> with your restaurant account name and invoice number. We process all refund reviews within 2 business days.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
