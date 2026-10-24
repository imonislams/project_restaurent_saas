import {
    MarketingHead,
    MarketingLayout,
    SectionHeading,
} from '@/Components/Marketing';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/Components/ui/accordion';
import { Badge } from '@/Components/ui/Badge';
import { Button } from '@/Components/ui/Button';
import { Card, CardContent } from '@/Components/ui/Card';
import { Input } from '@/Components/ui/Input';
import { Link } from '@inertiajs/react';
import { ArrowRight, BookOpen, HelpCircle, Mail, Search } from 'lucide-react';
import React, { useState } from 'react';

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
            'Touch Dine prints using standard ESC/POS commands. Connect your thermal printer to your local Wi-Fi or router via Ethernet. In browser print dialogs, select your 80mm or 58mm printer as default, disable headers/footers, and set margins to None for perfect receipt formatting.',
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
    const [selectedCategory, setSelectedCategory] = useState<
        'all' | 'onboarding' | 'pos' | 'menu' | 'staff' | 'billing' | 'hardware'
    >('all');
    const [searchQuery, setSearchQuery] = useState('');

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
                title="Help Center & Setup Documentation — Touch Dine"
                description="Searchable documentation, hardware setup tutorials, register shift guides, and recipe configuration steps for Touch Dine."
            />

            <section className="pt-14 pb-20 sm:pt-20 sm:pb-28 bg-white">
                <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-2xl mx-auto mb-10">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#B53014] block mb-2">
                            Support &amp; Documentation
                        </span>
                        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900">
                            Knowledge Base &amp; Guides
                        </h1>
                        <p className="text-stone-600 mt-3 text-base">
                            Clear, accurate documentation reflecting the actual Touch Dine interface, hardware pairings, and workflows.
                        </p>
                    </div>

                    {/* Search Input Bar */}
                    <div className="max-w-2xl mx-auto mb-8">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
                            <Input
                                type="text"
                                placeholder="Search guides (e.g. blind till, thermal printer, recipe BOM, manager PIN)..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-11 pr-4 py-3 h-12 text-sm rounded-xl border-stone-300 bg-stone-50/50 focus:bg-white"
                            />
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-2 border-b border-stone-200 pb-6 mb-8">
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
                                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
                                    selectedCategory === cat.key
                                        ? 'bg-[#B53014] text-white'
                                        : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Articles Accordion List */}
                    <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 shadow-xs">
                        {filtered.length === 0 ? (
                            <div className="text-center py-12 text-stone-500 text-sm">
                                <HelpCircle className="w-8 h-8 mx-auto mb-2 text-stone-400" />
                                No guides found matching &ldquo;{searchQuery}&rdquo;. Try another search term.
                            </div>
                        ) : (
                            <Accordion type="single" collapsible defaultValue="doc-1" className="w-full space-y-2">
                                {filtered.map((doc) => (
                                    <AccordionItem key={doc.id} value={`doc-${doc.id}`}>
                                        <AccordionTrigger className="text-base font-semibold text-stone-900 hover:text-[#B53014]">
                                            <div className="text-left">
                                                <span className="text-[10px] font-mono font-bold text-[#B53014] uppercase tracking-wider block mb-0.5">
                                                    {doc.categoryLabel}
                                                </span>
                                                <span>{doc.title}</span>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="text-xs sm:text-sm text-stone-600 leading-relaxed pt-2">
                                            {doc.content}
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </div>

                    {/* Support Contact Prompt */}
                    <div className="mt-14 rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center space-y-3">
                        <h4 className="font-bold text-stone-900 text-base">
                            Still Have Questions About Your Setup?
                        </h4>
                        <p className="text-xs sm:text-sm text-stone-600 max-w-md mx-auto">
                            Our team of restaurant specialists is available to assist with printer connections and menu importing.
                        </p>
                        <div className="pt-2">
                            <Link
                                href="/contact"
                                className="inline-flex items-center justify-center gap-2 bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors"
                            >
                                <Mail className="w-4 h-4" />
                                <span>Contact Hospitality Support</span>
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </MarketingLayout>
    );
}
