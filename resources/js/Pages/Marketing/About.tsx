import {
    Button,
    MarketingHead,
    MarketingLayout,
    SectionHeading,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

export default function About() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="About Touch Dine — Our Mission & Philosophy"
                description="Learn about Touch Dine’s mission to give food and beverage operators complete clarity over sales, kitchen pacing, recipe food costing, and multi-branch operations."
            />

            {/* About Hero */}
            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider text-primary mb-6">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            <span>OUR MISSION</span>
                        </div>

                        <h1 className="font-display text-4xl font-extrabold tracking-tight text-on-surface sm:text-6xl leading-[1.1]">
                            Software Engineered for the Frantic Reality of Food Service.
                        </h1>

                        <p className="mt-6 text-base sm:text-xl text-stone-600 leading-relaxed">
                            Touch Dine was built to solve a simple, stubborn problem: restaurants were drowning in disconnected tools—one app for POS, paper slips for the kitchen, spreadsheets for food costs, and hand-counted cash drawers that never quite matched up.
                        </p>
                    </div>

                    {/* Principles Grid */}
                    <div className="mt-20">
                        <SectionHeading
                            badge="OPERATING PRINCIPLES"
                            title="Our Core Product Philosophies"
                            description="How we think about engineering technology for modern hospitality."
                            align="left"
                        />

                        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-2xs">
                                <div className="text-xs font-mono font-bold text-primary">
                                    PRINCIPLE 01
                                </div>
                                <h3 className="font-display text-xl font-bold text-stone-900">
                                    Speed Above All During Service
                                </h3>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    When the dining room is full and the pass is lined with tickets, software must never be the bottleneck. Every tap, modifier select, and bump action in Touch Dine is optimized to complete in milliseconds.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-2xs">
                                <div className="text-xs font-mono font-bold text-primary">
                                    PRINCIPLE 02
                                </div>
                                <h3 className="font-display text-xl font-bold text-stone-900">
                                    Zero Hardware Lock-In
                                </h3>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    We reject proprietary terminal leases with exorbitant cancellation fees. Touch Dine runs on standard iPads, Android tablets, touch monitors, laptops, and off-the-shelf thermal printers.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-2xs">
                                <div className="text-xs font-mono font-bold text-primary">
                                    PRINCIPLE 03
                                </div>
                                <h3 className="font-display text-xl font-bold text-stone-900">
                                    Real-Time Data Sovereignty
                                </h3>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    Your recipes, staff records, sales histories, and customer lists belong to you. Every tenant database is strictly isolated with automated encrypted backups and easy one-click exports.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-stone-200/90 bg-white p-8 space-y-3 shadow-2xs">
                                <div className="text-xs font-mono font-bold text-primary">
                                    PRINCIPLE 04
                                </div>
                                <h3 className="font-display text-xl font-bold text-stone-900">
                                    Transparent, Fair Pricing
                                </h3>
                                <p className="text-sm text-stone-600 leading-relaxed">
                                    No hidden credit card processing markups, no mandatory onboarding consultancies, and no per-terminal fee creep. Our plans are transparent with predictable monthly or annual billing.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Architectural Standards */}
                    <div className="mt-20 rounded-3xl bg-[#1a1c1a] p-8 sm:p-12 text-white space-y-6">
                        <div className="text-xs font-mono font-bold text-primary-fixed uppercase tracking-wider">
                            TECHNICAL ARCHITECTURE
                        </div>
                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold">
                            Built on Mature, Resilient Web Standards
                        </h2>
                        <p className="text-sm sm:text-base text-stone-300 max-w-2xl leading-relaxed">
                            Touch Dine is engineered on Laravel 12 and Inertia.js with React and TypeScript. We prioritize rock-solid tenant database isolation, comprehensive automated test suites (350+ automated unit and feature tests covering all critical operations), and sub-millisecond local printer communication.
                        </p>
                        <div className="pt-4 flex flex-wrap gap-4">
                            <Button href="/register" variant="accent" size="md">
                                Try Touch Dine Free for 14 Days
                            </Button>
                            <Button href="/contact" variant="secondary" size="md">
                                Contact Our Team
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
