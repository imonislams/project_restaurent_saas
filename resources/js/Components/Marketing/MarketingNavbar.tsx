import MiseLogo from '@/Components/Brand/MiseLogo';
import {
    NavigationMenu,
    NavigationMenuContent,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    NavigationMenuTrigger,
    navigationMenuTriggerStyle,
} from '@/Components/ui/navigation-menu';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/Components/ui/sheet';
import { Link, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Boxes,
    Building2,
    ChefHat,
    Coffee,
    HelpCircle,
    LayoutGrid,
    Mail,
    Menu,
    Monitor,
    Sparkles,
    Store,
    Utensils,
    UtensilsCrossed,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export default function MarketingNavbar() {
    const { auth } = usePage().props as Record<string, any>;
    const { url } = usePage();

    const [mobileOpen, setMobileOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 8);
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const isActive = (path: string) => {
        if (path === '/') return url === '/';
        return url.startsWith(path);
    };

    return (
        <header
            className={`sticky top-0 left-0 right-0 z-50 w-full transition-all duration-200 ${
                scrolled
                    ? 'bg-white/95 backdrop-blur-md border-b border-stone-200 shadow-xs'
                    : 'bg-white border-b border-stone-100'
            }`}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
                {/* Brand Logo & Desktop Nav */}
                <div className="flex items-center gap-8">
                    <MiseLogo href="/" size="md" />

                    <div className="hidden lg:flex items-center">
                        <NavigationMenu>
                            <NavigationMenuList className="gap-1">
                                {/* Product Mega Dropdown */}
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger className="text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 data-[state=open]:bg-stone-50">
                                        Product
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="grid w-[600px] grid-cols-2 gap-3 p-4 bg-white rounded-xl shadow-lg border border-stone-200">
                                            <div className="col-span-2 pb-2 border-b border-stone-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                                    Touch Dine Platform Modules
                                                </span>
                                                <Link
                                                    href="/product"
                                                    className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                                >
                                                    Platform Blueprint <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            <Link
                                                href="/features/restaurant-pos"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Monitor className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Point of Sale (POS)
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Sub-second offline-capable register
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/features/kitchen-display"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <ChefHat className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Kitchen Display (KDS)
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Live station routing & coursing
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/features/table-management"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <LayoutGrid className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Table & Floor Architect
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Interactive floor plans & seat status
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/features/inventory-management"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Boxes className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Inventory Ledger
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Recipe-level gram deductions & alerts
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>

                                {/* Features Direct Link */}
                                <NavigationMenuItem>
                                    <Link
                                        href="/features"
                                        className={`${navigationMenuTriggerStyle()} text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 ${
                                            isActive('/features') ? 'text-[#B53014] font-semibold' : ''
                                        }`}
                                    >
                                        Features
                                    </Link>
                                </NavigationMenuItem>

                                {/* Solutions Dropdown */}
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger className="text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 data-[state=open]:bg-stone-50">
                                        Solutions
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="grid w-[540px] grid-cols-2 gap-3 p-4 bg-white rounded-xl shadow-lg border border-stone-200">
                                            <div className="col-span-2 pb-2 border-b border-stone-100 flex items-center justify-between">
                                                <span className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                                                    By Venue Type
                                                </span>
                                                <Link
                                                    href="/solutions"
                                                    className="text-xs font-semibold text-[#B53014] hover:underline flex items-center gap-1"
                                                >
                                                    All Solutions <ArrowRight className="w-3 h-3" />
                                                </Link>
                                            </div>

                                            <Link
                                                href="/solutions/restaurants"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Utensils className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Full-Service Dining
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Fine dining & bistros
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/solutions/quick-service-restaurants"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Sparkles className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Quick Service (QSR)
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Rapid cashier and counter service
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/solutions/cafes"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Coffee className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Cafés & Bakeries
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Fast line busting & modifiers
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/solutions/multi-location-restaurants"
                                                className="group flex items-start gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <div className="w-9 h-9 rounded-lg bg-stone-100 group-hover:bg-[#B53014]/10 text-stone-700 group-hover:text-[#B53014] flex items-center justify-center shrink-0 transition-colors">
                                                    <Building2 className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Multi-Location Chains
                                                    </div>
                                                    <div className="text-xs text-stone-500 line-clamp-1 mt-0.5">
                                                        Centralized menus & analytics
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>

                                {/* Pricing Direct Link */}
                                <NavigationMenuItem>
                                    <Link
                                        href="/pricing"
                                        className={`${navigationMenuTriggerStyle()} text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 ${
                                            isActive('/pricing') ? 'text-[#B53014] font-semibold' : ''
                                        }`}
                                    >
                                        Pricing
                                    </Link>
                                </NavigationMenuItem>

                                {/* Resources Dropdown */}
                                <NavigationMenuItem>
                                    <NavigationMenuTrigger className="text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 data-[state=open]:bg-stone-50">
                                        Resources
                                    </NavigationMenuTrigger>
                                    <NavigationMenuContent>
                                        <div className="w-[320px] p-3 bg-white rounded-xl shadow-lg border border-stone-200 flex flex-col gap-1">
                                            <Link
                                                href="/resources"
                                                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <BookOpen className="w-4 h-4 text-stone-500 group-hover:text-[#B53014]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Operator Guides
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        Best practices & workflows
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/help"
                                                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <HelpCircle className="w-4 h-4 text-stone-500 group-hover:text-[#B53014]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Help Center
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        Hardware setup & FAQs
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/contact"
                                                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <Mail className="w-4 h-4 text-stone-500 group-hover:text-[#B53014]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        Contact Support
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        Get in touch with specialists
                                                    </div>
                                                </div>
                                            </Link>

                                            <Link
                                                href="/about"
                                                className="group flex items-center gap-3 p-2.5 rounded-lg hover:bg-stone-50 transition-colors"
                                            >
                                                <Store className="w-4 h-4 text-stone-500 group-hover:text-[#B53014]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#B53014]">
                                                        About Touch Dine
                                                    </div>
                                                    <div className="text-xs text-stone-500">
                                                        Our mission & architecture
                                                    </div>
                                                </div>
                                            </Link>
                                        </div>
                                    </NavigationMenuContent>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>
                    </div>
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-3">
                    {auth?.user ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
                        >
                            Open Dashboard
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex text-sm font-medium text-stone-700 hover:text-stone-900 px-3 py-2 rounded-lg hover:bg-stone-50 transition-colors"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-[#B53014] hover:bg-[#9E2A11] active:bg-[#85230E] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
                            >
                                Start Free Trial
                            </Link>
                        </>
                    )}

                    {/* Mobile Hamburger Toggle using shadcn Sheet */}
                    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                        <SheetTrigger asChild>
                            <button
                                type="button"
                                className="lg:hidden p-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-colors"
                                aria-label="Toggle navigation menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="right" className="w-[300px] sm:w-[350px] p-6 flex flex-col justify-between">
                            <div className="space-y-6">
                                <SheetHeader className="text-left">
                                    <SheetTitle>
                                        <MiseLogo href="/" size="sm" />
                                    </SheetTitle>
                                </SheetHeader>

                                <nav className="flex flex-col space-y-1">
                                    <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 px-2 py-1">
                                        Navigation
                                    </div>
                                    <Link
                                        href="/product"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/product')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Product Overview</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/features"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/features')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Features & Modules</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/solutions"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/solutions')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Solutions</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/pricing')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Pricing & Plans</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/resources"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/resources')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Resources & Guides</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/help"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/help')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Help Center</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/contact"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/contact')
                                                ? 'bg-stone-100 text-[#B53014] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Contact Support</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                </nav>
                            </div>

                            <div className="pt-6 border-t border-stone-200 flex flex-col gap-2">
                                {auth?.user ? (
                                    <Link
                                        href="/dashboard"
                                        onClick={() => setMobileOpen(false)}
                                        className="w-full text-center bg-[#B53014] hover:bg-[#9E2A11] text-white text-sm font-semibold py-2.5 rounded-lg"
                                    >
                                        Open Dashboard
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            href="/login"
                                            onClick={() => setMobileOpen(false)}
                                            className="w-full text-center bg-stone-100 hover:bg-stone-200 text-stone-900 text-sm font-semibold py-2.5 rounded-lg"
                                        >
                                            Sign In
                                        </Link>
                                        <Link
                                            href="/register"
                                            onClick={() => setMobileOpen(false)}
                                            className="w-full text-center bg-[#B53014] hover:bg-[#9E2A11] text-white text-sm font-semibold py-2.5 rounded-lg"
                                        >
                                            Start Free Trial
                                        </Link>
                                    </>
                                )}
                            </div>
                        </SheetContent>
                    </Sheet>
                </div>
            </div>
        </header>
    );
}
