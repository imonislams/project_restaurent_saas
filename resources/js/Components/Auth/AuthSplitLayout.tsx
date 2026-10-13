import MiseLogo from '@/Components/Brand/MiseLogo';
import { useT } from '@/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useState } from 'react';

export interface AuthFeature {
    icon?: 'clock' | 'users' | 'chart' | 'kitchen' | 'shield' | 'check';
    title: string;
    description: string;
}

export interface AuthSplitLayoutProps extends PropsWithChildren {
    /**
     * Left panel headline
     */
    heroHeadline?: string;
    /**
     * Left panel description
     */
    heroSubheadline?: string;
    /**
     * Left panel pill badge
     */
    heroBadge?: string;
    /**
     * Highlight features list
     */
    features?: AuthFeature[];
    /**
     * Background image URL (curated restaurant photography)
     */
    imageUrl?: string;
    /**
     * Optional quote author & text
     */
    testimonial?: {
        quote: string;
        author: string;
        role: string;
        restaurant: string;
    };
    /**
     * Active page type for contextual styling
     */
    variant?: 'login' | 'register' | 'forgot' | 'reset' | 'verify' | 'general';
    /**
     * Top-right extra action
     */
    headerAction?: ReactNode;
}

export default function AuthSplitLayout({
    children,
    heroHeadline = 'Your restaurant. Running smarter.',
    heroSubheadline = 'Manage your restaurant operations, simplify daily workflows, and keep your team connected from one place.',
    heroBadge = 'RESTAURANT MANAGEMENT SAAS',
    features,
    imageUrl = 'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?auto=format&fit=crop&w=1600&q=85',
    testimonial,
    variant = 'login',
    headerAction,
}: AuthSplitLayoutProps) {
    const page = usePage().props as Record<string, any>;
    const locale = page.locale ?? 'en';
    const locales: { value: string; label: string }[] = page.locales ?? [];
    const t = useT();

    const [imageLoaded, setImageLoaded] = useState(false);

    // Default features based on variant if none passed
    const defaultFeatures: Record<string, AuthFeature[]> = {
        login: [
            {
                icon: 'kitchen',
                title: 'Synchronized operations',
                description: 'Real-time sync between POS, kitchen display, and floor tables.',
            },
            {
                icon: 'users',
                title: 'Smarter team control',
                description: 'Shift handovers, manager approvals, and role permissions.',
            },
            {
                icon: 'chart',
                title: 'Live business visibility',
                description: 'Instant reporting across menus, daily sales, and food margins.',
            },
        ],
        register: [
            {
                icon: 'clock',
                title: 'Ready in 60 seconds',
                description: 'Instant workspace provisioning with automatic tenant isolation.',
            },
            {
                icon: 'kitchen',
                title: 'Full restaurant stack',
                description: 'Includes POS, kitchen display, tables, recipes, and purchasing.',
            },
            {
                icon: 'shield',
                title: 'Secure & multi-branch',
                description: 'Built for single dining rooms up to multi-location hospitality groups.',
            },
        ],
    };

    const activeFeatures = features || defaultFeatures[variant] || defaultFeatures.login;

    const defaultTestimonial = {
        quote:
            variant === 'register'
                ? 'Setting up our 3 locations took under 15 minutes. Our servers and kitchen staff adopted Restrly on day one without training.'
                : 'Restrly cut our peak dinner rush ticket delays by 35% and completely eliminated order confusion between floor and kitchen.',
        author: variant === 'register' ? 'Marcus Vance' : 'Elena Rostova',
        role: variant === 'register' ? 'Founder & Operator' : 'Managing Director',
        restaurant: variant === 'register' ? 'The Copper Bistro Group' : 'Atelier Luminary',
    };

    const activeTestimonial = testimonial || defaultTestimonial;

    return (
        <div className="flex min-h-screen w-full bg-surface font-sans antialiased text-on-surface selection:bg-primary selection:text-white">
            {/* ======================================================== */}
            {/* LEFT COLUMN: EDITORIAL BRAND EXPERIENCE (Desktop lg+)    */}
            {/* ======================================================== */}
            <div className="relative hidden lg:flex lg:w-[48%] xl:w-[50%] flex-col justify-between overflow-hidden bg-[#1a1c1a] p-10 xl:p-14 text-white">
                {/* Background Restaurant Photography with Smooth Load & Art Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={imageUrl}
                        alt="Restaurant Ambiance"
                        onLoad={() => setImageLoaded(true)}
                        className={`h-full w-full object-cover object-center transition-all duration-1000 ease-out ${
                            imageLoaded ? 'scale-100 opacity-30' : 'scale-105 opacity-15'
                        }`}
                    />
                    {/* Dark Slate & Rust Multi-Stop Radial & Linear Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1a1c1a] via-[#1a1c1a]/92 to-[#2f312f]/85" />
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(174,42,16,0.22),transparent_60%)]" />

                    {/* Subtle Architectural Grid Lines */}
                    <svg
                        className="absolute inset-0 h-full w-full stroke-white/[0.04] [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]"
                        aria-hidden="true"
                    >
                        <defs>
                            <pattern
                                id="editorial-grid"
                                width="48"
                                height="48"
                                x="0"
                                y="0"
                                patternUnits="userSpaceOnUse"
                            >
                                <path d="M.5 48V.5H48" fill="none" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" strokeWidth="0" fill="url(#editorial-grid)" />
                    </svg>
                </div>

                {/* Left Header: Brand Logo & Wordmark */}
                <div className="relative z-10 flex items-center justify-between">
                    <MiseLogo
                        variant="full"
                        theme="dark"
                        size="lg"
                        withTagline={true}
                        tagline="SYSTEM KERNEL"
                        href="/"
                    />

                    <div className="flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 backdrop-blur-md">
                        <span className="relative flex h-2 w-2">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                        </span>
                        <span className="text-[11px] font-mono tracking-wide text-primary-fixed">
                            v2.4 KERNEL ACTIVE
                        </span>
                    </div>
                </div>

                {/* Left Middle: Storytelling, Headline, Features, and Floating Live Cards */}
                <div className="relative z-10 my-auto py-8">
                    {/* Category Kicker Badge */}
                    <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-mono tracking-wider uppercase text-primary-fixed backdrop-blur-sm mb-6">
                        <span className="material-symbols-outlined text-[14px] text-primary">terminal</span>
                        <span>{heroBadge}</span>
                    </div>

                    {/* Editorial Main Headline */}
                    <h1 className="font-display text-3xl font-extrabold tracking-tight text-white xl:text-4xl leading-[1.15] max-w-xl">
                        {heroHeadline}
                    </h1>

                    <p className="mt-4 text-base text-stone-300/90 leading-relaxed max-w-lg font-normal">
                        {heroSubheadline}
                    </p>

                    {/* Feature Highlights Grid */}
                    <div className="mt-8 space-y-4 max-w-xl">
                        {activeFeatures.map((feat, idx) => (
                            <div
                                key={idx}
                                className="group flex items-start gap-3.5 rounded-xl border border-white/5 bg-white/[0.03] p-3.5 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-white/[0.06]"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary-fixed group-hover:bg-primary/25 group-hover:scale-105 transition-all">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="h-4 w-4"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-sm font-semibold text-white tracking-wide">
                                        {feat.title}
                                    </h2>
                                    <p className="text-xs text-stone-400 leading-relaxed mt-0.5">
                                        {feat.description}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Floating Product Depth Micro-Cards */}
                    <div className="mt-8 grid grid-cols-2 gap-3.5 max-w-xl">
                        {/* Micro Card 1: Active Table Ticket */}
                        <div className="rounded-xl border border-white/10 bg-[#2f312f]/80 p-3.5 backdrop-blur-md shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/20 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary-fixed">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    Table 14 • 4 Covers
                                </span>
                                <span className="text-[10px] text-stone-400 font-mono">14m ago</span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-white truncate">
                                2x Duck Confit, 2x Risotto
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-primary-fixed font-medium">
                                <span>Kitchen: Firing Mains</span>
                                <span className="text-stone-400 font-normal">Server: Marcus</span>
                            </div>
                        </div>

                        {/* Micro Card 2: Service Metrics */}
                        <div className="rounded-xl border border-white/10 bg-[#2f312f]/80 p-3.5 backdrop-blur-md shadow-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-mono font-semibold tracking-wider text-stone-400 uppercase">
                                    Service Health
                                </span>
                                <span className="text-[10px] font-mono font-bold text-secondary-fixed">+18.4%</span>
                            </div>
                            <div className="mt-2 text-xs font-semibold text-white">
                                99.98% POS Uptime
                            </div>
                            <div className="mt-1 flex items-center justify-between text-[11px] text-stone-400">
                                <span className="font-mono text-[10px]">Avg: 42 min</span>
                                <span className="text-secondary-fixed font-medium">0 delayed</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Left Bottom: Testimonial & Social Proof */}
                <div className="relative z-10 border-t border-white/10 pt-6">
                    <div className="flex items-start gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#8f200b] font-display text-sm font-bold text-white shadow-md border border-white/15">
                            {activeTestimonial.author
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs italic text-stone-300 leading-relaxed">
                                “{activeTestimonial.quote}”
                            </p>
                            <div className="mt-2 flex items-center gap-2 text-xs">
                                <span className="font-semibold text-white">
                                    {activeTestimonial.author}
                                </span>
                                <span className="text-stone-500">•</span>
                                <span className="text-stone-400">
                                    {activeTestimonial.role},{' '}
                                    <strong className="text-primary-fixed font-medium">
                                        {activeTestimonial.restaurant}
                                    </strong>
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ======================================================== */}
            {/* RIGHT COLUMN: AUTHENTICATION FORM & USER INTERFACE       */}
            {/* ======================================================== */}
            <div className="flex flex-1 flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto">
                {/* Top Bar Navigation: Logo (Mobile/Tablet), Language Switcher, Action */}
                <div className="flex items-center justify-between gap-4">
                    {/* Mobile/Tablet Brand Logo */}
                    <div className="lg:hidden">
                        <MiseLogo variant="full" theme="light" size="md" href="/" />
                    </div>

                    <div className="hidden lg:block">
                        <span className="text-xs font-mono font-medium text-stone-500 uppercase tracking-widest">
                            High-Velocity Hospitality POS
                        </span>
                    </div>

                    {/* Right utilities: Language Selector & Header Action */}
                    <div className="flex items-center gap-3">
                        {headerAction}

                        {locales.length > 1 && (
                            <div className="relative inline-flex items-center">
                                <div className="pointer-events-none absolute left-2.5 text-stone-400">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                        className="h-3.5 w-3.5"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zM6.732 4.673a6.5 6.5 0 016.536 0c.264.153.513.324.743.51a13.314 13.314 0 00-3.011 1.745c-.47-.456-.99-.86-1.55-1.206-.24-.148-.48-.28-.718-.399v-.65zm-1.02 1.34A6.5 6.5 0 003.5 10c0 .973.213 1.897.596 2.727a14.77 14.77 0 011.616-2.846c-.225-.494-.413-1.026-.554-1.589a12.83 12.83 0 01.554-2.279zm2.49 1.492a11.378 11.378 0 013.596 0c.348.97.538 2.016.538 3.095 0 .61-.06 1.205-.175 1.776a14.62 14.62 0 01-3.959 0A12.448 12.448 0 018.202 7.505zm5.093-.82a13.298 13.298 0 003.012 1.744A6.5 6.5 0 0010 3.5c-.328 0-.649.024-.963.072.585.358 1.127.781 1.616 1.261.94-.486 1.94-.863 2.99-1.12v-.028z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </div>
                                <select
                                    value={locale}
                                    onChange={(e) =>
                                        router.post(route('locale.update'), {
                                            locale: e.target.value,
                                        })
                                    }
                                    className="rounded-lg border border-stone-200 bg-white py-1.5 pl-8 pr-8 text-xs font-medium text-stone-700 shadow-sm hover:border-stone-300 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/10 transition-colors cursor-pointer"
                                    aria-label={t('shell.language')}
                                >
                                    {locales.map((l) => (
                                        <option key={l.value} value={l.value}>
                                            {l.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Form Container (Center viewport) */}
                <div className="my-auto mx-auto w-full max-w-[440px] py-8">
                    {children}
                </div>

                {/* Footer Utilities: Security Badges & Legal */}
                <div className="border-t border-stone-200/70 pt-6 text-center text-xs text-stone-500">
                    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mb-2">
                        <span className="inline-flex items-center gap-1.5 text-stone-600 font-medium">
                            <span className="material-symbols-outlined text-[15px] text-primary">verified_user</span>
                            256-bit SSL Encrypted
                        </span>
                        <span className="text-stone-300">•</span>
                        <span>Multi-tenant Isolation</span>
                        <span className="text-stone-300">•</span>
                        <span>SOC-2 Certified</span>
                    </div>

                    <p className="text-[11px] text-stone-400">
                        &copy; {new Date().getFullYear()} mise.pos. All rights reserved. High-velocity architecture for professional restaurant operations.
                    </p>
                </div>
            </div>
        </div>
    );
}
