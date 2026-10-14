import {
    Button,
    MarketingHead,
    MarketingLayout,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';

interface ArticleDetail {
    title: string;
    category: string;
    readTime: string;
    publishDate: string;
    summary: string;
    takeaways: string[];
    paragraphs: { heading: string; body: string }[];
}

const ARTICLE_CONTENT: Record<string, ArticleDetail> = {
    'calculating-true-food-cost-percentage': {
        title: 'How to Calculate Your Restaurant’s True Food Cost Percentage (With Examples)',
        category: 'PROFITABILITY & PRIME COSTS',
        readTime: '6 min read',
        publishDate: 'October 2026',
        summary:
            'Many restaurant operators mistakenly calculate food cost percentage using their theoretical menu prices. In reality, real Cost of Goods Sold (COGS) must account for beginning inventory, purchases, and ending stock counts.',
        takeaways: [
            'Theoretical food cost assumes zero kitchen waste, zero spills, and exact portions—which never happens in real service.',
            'Formula: Cost of Goods Sold = (Beginning Inventory + Purchases) − Ending Inventory.',
            'Healthy food cost percentages for casual dining typically fall between 28% and 34%, while steakhouses and seafood operate between 32% and 38%.',
            'Linking recipes directly to your POS terminal automates variance reporting between theoretical and actual ingredient usage.',
        ],
        paragraphs: [
            {
                heading: '1. Why Menu Engineering Differs from Reality',
                body: 'When you create a recipe for a bacon avocado burger and cost the raw ingredients at $4.20 against a $14.00 menu price, your theoretical food cost is 30%. However, if line cooks over-portion avocado, bacon shrinks during par-cooking, or buns go stale and get tossed, your actual cost of goods sold will climb to 35% or higher without you noticing.',
            },
            {
                heading: '2. The Standard Restaurant COGS Formula',
                body: 'To compute accurate monthly food cost, take your inventory count from the first day of the month, add every supplier invoice received during the month, and subtract your inventory count taken on the final day. Divide this resulting COGS by your total gross food sales for that same calendar window.',
            },
            {
                heading: '3. How to Spot and Plug Operational Leaks',
                body: 'Compare your actual usage against the theoretical quantity of ingredients that should have been used according to your settled POS sales. A wide gap indicates portioning inconsistency, unlogged comped meals, or theft. By logging food waste by reason (spoilage, dropped, burnt), you identify exactly where profit is bleeding out.',
            },
        ],
    },
    'preventing-cash-shift-variances': {
        title: 'Eliminating Cash Drawer Shortages: The Blind Till Close System',
        category: 'CASH OPERATIONS & AUDIT',
        readTime: '5 min read',
        publishDate: 'October 2026',
        summary:
            'Cash drawer variances rarely happen because cashiers cannot count change. They happen when systems reveal the expected total before the count is completed, allowing shortages to be concealed.',
        takeaways: [
            'Blind till closing forces staff to physically count and submit cash quantities before seeing expected numbers.',
            'Mid-shift payouts for deliveries or ice must require an audited category and reason note.',
            'Manager Security PINs ensure cash drawers cannot be popped open during service without authorization.',
        ],
        paragraphs: [
            {
                heading: '1. The Psychology of the Open Register',
                body: 'When an end-of-shift screen shows "Expected Cash: $842.00", cashiers know how much should be in the drawer before counting. If an error or discrepancy occurred earlier in the afternoon, it is easy to rationalize or cover up. Blind counting removes this entirely: the cashier inputs their count, clicks Submit, and only then does the system print the reconciliation report.',
            },
            {
                heading: '2. Auditing Every Cash Drawer Pop',
                body: 'Cash drawers should only open upon settling a cash transaction. Any manual drawer opening—whether for change or a manager payout—must log a timestamp, user ID, and reason note in your audit trail.',
            },
        ],
    },
};

export default function ResourceShow({ slug }: { slug: string }) {
    const article = ARTICLE_CONTENT[slug] || ARTICLE_CONTENT['calculating-true-food-cost-percentage'];

    return (
        <MarketingLayout>
            <MarketingHead
                title={`${article.title} — Restrly Operations Guide`}
                description={article.summary}
                ogType="article"
            />

            <article className="pt-12 pb-20 sm:pt-16 sm:pb-28">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    {/* Breadcrumbs */}
                    <nav className="flex items-center gap-2 text-xs font-mono text-stone-500 mb-6">
                        <Link href="/resources" className="hover:text-[#0B271F]">
                            RESOURCES
                        </Link>
                        <span>/</span>
                        <span className="text-[#10B981] font-bold">{article.category}</span>
                    </nav>

                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-[#0B271F] sm:text-5xl leading-[1.15]">
                        {article.title}
                    </h1>

                    <div className="mt-4 flex items-center gap-4 text-xs font-mono text-stone-400 pb-6 border-b border-stone-200">
                        <span>{article.publishDate}</span>
                        <span>•</span>
                        <span>{article.readTime}</span>
                        <span>•</span>
                        <span>Restrly Restaurant Engineering Team</span>
                    </div>

                    {/* Summary Lead */}
                    <div className="mt-8 text-base sm:text-lg text-stone-700 leading-relaxed font-medium">
                        {article.summary}
                    </div>

                    {/* Key Takeaways Callout Box */}
                    <div className="my-10 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-8 space-y-3">
                        <div className="font-mono text-xs font-bold text-emerald-900 uppercase tracking-wider">
                            KEY OPERATIONAL TAKEAWAYS:
                        </div>
                        <ul className="space-y-2 text-xs sm:text-sm text-emerald-950">
                            {article.takeaways.map((t, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                    <span className="text-emerald-600 font-bold mt-0.5">✓</span>
                                    <span>{t}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Article Paragraphs */}
                    <div className="space-y-10 text-stone-700 text-sm sm:text-base leading-relaxed">
                        {article.paragraphs.map((p, idx) => (
                            <div key={idx} className="space-y-3">
                                <h2 className="font-display text-xl sm:text-2xl font-bold text-stone-900">
                                    {p.heading}
                                </h2>
                                <p>{p.body}</p>
                            </div>
                        ))}
                    </div>

                    {/* Back & CTA Bar */}
                    <div className="mt-16 pt-8 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                        <Link
                            href="/resources"
                            className="text-xs font-semibold text-[#B53014] hover:underline"
                        >
                            ← Back to all operations guides
                        </Link>

                        <Button href="/register" variant="primary" size="md">
                            Try Restrly Free for 14 Days
                        </Button>
                    </div>
                </div>
            </article>
        </MarketingLayout>
    );
}
