import {
    Button,
    MarketingHead,
    MarketingLayout,
    SectionHeading,
    trackConversion,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

interface SolutionCard {
    slug: string;
    title: string;
    badge: string;
    headline: string;
    description: string;
    tailoredFeatures: string[];
}

const SOLUTIONS: SolutionCard[] = [
    {
        slug: 'restaurants',
        title: 'Full-Service & Casual Restaurants',
        badge: 'TABLE SERVICE',
        headline: 'Floor Pacing, Multi-Course Routing & Split Bills',
        description:
            'Manage dining areas, seat covers, order courses, and split checks with ease while keeping waitstaff and kitchen line cooks in continuous sync.',
        tailoredFeatures: ['Visual floorplan with table occupancy', 'Course pacing & item-level kitchen routing', 'Split payments by headcount or custom tenders'],
    },
    {
        slug: 'cafes',
        title: 'Cafés, Coffee Bars & Bakeries',
        badge: 'HIGH VELOCITY',
        headline: 'Rapid Counter Checkout, Modifiers & Guest Loyalty',
        description:
            'Bust morning lines with lightning-fast modifier entry for roasts, milks, and syrups. Accrue guest loyalty points automatically on phone lookup.',
        tailoredFeatures: ['One-tap modifier popups & fast tender', 'Automated loyalty point accrual at checkout', 'Pastry batch tracking & daily shrinkage logging'],
    },
    {
        slug: 'cloud-kitchens',
        title: 'Cloud & Ghost Kitchens',
        badge: 'DELIVERY ONLY',
        headline: 'Multi-Brand Virtual Menus from a Single Kitchen',
        description:
            'Zero table management clutter. Run multiple brand menus from one centralized prep line, track elapsed prep times, and coordinate driver handoffs.',
        tailoredFeatures: ['Multi-brand catalog from one kitchen hub', 'Station KDS screens filtered by brand or cook', 'Aggregated delivery order queue and driver timers'],
    },
    {
        slug: 'quick-service-restaurants',
        title: 'Quick Service (QSR) & Fast Casual',
        badge: 'LINE BUSTING',
        headline: 'High-Throughput Counter Sales & Kitchen Bump Screens',
        description:
            'Keep queues moving with high-speed counter ordering, combo meals, instant thermal ticket printing, and automated shift float controls.',
        tailoredFeatures: ['High-speed touch grid for combo meal items', 'Blind till reconciliation for fast shift handovers', 'Real-time kitchen bump bar displays'],
    },
    {
        slug: 'takeaway-delivery',
        title: 'Takeaway & Delivery Outlets',
        badge: 'LOGISTICS & PICKUP',
        headline: 'Delivery Zone Rules, Driver Tracking & Scheduled Pickups',
        description:
            'Configure delivery fee zones by radius or region, store customer delivery addresses, and coordinate scheduled pickup tickets without third-party fees.',
        tailoredFeatures: ['Custom delivery zones & fee thresholds', 'Saved guest phone numbers and address book', 'Driver dispatch chits and fulfillment statuses'],
    },
    {
        slug: 'multi-location-restaurants',
        title: 'Multi-Location Groups & Chains',
        badge: 'ENTERPRISE CHAIN',
        headline: 'Central Master Catalog, Branch Transfers & Consolidated P&L',
        description:
            'Scale across cities without data fragmentation. Push menu changes from headquarters, transfer stock between branches, and compare store revenues.',
        tailoredFeatures: ['Central master catalog with branch overrides', 'Inter-branch stock transfer dispatch & receipt', 'Consolidated chain sales and food cost reports'],
    },
];

export default function SolutionsIndex() {
    return (
        <MarketingLayout>
            <MarketingHead
                title="Restaurant Solutions by Business Type"
                description="Tailored restaurant management software for full-service dining, cafes, ghost kitchens, QSR, takeaway, and multi-unit chains."
            />

            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="TAILORED INDUSTRY SOLUTIONS"
                        title="Built for How Your Venue Actually Operates"
                        description="A quick-service counter shouldn't have to navigate dining room tables, and a ghost kitchen doesn't need hostess seating. Explore workflows tailored specifically to your service model."
                    />

                    {/* Solutions Grid */}
                    <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {SOLUTIONS.map((sol) => (
                            <Link
                                key={sol.slug}
                                href={`/solutions/${sol.slug}`}
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-8 hover:border-[#EC3013] hover:shadow-md transition-all"
                                onClick={() => trackConversion('solution_viewed', { solution: sol.slug })}
                            >
                                <div>
                                    <div className="text-[11px] font-mono font-bold tracking-wider text-[#EC3013] mb-3">
                                        {sol.badge}
                                    </div>

                                    <h3 className="font-display text-xl font-bold text-stone-900 group-hover:text-[#EC3013]">
                                        {sol.title}
                                    </h3>

                                    <div className="mt-2 text-xs font-semibold text-stone-700">
                                        {sol.headline}
                                    </div>

                                    <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                        {sol.description}
                                    </p>

                                    <div className="mt-6 pt-4 border-t border-stone-100 space-y-2 text-xs text-stone-600">
                                        {sol.tailoredFeatures.map((f, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <span className="h-1.5 w-1.5 rounded-full bg-[#EC3013]" />
                                                <span>{f}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#EC3013] group-hover:underline">
                                    <span>Explore {sol.title}</span>
                                    <span>→</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {/* Bottom Trial Banner */}
                    <div className="mt-20 rounded-3xl bg-stone-900 p-8 sm:p-12 text-white text-center">
                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold">
                            Start Your 14-Day Free Trial
                        </h2>
                        <p className="mt-3 text-stone-300 text-xs sm:text-sm max-w-lg mx-auto">
                            Configure your restaurant profile in under 5 minutes. No credit card required.
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
