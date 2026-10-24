import {
    MarketingHead,
    MarketingLayout,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

export default function Terms() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="Terms of Service — Touch Dine"
                description="Terms governing the use of the Touch Dine restaurant operating system, subscription agreements, and user responsibilities."
            />

            <section className="pt-12 pb-20 sm:pt-16 sm:pb-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-xs font-mono font-bold text-[#B53014] uppercase mb-3">
                        TERMS OF SERVICE
                    </div>
                    <h1 className="font-display text-3xl sm:text-5xl font-extrabold text-stone-900 tracking-tight">
                        Terms of Service
                    </h1>
                    <div className="mt-2 text-xs font-mono text-stone-400 pb-8 border-b border-stone-200">
                        Last Updated: October 2026 · Touch Dine Inc.
                    </div>

                    <div className="mt-8 space-y-8 text-stone-700 text-xs sm:text-sm leading-relaxed font-sans">
                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                1. Acceptance of Terms
                            </h2>
                            <p>
                                By creating an account, accessing, or using the Touch Dine platform (“Service”), you agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a restaurant or corporate entity, you represent that you possess the authority to bind such entity.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                2. Free Trial & Subscriptions
                            </h2>
                            <p>
                                Every new restaurant registration includes an initial 14-day free trial. During the trial period, access is granted to all features of your selected plan without requiring credit card details. Continued service past 14 days requires activation of a paid monthly or annual subscription.
                            </p>
                            <p>
                                Subscriptions renew automatically unless cancelled prior to the end of the current billing cycle. Pricing is billed in advance on either a monthly or annual schedule as displayed on our <Link href="/pricing" className="text-[#B53014] font-bold underline">Pricing Page</Link>.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                3. Acceptable Use and Account Security
                            </h2>
                            <p>
                                You are responsible for safeguarding all staff passwords and Manager Security PINs associated with your workspace. You agree not to attempt reverse engineering, bypassing tenant isolation scopes, or transmitting malicious code to the Service.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                4. Service Level & Operational Availability
                            </h2>
                            <p>
                                We strive to provide 99.99% operational uptime. Scheduled maintenance windows are announced in advance and performed during off-peak overnight hours. The platform includes local resilience mechanisms to ensure receipt printing and order taking continue during transient internet drops.
                            </p>
                        </section>

                        <section className="space-y-3">
                            <h2 className="font-display text-xl font-bold text-stone-900">
                                5. Termination & Data Export
                            </h2>
                            <p>
                                You may cancel your subscription at any time via your tenant settings. Upon cancellation, your account remains active until the end of your current paid billing period. You retain the right to export your menu, customer, and sales records before account deactivation.
                            </p>
                        </section>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
