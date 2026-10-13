import MiseLogo from '@/Components/Brand/MiseLogo';
import { Link, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';

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

    const navLinks = [
        { label: 'Product', href: '/product' },
        { label: 'Features', href: '/features' },
        { label: 'Solutions', href: '/solutions' },
        { label: 'Pricing', href: '/pricing' },
        { label: 'Resources', href: '/resources' },
    ];

    const isActive = (path: string) => {
        if (path === '/') return url === '/';
        return url.startsWith(path);
    };

    return (
        <header
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
                scrolled
                    ? 'bg-surface/95 backdrop-blur-xl border-b border-surface-container-highest shadow-[0_1px_8px_rgba(0,0,0,0.04)]'
                    : 'bg-surface/90 backdrop-blur-xl border-b border-surface-container-highest'
            }`}
        >
            <div className="h-20 max-w-7xl mx-auto px-gutter flex items-center justify-between gap-gutter">
                {/* Brand & Desktop Links */}
                <div className="flex items-center gap-space-2xl">
                    <MiseLogo href="/" size="md" />

                    <nav className="hidden lg:flex items-center gap-space-lg">
                        {navLinks.map((link) => {
                            const active = isActive(link.href);
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`font-body-sm text-body-sm transition-colors ${
                                        active
                                            ? 'text-primary font-semibold'
                                            : 'text-on-surface-variant hover:text-on-surface'
                                    }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </nav>
                </div>

                {/* Right Action Cluster */}
                <div className="flex items-center gap-space-md">
                    {auth?.user ? (
                        <Link
                            href="/dashboard"
                            className="inline-flex items-center justify-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-lg py-space-sm rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            Open Terminal
                        </Link>
                    ) : (
                        <>
                            <Link
                                href="/login"
                                className="hidden sm:inline-flex font-body-sm text-body-sm font-semibold text-on-surface-variant hover:text-on-surface transition-colors px-space-sm py-space-xs"
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="inline-flex items-center justify-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold px-space-lg py-space-sm rounded-lg shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                Start Free Trial
                            </Link>
                        </>
                    )}

                    <Link
                        href={auth?.user ? '/profile' : '/login'}
                        className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shrink-0 hover:bg-primary-container transition-colors"
                        title={auth?.user ? auth.user.name : 'Account'}
                    >
                        <span className="material-symbols-outlined text-on-primary text-[18px]">
                            person
                        </span>
                    </Link>

                    {/* Mobile Hamburger Toggle */}
                    <button
                        type="button"
                        onClick={() => setMobileOpen(!mobileOpen)}
                        className="lg:hidden p-2 text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                        aria-label="Toggle navigation menu"
                    >
                        <span className="material-symbols-outlined text-[24px]">
                            {mobileOpen ? 'close' : 'menu'}
                        </span>
                    </button>
                </div>
            </div>

            {/* Mobile Navigation Drawer */}
            {mobileOpen && (
                <div className="lg:hidden border-b border-surface-container-highest bg-surface px-gutter py-space-lg shadow-lg">
                    <nav className="flex flex-col gap-space-md">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setMobileOpen(false)}
                                className={`font-body-md text-body-md py-1 transition-colors ${
                                    isActive(link.href)
                                        ? 'text-primary font-bold'
                                        : 'text-on-surface-variant hover:text-on-surface'
                                }`}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-space-md border-t border-surface-container-high flex flex-col gap-space-sm">
                            {auth?.user ? (
                                <Link
                                    href="/dashboard"
                                    onClick={() => setMobileOpen(false)}
                                    className="w-full text-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold py-space-sm rounded-lg"
                                >
                                    Go to Dashboard
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setMobileOpen(false)}
                                        className="w-full text-center bg-surface-container hover:bg-surface-container-high text-on-surface font-body-sm text-body-sm font-semibold py-space-sm rounded-lg"
                                    >
                                        Sign In
                                    </Link>
                                    <Link
                                        href="/register"
                                        onClick={() => setMobileOpen(false)}
                                        className="w-full text-center bg-primary hover:bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold py-space-sm rounded-lg"
                                    >
                                        Start Free Trial
                                    </Link>
                                </>
                            )}
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}
