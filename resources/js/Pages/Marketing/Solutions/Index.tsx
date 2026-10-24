import {
    MarketingHead,
    MarketingLayout,
    trackConversion,
} from '@/Components/Marketing';
import { SOLUTION_WORKFLOWS } from '@/Components/Marketing/Catalog/catalog';
import { CtaBand, DemoButton, SectionTitle, breadcrumbSchema } from '@/Components/Marketing/Catalog/pageParts';
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

export default function SolutionsIndex({ canonical }: { canonical: string }) {
    const base = canonical.replace(/\/solutions$/, '');
    return (
        <MarketingLayout>
            <MarketingHead
                title="Restaurant Solutions by Workflow and Business Type"
                description="See how Touch Dine solves real restaurant problems: dine-in QR ordering, floor control, kitchen workflow, faster service, checkout and owner reporting."
                canonical={canonical}
                schema={{ '@context': 'https://schema.org', ...breadcrumbSchema([{ name: 'Home', url: `${base}/` }, { name: 'Solutions', url: canonical }]) }}
            />

            <section className="relative w-full overflow-hidden bg-[#F3F2F2] px-4 pb-14 pt-12 sm:px-6 lg:px-8 lg:pb-20 lg:pt-16">
                <div aria-hidden className="mk-grid pointer-events-none absolute inset-0" />
                <div className="relative mx-auto max-w-6xl animate-fade-up">
                    <span className="mk-eyebrow">Touch Dine solutions</span>
                    <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">Start with the problem on your floor.</h1>
                    <p className="mt-5 max-w-2xl text-lg leading-relaxed text-stone-600">Each solution follows one real restaurant workflow from start to finish and shows which Touch Dine modules handle each step.</p>
                    <div className="mt-8"><DemoButton where="solutions_hero" /></div>
                </div>
            </section>

            <section className="w-full bg-white px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-6xl">
                    <SectionTitle eyebrow="By workflow" title="Solutions for how service actually runs" />
                    <div className="mt-8 grid items-stretch gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {SOLUTION_WORKFLOWS.map((sol) => (
                            <Link
                                key={sol.slug}
                                href={`/solutions/${sol.slug}`}
                                onClick={() => trackConversion('solution_viewed', { solution: sol.slug, location: 'solutions_index' })}
                                className="group flex h-full flex-col rounded-2xl border border-stone-200 bg-white p-6 transition-colors hover:border-[#EC3013] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#EC3013]"
                            >
                                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-stone-100 group-hover:bg-[#EC3013]/10 group-hover:text-[#EC3013]"><sol.icon className="h-5 w-5" /></span>
                                <h3 className="mt-4 text-[18px] font-extrabold text-stone-900">{sol.name}</h3>
                                <p className="mt-1 flex-1 text-[15px] leading-relaxed text-stone-600">{sol.short}</p>
                                <span className="mt-4 text-[14px] font-bold text-[#EC3013] group-hover:underline">See the workflow →</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            <section className="w-full bg-[#F3F2F2] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
                <div className="mx-auto max-w-7xl">
                    <SectionTitle eyebrow="By business type" title="Built for How Your Venue Operates" />
                    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {SOLUTIONS.map((sol) => (
                            <Link
                                key={sol.slug}
                                href={`/solutions/${sol.slug}`}
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-8 transition-all hover:border-[#EC3013] hover:shadow-md"
                                onClick={() => trackConversion('solution_viewed', { solution: sol.slug })}
                            >
                                <div>
                                    <div className="mb-3 text-[13px] font-bold uppercase tracking-wider text-[#EC3013]">{sol.badge}</div>
                                    <h3 className="font-display text-xl font-bold text-stone-900 group-hover:text-[#EC3013]">{sol.title}</h3>
                                    <p className="mt-3 text-sm leading-relaxed text-stone-600">{sol.description}</p>
                                </div>
                                <div className="mt-6 border-t border-stone-100 pt-4 text-sm font-semibold text-[#EC3013] group-hover:underline">Explore {sol.title} →</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>
            <CtaBand />
        </MarketingLayout>
    );
}
