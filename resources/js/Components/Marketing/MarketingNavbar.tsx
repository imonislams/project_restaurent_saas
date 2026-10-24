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
import { MobileGroups, ProductsMenu, SolutionsMenu } from './MegaMenus';
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
                                <ProductsMenu isActive={isActive('/products')} />

                                {/* Features Direct Link */}
                                <NavigationMenuItem>
                                    <Link
                                        href="/features"
                                        className={`${navigationMenuTriggerStyle()} text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 ${
                                            isActive('/features') ? 'text-[#EC3013] font-semibold' : ''
                                        }`}
                                    >
                                        Features
                                    </Link>
                                </NavigationMenuItem>

                                <SolutionsMenu isActive={isActive('/solutions')} />

                                {/* Pricing Direct Link */}
                                <NavigationMenuItem>
                                    <Link
                                        href="/pricing"
                                        className={`${navigationMenuTriggerStyle()} text-sm font-medium text-stone-700 hover:text-stone-900 bg-transparent hover:bg-stone-50 ${
                                            isActive('/pricing') ? 'text-[#EC3013] font-semibold' : ''
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
                                                <BookOpen className="w-4 h-4 text-stone-500 group-hover:text-[#EC3013]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">
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
                                                <HelpCircle className="w-4 h-4 text-stone-500 group-hover:text-[#EC3013]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">
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
                                                <Mail className="w-4 h-4 text-stone-500 group-hover:text-[#EC3013]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">
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
                                                <Store className="w-4 h-4 text-stone-500 group-hover:text-[#EC3013]" />
                                                <div>
                                                    <div className="text-sm font-semibold text-stone-900 group-hover:text-[#EC3013]">
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
                            className="inline-flex items-center justify-center bg-[#EC3013] hover:bg-[#D02710] active:bg-[#A81E0C] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
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
                                className="inline-flex items-center justify-center bg-[#EC3013] hover:bg-[#D02710] active:bg-[#A81E0C] text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-xs transition-colors"
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
                        <SheetContent side="right" className="w-[300px] sm:w-[350px] p-6 flex flex-col justify-between overflow-y-auto">
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
                                    <MobileGroups onNavigate={() => setMobileOpen(false)} />
                                    <Link
                                        href="/features"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/features')
                                                ? 'bg-stone-100 text-[#EC3013] font-semibold'
                                                : 'text-stone-700 hover:bg-stone-50'
                                        }`}
                                    >
                                        <span>Features & Modules</span>
                                        <ArrowRight className="w-4 h-4 text-stone-400" />
                                    </Link>
                                    <Link
                                        href="/pricing"
                                        onClick={() => setMobileOpen(false)}
                                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                            isActive('/pricing')
                                                ? 'bg-stone-100 text-[#EC3013] font-semibold'
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
                                                ? 'bg-stone-100 text-[#EC3013] font-semibold'
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
                                                ? 'bg-stone-100 text-[#EC3013] font-semibold'
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
                                                ? 'bg-stone-100 text-[#EC3013] font-semibold'
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
                                        className="w-full text-center bg-[#EC3013] hover:bg-[#D02710] text-white text-sm font-semibold py-2.5 rounded-lg"
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
                                            className="w-full text-center bg-[#EC3013] hover:bg-[#D02710] text-white text-sm font-semibold py-2.5 rounded-lg"
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
