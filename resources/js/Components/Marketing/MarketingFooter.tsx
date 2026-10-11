import RestrlyLogo from '@/Components/Brand/RestrlyLogo';
import { Link, router, usePage } from '@inertiajs/react';

export default function MarketingFooter() {
    const { locale = 'en' } = usePage().props as Record<string, any>;

    const toggleLocale = () => {
        const nextLocale = locale === 'bn' ? 'en' : 'bn';
        router.post(
            route('locale.update'),
            { locale: nextLocale },
            { preserveScroll: true }
        );
    };

    return (
        <footer className="border-t border-stone-200/80 bg-[#0B271F] text-stone-300">
            {/* Upper conversion ribbon */}
            <div className="border-b border-white/10 bg-[#071F18]/60">
                <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3 text-xs font-mono">
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#10B981]" />
                        </span>
                        <span className="text-stone-200 font-medium">
                            SYSTEM HEALTH: ALL PLATFORM ENGINES OPERATIONAL
                        </span>
                        <span className="text-stone-500">·</span>
                        <span className="text-stone-400">99.99% HISTORICAL UPTIME</span>
                    </div>

                    <div className="flex items-center gap-6 text-xs text-stone-400">
                        <span>14-Day Free Trial</span>
                        <span className="text-stone-600">•</span>
                        <span>Zero Credit Card Required</span>
                        <span className="text-stone-600">•</span>
                        <span>Multi-Tenant Data Isolation</span>
                    </div>
                </div>
            </div>

            {/* Main Navigation Matrix */}
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
                <div className="grid grid-cols-2 gap-10 md:grid-cols-5 lg:gap-12">
                    {/* Brand column */}
                    <div className="col-span-2 space-y-5">
                        <RestrlyLogo theme="dark" size="md" variant="full" href="/" />

                        <p className="max-w-sm text-sm text-stone-400 leading-relaxed">
                            The connected operating system for modern food and beverage businesses.
                            Point of sale, kitchen display, table floorplans, and inventory in unified sync.
                        </p>

                        <div className="pt-2">
                            <Link
                                href="/register"
                                className="inline-flex items-center gap-2 rounded-xl bg-[#10B981] px-4 py-2 text-xs font-semibold text-white hover:bg-[#059669] transition-colors"
                            >
                                <span>Create Free Restaurant Workspace</span>
                                <span>→</span>
                            </Link>
                        </div>
                    </div>

                    {/* Product & Modules */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-widest font-semibold text-white mb-4">
                            Platform
                        </h4>
                        <ul className="space-y-2.5 text-xs text-stone-400">
                            <li>
                                <Link href="/product" className="hover:text-white transition-colors">
                                    System Overview
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/restaurant-pos" className="hover:text-white transition-colors">
                                    POS Terminal
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/kitchen-display" className="hover:text-white transition-colors">
                                    Kitchen Display (KDS)
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/table-management" className="hover:text-white transition-colors">
                                    Table Management
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/menu-management" className="hover:text-white transition-colors">
                                    Menu & Recipes
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/inventory-management" className="hover:text-white transition-colors">
                                    Inventory & Stock
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/cash-management" className="hover:text-white transition-colors">
                                    Cash Register & Shifts
                                </Link>
                            </li>
                            <li>
                                <Link href="/features/reports-analytics" className="hover:text-white transition-colors">
                                    Reports & COGS
                                </Link>
                            </li>
                            <li>
                                <Link href="/features" className="hover:text-[#10B981] font-semibold transition-colors">
                                    All 13 Modules →
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Solutions by Venue */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-widest font-semibold text-white mb-4">
                            Solutions
                        </h4>
                        <ul className="space-y-2.5 text-xs text-stone-400">
                            <li>
                                <Link href="/solutions/restaurants" className="hover:text-white transition-colors">
                                    Full-Service Dining
                                </Link>
                            </li>
                            <li>
                                <Link href="/solutions/cafes" className="hover:text-white transition-colors">
                                    Cafés & Bakeries
                                </Link>
                            </li>
                            <li>
                                <Link href="/solutions/cloud-kitchens" className="hover:text-white transition-colors">
                                    Cloud Kitchens
                                </Link>
                            </li>
                            <li>
                                <Link href="/solutions/quick-service-restaurants" className="hover:text-white transition-colors">
                                    Quick Service (QSR)
                                </Link>
                            </li>
                            <li>
                                <Link href="/solutions/takeaway-delivery" className="hover:text-white transition-colors">
                                    Takeaway & Delivery
                                </Link>
                            </li>
                            <li>
                                <Link href="/solutions/multi-location-restaurants" className="hover:text-white transition-colors">
                                    Multi-Branch Groups
                                </Link>
                            </li>
                            <li>
                                <Link href="/pricing" className="hover:text-white transition-colors">
                                    Pricing & Plans
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Resources & Trust */}
                    <div>
                        <h4 className="text-xs font-mono uppercase tracking-widest font-semibold text-white mb-4">
                            Trust & Legal
                        </h4>
                        <ul className="space-y-2.5 text-xs text-stone-400">
                            <li>
                                <Link href="/resources" className="hover:text-white transition-colors">
                                    Operations Guides
                                </Link>
                            </li>
                            <li>
                                <Link href="/help" className="hover:text-white transition-colors">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="/about" className="hover:text-white transition-colors">
                                    About Restrly
                                </Link>
                            </li>
                            <li>
                                <Link href="/contact" className="hover:text-white transition-colors">
                                    Contact & Support
                                </Link>
                            </li>
                            <li>
                                <Link href="/privacy-policy" className="hover:text-white transition-colors">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/terms-of-service" className="hover:text-white transition-colors">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="/cookie-policy" className="hover:text-white transition-colors">
                                    Cookie Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="/refund-policy" className="hover:text-white transition-colors">
                                    Refund & Billing Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Bottom Legal & Locale Bar */}
                <div className="mt-14 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs text-stone-500">
                    <div>
                        © {new Date().getFullYear()} Restrly Inc. All rights reserved. Built for reliable restaurant operations.
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            onClick={toggleLocale}
                            className="text-stone-400 hover:text-white font-mono text-[11px] underline underline-offset-4 transition-colors"
                        >
                            Language: {locale === 'bn' ? 'বাংলা' : 'English'} (Change)
                        </button>
                        <span>•</span>
                        <Link href="/health" className="text-stone-400 hover:text-white transition-colors">
                            Readiness Probe
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
