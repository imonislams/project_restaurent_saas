import {
    Button,
    MarketingHead,
    MarketingLayout,
    SectionHeading,
} from '@/Components/Marketing';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

interface HelpArticle {
    id: number;
    title: string;
    category: 'onboarding' | 'pos' | 'menu' | 'staff' | 'billing' | 'hardware';
    categoryLabel: string;
    content: string;
}

const HELP_DOCS: HelpArticle[] = [
    {
        id: 1,
        title: 'Step-by-Step Restaurant Activation Checklist',
        category: 'onboarding',
        categoryLabel: 'GETTING STARTED',
        content:
            'After signing up, complete the 5-step onboarding wizard: 1) Company Details & Currency, 2) Branch Hours & Service Types, 3) Tax Label & Percentage (inclusive/exclusive), 4) Receipt Header & Footer, 5) Review & Activate. You can skip optional steps and configure them later under Settings.',
    },
    {
        id: 2,
        title: 'Opening and Closing Register Shifts with Blind Counts',
        category: 'pos',
        categoryLabel: 'POS & REGISTERS',
        content:
            'To open a shift, navigate to the POS terminal, click "Open Shift", and input your physical opening float (e.g. $200.00). To close a shift, click "Close Shift", count your physical cash without looking at expected totals, and submit. The system then displays any variance between counted cash and expected cash.',
    },
    {
        id: 3,
        title: 'Splitting Checks by Headcount or Custom Tender',
        category: 'pos',
        categoryLabel: 'POS & REGISTERS',
        content:
            'When a guest requests a split bill on an open table, tap "Pay & Settle". Select Tender 1 (e.g. Card), enter the first amount, and click Charge. The remaining balance automatically displays on screen. Repeat for Tender 2 (Cash) until the balance reaches $0.00.',
    },
    {
        id: 4,
        title: 'How to 86 (Out-of-Stock) a Menu Item Instantly',
        category: 'menu',
        categoryLabel: 'MENU & RECIPES',
        content:
            'When your kitchen runs out of a dish during dinner rush, go to Menu → Products, locate the dish, and toggle the Availability switch to OFF. The item is immediately grayed out across all connected POS terminals with a clear "86" badge.',
    },
    {
        id: 5,
        title: 'Setting Up Recipe Ingredient Deductions (Bill of Materials)',
        category: 'menu',
        categoryLabel: 'MENU & RECIPES',
        content:
            'Under Inventory → Ingredients, add your raw ingredients (e.g., ground beef, cheese, buns) with units of measure. Then edit your menu product and click "Recipe Items" to specify exact ingredient quantities used per serving. Settle an order, and stock deductions occur automatically.',
    },
    {
        id: 6,
        title: 'Configuring Manager Security PINs for Discounts and Voids',
        category: 'staff',
        categoryLabel: 'STAFF & PERMISSIONS',
        content:
            'Store managers and owners can set a 4-digit PIN under My Profile → Manager PIN. Under Settings → POS, set your discount approval threshold (e.g. 15%). Any discount above 15% or item void will prompt for the authorizing Manager PIN before applying.',
    },
    {
        id: 7,
        title: 'Connecting Thermal Receipt and Kitchen LAN Printers (ESC/POS)',
        category: 'hardware',
        categoryLabel: 'HARDWARE & PRINTERS',
        content:
            'Restrly prints using standard ESC/POS commands. Connect your thermal printer to your local Wi-Fi or router via Ethernet. In browser print dialogs, select your 80mm or 58mm printer as default, disable headers/footers, and set margins to None for perfect receipt formatting.',
    },
    {
        id: 8,
        title: 'Upgrading Your Subscription Plan or Changing Billing Frequency',
        category: 'billing',
        categoryLabel: 'BILLING & PAYMENTS',
        content:
            'Navigate to Settings → Subscription. Choose your desired tier (Starter, Growth, or Business) and toggle between Monthly or Annual billing. Upgrades take effect immediately with prorated credits applied automatically.',
    },
];

export default function Help() {
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'onboarding' | 'pos' | 'menu' | 'staff' | 'billing' | 'hardware'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedDoc, setExpandedDoc] = useState<number | null>(1);

    const filtered = HELP_DOCS.filter((doc) => {
        const matchesCat = selectedCategory === 'all' || doc.category === selectedCategory;
        const matchesSearch =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.content.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCat && matchesSearch;
    });

    return (
        <MarketingLayout>
            <MarketingHead
                title="Help Center & Setup Documentation — Restrly"
                description="Searchable documentation, hardware setup tutorials, register shift guides, and recipe configuration steps for Restrly."
            />

            <section className="pt-12 pb-20 sm:pt-20 sm:pb-28">
                <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
                    <SectionHeading
                        badge="SUPPORT & DOCUMENTATION"
                        title="Searchable Knowledge Base"
                        description="Clear, accurate documentation reflecting the actual Restrly interface and workflows."
                    />

                    {/* Search Input Bar */}
                    <div className="mt-10 max-w-2xl mx-auto">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search guides (e.g. blind till, thermal printer, recipe BOM, manager PIN)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-2xl border-stone-300 py-4 pl-12 pr-4 text-xs sm:text-sm shadow-xs focus:border-primary focus:ring-primary/20"
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 text-lg">
                                🔍
                            </span>
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="mt-8 flex flex-wrap items-center justify-center gap-2 border-b border-stone-200 pb-4">
                        {[
                            { key: 'all', label: 'All Topics' },
                            { key: 'onboarding', label: 'Getting Started' },
                            { key: 'pos', label: 'POS & Registers' },
                            { key: 'menu', label: 'Menu & Recipes' },
                            { key: 'staff', label: 'Staff & PINs' },
                            { key: 'hardware', label: 'Hardware & Printers' },
                            { key: 'billing', label: 'Billing' },
                        ].map((cat) => (
                            <button
                                key={cat.key}
                                type="button"
                                onClick={() => setSelectedCategory(cat.key as any)}
                                className={`rounded-xl px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all ${
                                    selectedCategory === cat.key
                                        ? 'bg-primary text-on-primary'
                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Articles Accordion List */}
                    <div className="mt-12 space-y-4">
                        {filtered.map((doc) => (
                            <div
                                key={doc.id}
                                className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-2xs"
                            >
                                <button
                                    type="button"
                                    onClick={() => setExpandedDoc(expandedDoc === doc.id ? null : doc.id)}
                                    className="flex w-full items-center justify-between p-5 sm:p-6 text-left font-display font-bold text-stone-900 text-sm sm:text-base hover:text-primary"
                                >
                                    <div>
                                        <div className="text-[10px] font-mono font-bold text-primary uppercase mb-1">
                                            {doc.categoryLabel}
                                        </div>
                                        <span>{doc.title}</span>
                                    </div>
                                    <span className="ml-4 font-mono text-stone-400 text-lg">
                                        {expandedDoc === doc.id ? '−' : '+'}
                                    </span>
                                </button>
                                {expandedDoc === doc.id && (
                                    <div className="px-5 pb-6 sm:px-6 text-xs sm:text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-4">
                                        {doc.content}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Support Contact Prompt */}
                    <div className="mt-16 rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center space-y-3">
                        <h4 className="font-display font-bold text-stone-900 text-base">
                            Still Have Questions About Your Setup?
                        </h4>
                        <p className="text-xs sm:text-sm text-stone-500 max-w-md mx-auto">
                            Our team of restaurant specialists is available to assist with printer connections and menu importing.
                        </p>
                        <div className="pt-2">
                            <Button href="/contact" variant="primary" size="md">
                                Contact Hospitality Support
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
