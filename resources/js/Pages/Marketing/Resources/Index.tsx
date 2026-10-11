import {
    MarketingHead,
    MarketingLayout,
    SectionHeading,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface Article {
    slug: string;
    title: string;
    category: 'operations' | 'profitability' | 'guides' | 'inventory';
    categoryLabel: string;
    readTime: string;
    publishDate: string;
    excerpt: string;
}

const ARTICLES: Article[] = [
    {
        slug: 'calculating-true-food-cost-percentage',
        title: 'How to Calculate Your Restaurant’s True Food Cost Percentage (With Examples)',
        category: 'profitability',
        categoryLabel: 'PROFITABILITY',
        readTime: '6 min read',
        publishDate: 'October 2026',
        excerpt:
            'Learn how to calculate actual Cost of Goods Sold (COGS) by combining raw ingredient purchases with opening and closing inventory counts, rather than relying on theoretical menu prices.',
    },
    {
        slug: 'preventing-cash-shift-variances',
        title: 'Eliminating Cash Drawer Shortages: The Blind Till Close System',
        category: 'operations',
        categoryLabel: 'OPERATIONS',
        readTime: '5 min read',
        publishDate: 'October 2026',
        excerpt:
            'Why traditional cash registers fail: how blind counts, mandatory reason tags for mid-shift payouts, and manager security PINs keep your till balanced to the penny.',
    },
    {
        slug: 'reducing-food-waste-in-prep-kitchens',
        title: '5 Practical Ways to Cut Prep Kitchen Food Spoilage by 20%',
        category: 'inventory',
        categoryLabel: 'INVENTORY',
        readTime: '7 min read',
        publishDate: 'October 2026',
        excerpt:
            'From gram-level batch recipes to categorizing waste by cause (burnt, dropped, expired), discover how modern kitchens prevent raw ingredients from ending up in the garbage bin.',
    },
    {
        slug: 'pos-hardware-buying-guide',
        title: 'Restaurant POS Hardware Guide: iPads vs Touch Terminals vs PCs',
        category: 'guides',
        categoryLabel: 'BUYING GUIDES',
        readTime: '8 min read',
        publishDate: 'October 2026',
        excerpt:
            'Avoid $5,000 proprietary terminal leases. A comprehensive breakdown of screen sizes, ESC/POS thermal printers, and network cabling best suited for your venue.',
    },
    {
        slug: 'optimizing-peak-rush-ticket-times',
        title: 'How Kitchen Display Systems Cut Rush-Hour Ticket Times by 30%',
        category: 'operations',
        categoryLabel: 'OPERATIONS',
        readTime: '6 min read',
        publishDate: 'October 2026',
        excerpt:
            'Analyze why paper slips cause kitchen traffic jams and how station-specific routing (Grill, Salad, Expo) speeds up table turnaround during peak dinner rushes.',
    },
    {
        slug: 'multi-branch-central-catalog-playbook',
        title: 'The Multi-Branch Playbook: Central Catalogs & Inter-Branch Stock Transfers',
        category: 'guides',
        categoryLabel: 'BUYING GUIDES',
        readTime: '7 min read',
        publishDate: 'October 2026',
        excerpt:
            'A guide for growing restaurant groups looking to maintain brand consistency while granting branch managers autonomy over local stock receipts and shift floats.',
    },
];

export default function ResourcesIndex() {
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'operations' | 'profitability' | 'guides' | 'inventory'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    const filtered = ARTICLES.filter((art) => {
        const matchesCat = selectedCategory === 'all' || art.category === selectedCategory;
        const matchesSearch =
            art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            art.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <MarketingLayout>
            <MarketingHead
                title="Restaurant Operations Guides & Resources — Restrly"
                description="Educational guides, POS hardware advice, prime food costing formulas, and shift management best practices for independent restaurateurs and operators."
            />

            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="OPERATIONS & EDUCATION"
                        title="Restaurant Playbooks & Operational Guides"
                        description="Actionable knowledge on prime food costing, shift reconciliation, kitchen line pacing, and restaurant technology."
                    />

                    {/* Filter and Search Bar */}
                    <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-b border-stone-200 pb-6">
                        <div className="flex items-center gap-2 overflow-x-auto">
                            {(['all', 'operations', 'profitability', 'inventory', 'guides'] as const).map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`rounded-xl px-4 py-2 text-xs font-semibold capitalize whitespace-nowrap transition-all ${
                                        selectedCategory === cat
                                            ? 'bg-[#0B271F] text-white'
                                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    }`}
                                >
                                    {cat === 'all' ? 'All Articles' : cat}
                                </button>
                            ))}
                        </div>

                        <div className="w-full sm:w-64">
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border-stone-300 px-3.5 py-2 text-xs focus:border-[#10B981] focus:ring-[#10B981]"
                            />
                        </div>
                    </div>

                    {/* Articles Grid */}
                    <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filtered.map((article) => (
                            <Link
                                key={article.slug}
                                href={`/resources/${article.slug}`}
                                className="group flex flex-col justify-between rounded-2xl border border-stone-200/90 bg-white p-7 hover:border-[#0B271F] hover:shadow-lg transition-all"
                            >
                                <div>
                                    <div className="flex items-center justify-between text-xs font-mono text-stone-400 pb-3">
                                        <span className="font-bold text-[#10B981]">
                                            {article.categoryLabel}
                                        </span>
                                        <span>{article.readTime}</span>
                                    </div>

                                    <h3 className="font-display text-lg font-bold text-stone-900 group-hover:text-[#0B271F] leading-snug">
                                        {article.title}
                                    </h3>

                                    <p className="mt-3 text-xs sm:text-sm text-stone-600 leading-relaxed">
                                        {article.excerpt}
                                    </p>
                                </div>

                                <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs font-semibold text-[#0B271F] group-hover:text-[#10B981]">
                                    <span>Read full guide</span>
                                    <span>→</span>
                                </div>
                            </Link>
                        ))}
                    </div>

                    {filtered.length === 0 && (
                        <div className="py-20 text-center text-stone-500 text-sm">
                            No articles match your search query. Try another keyword.
                        </div>
                    )}
                </div>
            </section>
        </MarketingLayout>
    );
}
