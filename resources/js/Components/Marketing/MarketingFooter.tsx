import MiseLogo from '@/Components/Brand/MiseLogo';
import { Button } from '@/Components/ui/Button';
import { Input } from '@/Components/ui/Input';
import { Link } from '@inertiajs/react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import React, { useState } from 'react';

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
        <footer className="w-full bg-stone-50 border-t border-stone-200 text-stone-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-stone-200">
                    {/* Brand and Newsletter column */}
                    <div className="lg:col-span-4 flex flex-col justify-between pr-0 lg:pr-8">
                        <div className="space-y-4">
                            <MiseLogo href="/" size="md" />
                            <p className="text-sm text-stone-600 max-w-sm leading-relaxed">
                                Complete restaurant management software engineered for high-velocity operations, culinary precision, and seamless multi-branch scalability.
                            </p>
                        </div>

                        <div className="mt-8 space-y-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-500 block">
                                Product Updates &amp; Operator Insights
                            </span>
                            {subscribed ? (
                                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2 border border-emerald-200">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>Thank you for subscribing. We will keep you updated.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe} className="flex items-center gap-2 max-w-md">
                                    <Input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        placeholder="operator@restaurant.com"
                                        className="bg-white border-stone-300 text-sm h-10"
                                    />
                                    <Button
                                        type="submit"
                                        className="bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shrink-0 h-10 px-4"
                                    >
                                        Subscribe
                                    </Button>
                                </form>
                            )}
                            <p className="text-[11px] text-stone-500">
                                No spam. Unsubscribe anytime.
                            </p>
                        </div>
                    </div>

                    {/* Navigation Columns */}
                    <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-8">
                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                                Platform
                            </span>
                            <ul className="flex flex-col gap-2.5 text-sm text-stone-600">
                                <li>
                                    <Link href="/features/restaurant-pos" className="hover:text-stone-900 transition-colors">
                                        Point of Sale (POS)
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/kitchen-display" className="hover:text-stone-900 transition-colors">
                                        Kitchen Display (KDS)
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/inventory" className="hover:text-stone-900 transition-colors">
                                        Inventory
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/table-management" className="hover:text-stone-900 transition-colors">
                                        Table Management
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/branch-management" className="hover:text-stone-900 transition-colors">
                                        Branch Management
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products/qr-ordering" className="hover:text-stone-900 transition-colors">
                                        QR Code Ordering
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products" className="hover:text-stone-900 transition-colors">
                                        All Products
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/features" className="text-[#EC3013] font-medium hover:underline text-xs mt-1">
                                        View All Features &rarr;
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                                Solutions
                            </span>
                            <ul className="flex flex-col gap-2.5 text-sm text-stone-600">
                                <li>
                                    <Link href="/solutions/dine-in-qr-ordering" className="hover:text-stone-900 transition-colors">
                                        Dine-In QR Ordering
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/kitchen-workflow" className="hover:text-stone-900 transition-colors">
                                        Kitchen Workflow
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/restaurants" className="hover:text-stone-900 transition-colors">
                                        Full-Service Dining
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/quick-service-restaurants" className="hover:text-stone-900 transition-colors">
                                        Quick Service (QSR)
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/cafes" className="hover:text-stone-900 transition-colors">
                                        Cafés &amp; Bakeries
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/cloud-kitchens" className="hover:text-stone-900 transition-colors">
                                        Cloud &amp; Ghost Kitchens
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/solutions/multi-location-restaurants" className="hover:text-stone-900 transition-colors">
                                        Hospitality Groups
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                                Resources
                            </span>
                            <ul className="flex flex-col gap-2.5 text-sm text-stone-600">
                                <li>
                                    <Link href="/resources" className="hover:text-stone-900 transition-colors">
                                        Operator Guides
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/pricing" className="hover:text-stone-900 transition-colors">
                                        Pricing &amp; Plans
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/help" className="hover:text-stone-900 transition-colors">
                                        Help Center
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/contact" className="hover:text-stone-900 transition-colors">
                                        Contact Support
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/products" className="hover:text-stone-900 transition-colors">
                                        Product Architecture
                                    </Link>
                                </li>
                            </ul>
                        </div>

                        <div className="flex flex-col gap-3">
                            <span className="text-xs font-semibold uppercase tracking-wider text-stone-900">
                                Company &amp; Legal
                            </span>
                            <ul className="flex flex-col gap-2.5 text-sm text-stone-600">
                                <li>
                                    <Link href="/about" className="hover:text-stone-900 transition-colors">
                                        About Touch Dine
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/privacy-policy" className="hover:text-stone-900 transition-colors">
                                        Privacy Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/terms-of-service" className="hover:text-stone-900 transition-colors">
                                        Terms of Service
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/cookie-policy" className="hover:text-stone-900 transition-colors">
                                        Cookie Policy
                                    </Link>
                                </li>
                                <li>
                                    <Link href="/refund-policy" className="hover:text-stone-900 transition-colors">
                                        Refund Policy
                                    </Link>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Sub-footer status bar */}
                <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6 text-xs text-stone-500">
                        <span>&copy; {new Date().getFullYear()} Touch Dine, Inc. All rights reserved.</span>
                        <Link href="/privacy-policy" className="hover:text-stone-900 transition-colors">
                            Privacy
                        </Link>
                        <Link href="/terms-of-service" className="hover:text-stone-900 transition-colors">
                            Terms
                        </Link>
                        <Link href="/cookie-policy" className="hover:text-stone-900 transition-colors">
                            Cookies
                        </Link>
                    </div>

                    <div className="flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-xs font-medium text-stone-700">
                            All Systems Operational
                        </span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
