import RestrlyLogo from '@/Components/Brand/RestrlyLogo';
import Button from '@/Components/Marketing/Button';
import { trackConversion } from '@/Components/Marketing/Telemetry';
import { useT } from '@/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

export default function MarketingNavbar() {
    const { auth, locale = 'en' } = usePage().props as Record<string, any>;
    const t = useT();

    const [scrolled, setScrolled] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);

    const navRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 16);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (navRef.current && !navRef.current.contains(e.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleLocale = () => {
        const nextLocale = locale === 'bn' ? 'en' : 'bn';
        router.post(
            route('locale.update'),
            { locale: nextLocale },
            { preserveScroll: true }
        );
    };

    return (
        <header
            ref={navRef}
            className={`sticky top-0 z-50 transition-all duration-300 ${
                scrolled
                    ? 'border-b border-stone-200/80 bg-white/90 backdrop-blur-md shadow-xs'
                    : 'border-b border-transparent bg-transparent'
            }`}
        >
            <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Brand Logo */}
                <div className="flex items-center gap-8">
                    <RestrlyLogo size="md" variant="full" href="/" />

                    {/* Desktop Navigation */}
                    <nav className="hidden lg:flex items-center gap-1 font-medium text-sm text-stone-700">
                        <Link
                            href="/product"
                            className="rounded-lg px-3.5 py-2 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors"
                        >
                            Product
                        </Link>

                        {/* Features Mega Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setActiveDropdown('features')}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveDropdown(
                                        activeDropdown === 'features' ? null : 'features'
                                    )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors ${
                                    activeDropdown === 'features'
                                        ? 'text-[#0B271F] bg-stone-100/70'
                                        : ''
                                }`}
                            >
                                <span>Features</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                        activeDropdown === 'features' ? 'rotate-180' : ''
                                    }`}
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>

                            {/* Dropdown panel */}
                            {activeDropdown === 'features' && (
                                <div className="absolute left-0 top-full pt-2 w-[720px] transition-all">
                                    <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-2xl shadow-stone-900/10 grid grid-cols-3 gap-6">
                                        {/* Col 1: Front of House */}
                                        <div>
                                            <div className="text-[11px] font-mono uppercase tracking-widest font-semibold text-[#10B981] mb-3">
                                                Front of House
                                            </div>
                                            <ul className="space-y-2">
                                                <li>
                                                    <Link
                                                        href="/features/restaurant-pos"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            POS Terminal
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Fast split-bill & counter sales
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/kitchen-display"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Kitchen Display (KDS)
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Live ticket Kanban & timers
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/table-management"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Table Management
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Floor plans & table status
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/order-management"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Order Management
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Dine-in, takeaway, delivery
                                                        </div>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        {/* Col 2: Back of House & Inventory */}
                                        <div>
                                            <div className="text-[11px] font-mono uppercase tracking-widest font-semibold text-[#10B981] mb-3">
                                                Kitchen & Inventory
                                            </div>
                                            <ul className="space-y-2">
                                                <li>
                                                    <Link
                                                        href="/features/menu-management"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Menu & Recipes
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Variants, pricing & 86'd items
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/inventory-management"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Inventory & Stock
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Auto-deduction & stock alerts
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/purchasing-suppliers"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Purchasing & POs
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Suppliers & goods receipts
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/expense-management"
                                                        className="group block rounded-lg p-2 hover:bg-stone-50 transition-colors"
                                                    >
                                                        <div className="font-semibold text-stone-900 text-sm group-hover:text-[#0B271F]">
                                                            Waste & Expenses
                                                        </div>
                                                        <div className="text-xs text-stone-500">
                                                            Spoilage logs & petty cash
                                                        </div>
                                                    </Link>
                                                </li>
                                            </ul>
                                        </div>

                                        {/* Col 3: Operations & Scale */}
                                        <div className="bg-stone-50/70 p-4 rounded-xl border border-stone-200/60">
                                            <div className="text-[11px] font-mono uppercase tracking-widest font-semibold text-stone-700 mb-3">
                                                Control & Analytics
                                            </div>
                                            <ul className="space-y-2">
                                                <li>
                                                    <Link
                                                        href="/features/cash-management"
                                                        className="group block rounded-md p-1.5 hover:bg-white transition-colors"
                                                    >
                                                        <div className="font-medium text-stone-900 text-xs group-hover:text-[#0B271F]">
                                                            Cash & Shift Register
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/reports-analytics"
                                                        className="group block rounded-md p-1.5 hover:bg-white transition-colors"
                                                    >
                                                        <div className="font-medium text-stone-900 text-xs group-hover:text-[#0B271F]">
                                                            Sales & COGS Reports
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/staff-management"
                                                        className="group block rounded-md p-1.5 hover:bg-white transition-colors"
                                                    >
                                                        <div className="font-medium text-stone-900 text-xs group-hover:text-[#0B271F]">
                                                            Staff Roles & PINs
                                                        </div>
                                                    </Link>
                                                </li>
                                                <li>
                                                    <Link
                                                        href="/features/multi-branch-management"
                                                        className="group block rounded-md p-1.5 hover:bg-white transition-colors"
                                                    >
                                                        <div className="font-medium text-stone-900 text-xs group-hover:text-[#0B271F]">
                                                            Multi-Branch Central
                                                        </div>
                                                    </Link>
                                                </li>
                                            </ul>

                                            <div className="mt-4 pt-3 border-t border-stone-200/80">
                                                <Link
                                                    href="/features"
                                                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                                >
                                                    <span>View all 13 features</span>
                                                    <span>→</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Solutions Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setActiveDropdown('solutions')}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveDropdown(
                                        activeDropdown === 'solutions' ? null : 'solutions'
                                    )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors ${
                                    activeDropdown === 'solutions'
                                        ? 'text-[#0B271F] bg-stone-100/70'
                                        : ''
                                }`}
                            >
                                <span>Solutions</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                        activeDropdown === 'solutions' ? 'rotate-180' : ''
                                    }`}
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>

                            {activeDropdown === 'solutions' && (
                                <div className="absolute left-0 top-full pt-2 w-72">
                                    <div className="rounded-2xl border border-stone-200/90 bg-white p-3 shadow-2xl shadow-stone-900/10 space-y-1">
                                        <Link
                                            href="/solutions/restaurants"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Full-Service Restaurants
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Tables, courses & floor flow
                                            </div>
                                        </Link>
                                        <Link
                                            href="/solutions/cafes"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Cafés & Bakeries
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Fast orders & modifiers
                                            </div>
                                        </Link>
                                        <Link
                                            href="/solutions/cloud-kitchens"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Cloud & Ghost Kitchens
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Virtual brands & delivery sync
                                            </div>
                                        </Link>
                                        <Link
                                            href="/solutions/quick-service-restaurants"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Quick Service (QSR)
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                High throughput line-busting
                                            </div>
                                        </Link>
                                        <Link
                                            href="/solutions/takeaway-delivery"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Takeaway & Delivery
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Zones, drivers & dispatch
                                            </div>
                                        </Link>
                                        <Link
                                            href="/solutions/multi-location-restaurants"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Multi-Location Groups
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Transfers & master catalog
                                            </div>
                                        </Link>
                                        <div className="pt-2 mt-1 border-t border-stone-100">
                                            <Link
                                                href="/solutions"
                                                className="block p-2 text-xs font-semibold text-[#0B271F] hover:text-[#10B981] transition-colors"
                                            >
                                                Compare all business models →
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Link
                            href="/pricing"
                            className="rounded-lg px-3.5 py-2 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors"
                        >
                            Pricing
                        </Link>

                        {/* Resources Dropdown */}
                        <div
                            className="relative"
                            onMouseEnter={() => setActiveDropdown('resources')}
                            onMouseLeave={() => setActiveDropdown(null)}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    setActiveDropdown(
                                        activeDropdown === 'resources' ? null : 'resources'
                                    )
                                }
                                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors ${
                                    activeDropdown === 'resources'
                                        ? 'text-[#0B271F] bg-stone-100/70'
                                        : ''
                                }`}
                            >
                                <span>Resources</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                    className={`h-4 w-4 transition-transform duration-200 ${
                                        activeDropdown === 'resources' ? 'rotate-180' : ''
                                    }`}
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                            </button>

                            {activeDropdown === 'resources' && (
                                <div className="absolute left-0 top-full pt-2 w-64">
                                    <div className="rounded-2xl border border-stone-200/90 bg-white p-3 shadow-2xl shadow-stone-900/10 space-y-1">
                                        <Link
                                            href="/resources"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Operations Guides
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Best practices for modern restaurants
                                            </div>
                                        </Link>
                                        <Link
                                            href="/help"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Help Center
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Step-by-step setup documentation
                                            </div>
                                        </Link>
                                        <Link
                                            href="/about"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                About Restrly
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Our mission & engineering team
                                            </div>
                                        </Link>
                                        <Link
                                            href="/contact"
                                            className="block rounded-lg p-2.5 hover:bg-stone-50 transition-colors"
                                        >
                                            <div className="font-semibold text-stone-900 text-sm">
                                                Contact & Sales
                                            </div>
                                            <div className="text-xs text-stone-500">
                                                Talk to a restaurant specialist
                                            </div>
                                        </Link>
                                    </div>
                                </div>
                            )}
                        </div>
                    </nav>
                </div>

                {/* Right Action CTAs */}
                <div className="hidden lg:flex items-center gap-3">
                    {/* Language Switch */}
                    <button
                        type="button"
                        onClick={toggleLocale}
                        className="rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold uppercase text-stone-600 hover:text-[#0B271F] hover:bg-stone-100 transition-colors"
                        title="Switch Language"
                    >
                        {locale === 'bn' ? 'English (EN)' : 'বাংলা (BN)'}
                    </button>

                    {auth?.user ? (
                        <Button
                            href="/dashboard"
                            variant="primary"
                            size="md"
                        >
                            Open Dashboard
                        </Button>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="rounded-xl px-4 py-2.5 text-sm font-semibold text-stone-800 hover:text-[#0B271F] hover:bg-stone-100/70 transition-colors"
                            >
                                Sign In
                            </Link>

                            <Button
                                href="/register"
                                variant="primary"
                                size="md"
                                onClick={() => trackConversion('nav_cta_clicked')}
                            >
                                Start Free Trial
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Hamburger */}
                <div className="flex items-center gap-2 lg:hidden">
                    <button
                        type="button"
                        onClick={toggleLocale}
                        className="rounded-lg p-2 text-xs font-mono font-semibold uppercase text-stone-600"
                    >
                        {locale === 'bn' ? 'EN' : 'BN'}
                    </button>

                    <button
                        type="button"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="rounded-xl p-2.5 text-stone-700 hover:bg-stone-100 focus:outline-none"
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="h-6 w-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        ) : (
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={2}
                                stroke="currentColor"
                                className="h-6 w-6"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                                />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Drawer */}
            {mobileMenuOpen && (
                <div className="lg:hidden border-b border-stone-200 bg-white px-4 pt-3 pb-8 shadow-xl max-h-[85vh] overflow-y-auto">
                    <div className="space-y-3 font-medium text-base text-stone-800">
                        <Link
                            href="/product"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 hover:bg-stone-50"
                        >
                            Product
                        </Link>

                        {/* Mobile Features Accordion */}
                        <div>
                            <button
                                type="button"
                                onClick={() =>
                                    setMobileAccordion(
                                        mobileAccordion === 'features' ? null : 'features'
                                    )
                                }
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-stone-50"
                            >
                                <span>Features</span>
                                <span className="text-xs">
                                    {mobileAccordion === 'features' ? '−' : '+'}
                                </span>
                            </button>
                            {mobileAccordion === 'features' && (
                                <div className="mt-1 ml-3 space-y-1 pl-3 border-l-2 border-stone-200 text-sm text-stone-600">
                                    <Link
                                        href="/features/restaurant-pos"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        POS Terminal
                                    </Link>
                                    <Link
                                        href="/features/kitchen-display"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Kitchen Display (KDS)
                                    </Link>
                                    <Link
                                        href="/features/table-management"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Table & Floor Management
                                    </Link>
                                    <Link
                                        href="/features/menu-management"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Menu & Recipes
                                    </Link>
                                    <Link
                                        href="/features/inventory-management"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Inventory & Stock
                                    </Link>
                                    <Link
                                        href="/features/cash-management"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Cash & Registers
                                    </Link>
                                    <Link
                                        href="/features/reports-analytics"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Reports & Analytics
                                    </Link>
                                    <Link
                                        href="/features"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 font-semibold text-[#0B271F]"
                                    >
                                        All 13 Modules →
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Solutions Accordion */}
                        <div>
                            <button
                                type="button"
                                onClick={() =>
                                    setMobileAccordion(
                                        mobileAccordion === 'solutions' ? null : 'solutions'
                                    )
                                }
                                className="flex w-full items-center justify-between rounded-lg px-3 py-2 hover:bg-stone-50"
                            >
                                <span>Solutions</span>
                                <span className="text-xs">
                                    {mobileAccordion === 'solutions' ? '−' : '+'}
                                </span>
                            </button>
                            {mobileAccordion === 'solutions' && (
                                <div className="mt-1 ml-3 space-y-1 pl-3 border-l-2 border-stone-200 text-sm text-stone-600">
                                    <Link
                                        href="/solutions/restaurants"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Full-Service Restaurants
                                    </Link>
                                    <Link
                                        href="/solutions/cafes"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Cafés & Bakeries
                                    </Link>
                                    <Link
                                        href="/solutions/cloud-kitchens"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Cloud & Ghost Kitchens
                                    </Link>
                                    <Link
                                        href="/solutions/quick-service-restaurants"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Quick Service (QSR)
                                    </Link>
                                    <Link
                                        href="/solutions/takeaway-delivery"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Takeaway & Delivery
                                    </Link>
                                    <Link
                                        href="/solutions/multi-location-restaurants"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="block py-1.5 hover:text-[#0B271F]"
                                    >
                                        Multi-Location Chains
                                    </Link>
                                </div>
                            )}
                        </div>

                        <Link
                            href="/pricing"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 hover:bg-stone-50"
                        >
                            Pricing
                        </Link>

                        <Link
                            href="/resources"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 hover:bg-stone-50"
                        >
                            Resources & Guides
                        </Link>

                        <Link
                            href="/help"
                            onClick={() => setMobileMenuOpen(false)}
                            className="block rounded-lg px-3 py-2 hover:bg-stone-50"
                        >
                            Help Center
                        </Link>
                    </div>

                    <div className="mt-6 pt-6 border-t border-stone-200 space-y-3">
                        {auth?.user ? (
                            <Button
                                href="/dashboard"
                                variant="primary"
                                size="lg"
                                className="w-full"
                            >
                                Open Dashboard
                            </Button>
                        ) : (
                            <>
                                <Button
                                    href="/register"
                                    variant="primary"
                                    size="lg"
                                    className="w-full"
                                    onClick={() => {
                                        trackConversion('nav_cta_clicked');
                                        setMobileMenuOpen(false);
                                    }}
                                >
                                    Start Free Trial (14 Days)
                                </Button>
                                <Link
                                    href="/login"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="block text-center rounded-xl py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                                >
                                    Sign In to Workspace
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    );
}
