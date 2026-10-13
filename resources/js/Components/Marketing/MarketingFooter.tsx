import MiseLogo from '@/Components/Brand/MiseLogo';
import { Link } from '@inertiajs/react';
import { useState } from 'react';

export default function MarketingFooter() {
    const [email, setEmail] = useState('');
    const [subscribed, setSubscribed] = useState(false);

    const handleSubscribe = (e: React.FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setSubscribed(true);
        }
    };

    return (
        <footer className="w-full bg-surface-container-low border-t border-surface-container-highest text-on-surface">
            <div className="max-w-7xl mx-auto px-gutter pt-space-3xl pb-space-2xl">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-2xl pb-space-2xl border-b border-surface-container-highest">
                    {/* Brand and Newsletter column */}
                    <div className="lg:col-span-4 flex flex-col justify-between pr-0 lg:pr-space-xl">
                        <div className="space-y-space-md">
                            <MiseLogo href="/" size="md" />
                            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
                                Engineered for ambitious restaurateurs and multi-location hospitality
                                groups. High-velocity operations meet culinary precision.
                            </p>
                        </div>

                        <div className="mt-space-xl space-y-space-sm">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary block">
                                Dispatch &amp; Changelog
                            </span>
                            {subscribed ? (
                                <div className="p-space-sm bg-secondary-container text-on-secondary-fixed-variant rounded-lg font-mono-ticket text-mono-ticket flex items-center gap-2">
                                    <span className="material-symbols-outlined text-secondary text-[18px]">
                                        check_circle
                                    </span>
                                    <span>Subscribed to culinary releases.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe} className="flex items-center max-w-md gap-space-xs">
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="chef@restaurant.com"
                                        className="bg-surface-container-lowest border border-surface-container-highest rounded-lg px-space-md py-space-sm font-body-sm text-body-sm text-on-surface focus:outline-none focus:border-on-surface w-full"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-on-surface hover:bg-inverse-surface text-surface-container-lowest font-body-sm text-body-sm px-space-md py-space-sm rounded-lg font-semibold shrink-0 transition-colors"
                                    >
                                        Subscribe
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="lg:col-span-8 grid grid-cols-2 md:grid-cols-4 gap-gutter">
                        <div className="flex flex-col gap-space-md">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary">
                                Platform
                            </span>
                            <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <li>
                                    <Link href="/features/restaurant-pos" className="hover:text-on-surface transition-colors">
                                        POS Terminal
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/features/kitchen-display" className="hover:text-on-surface transition-colors">
                                        Kitchen Display (KDS)
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/features/inventory-management" className="hover:text-on-surface transition-colors">
                                        Inventory Ledger
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/features/multi-branch-management" className="hover:text-on-surface transition-colors">
                                        Multi-Branch Hub
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/features/table-management" className="hover:text-on-surface transition-colors">
                                        Floor Architect
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-space-md">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary">
                                Solutions
                            </span>
                            <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <li>
                                    <Link href="/solutions/cafes" className="hover:text-on-surface transition-colors">
                                        Artisan Cafés
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/restaurants" className="hover:text-on-surface transition-colors">
                                        Full-Service Dining
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/quick-service-restaurants" className="hover:text-on-surface transition-colors">
                                        Quick Service (QSR)
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/cloud-kitchens" className="hover:text-on-surface transition-colors">
                                        Ghost &amp; Cloud Kitchens
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/multi-location-restaurants" className="hover:text-on-surface transition-colors">
                                        Hospitality Groups
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-space-md">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary">
                                Resources
                            </span>
                            <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <li>
                                    <Link href="/resources" className="hover:text-on-surface transition-colors">
                                        Operator Guides
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pricing" className="hover:text-on-surface transition-colors">
                                        Pricing &amp; Plans
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/help" className="hover:text-on-surface transition-colors">
                                        Help Center
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="hover:text-on-surface transition-colors">
                                        Contact Desk
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-space-md">
                            <span className="font-label-caps text-label-caps uppercase text-tertiary">
                                Company
                            </span>
                            <ul className="flex flex-col gap-space-sm font-body-sm text-body-sm text-on-surface-variant">
                                <li>
                                    <Link href="/about" className="hover:text-on-surface transition-colors">
                                        About Mise
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacy-policy" className="hover:text-on-surface transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms-of-service" className="hover:text-on-surface transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/cookie-policy" className="hover:text-on-surface transition-colors">
                                        Cookie Protocol
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/refund-policy" className="hover:text-on-surface transition-colors">
                                        Refund Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sub-footer status bar */}
                <div className="pt-space-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
                    <div className="flex flex-wrap items-center gap-space-lg font-mono-ticket text-mono-ticket text-on-surface-variant">
                        <span>© {new Date().getFullYear()} Mise Technologies, Inc.</span>
                        <Link href="/privacy-policy" className="hover:text-on-surface transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="/terms-of-service" className="hover:text-on-surface transition-colors">
                            Terms of Service
                        </Link>
                        <Link href="/cookie-policy" className="hover:text-on-surface transition-colors">
                            Cookie Protocol
                        </Link>
                    </div>

                    <div className="flex items-center gap-space-xs bg-secondary-container px-space-md py-space-xs rounded-full">
                        <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                        <span className="font-label-caps text-label-caps uppercase text-on-secondary-container font-semibold">
                            All Systems Operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
