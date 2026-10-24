import MiseLogo from '@/Components/Brand/MiseLogo';
import { BrandSquares } from '@/Components/Marketing/Motion';
import { useT } from '@/i18n';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

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
    heroBadge = 'Restaurant management',
    features,
    variant = 'login',
    headerAction,
}: AuthSplitLayoutProps) {
    const page = usePage().props as Record<string, any>;
    const locale = page.locale ?? 'en';
    const locales: { value: string; label: string }[] = page.locales ?? [];
    const t = useT();

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
                title: 'Ready in minutes',
                description: 'Create your account and get a private workspace for your restaurant right away.',
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

    return (
        <div className="flex min-h-screen w-full bg-white mk-root antialiased text-[#201E1D] selection:bg-primary selection:text-white">
            {/* Brand panel (desktop) */}
            <div className="relative hidden lg:flex lg:w-[46%] xl:w-[48%] flex-col justify-between overflow-hidden bg-[#201E1D] p-10 xl:p-14 text-[#F3F2F2]">
                <BrandSquares tone="dark" />
                <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#EC3013]/20 blur-3xl" />

                <div className="relative z-10 auth-rise">
                    <MiseLogo variant="full" theme="dark" size="lg" href="/" />
                </div>

                <div className="relative z-10 my-auto py-10">
                    <span className="auth-rise inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#F3F2F2]/80" style={{ animationDelay: '80ms' }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#EC3013]" />
                        {heroBadge}
                    </span>

                    <h1 className="auth-rise mt-6 max-w-xl text-4xl font-extrabold leading-[1.1] tracking-tight xl:text-5xl" style={{ animationDelay: '140ms' }}>
                        {heroHeadline}
                    </h1>
                    <p className="auth-rise mt-5 max-w-lg text-base leading-relaxed text-[#F3F2F2]/70" style={{ animationDelay: '200ms' }}>
                        {heroSubheadline}
                    </p>

                    <ul className="mt-10 max-w-lg space-y-5">
                        {activeFeatures.map((feat, idx) => (
                            <li key={feat.title} className="auth-rise flex items-start gap-4" style={{ animationDelay: `${280 + idx * 90}ms` }}>
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center bg-[#EC3013] text-white">
                                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
                                        <path fillRule="evenodd" d="M16.7 4.15a.75.75 0 01.15 1.05l-8 10.5a.75.75 0 01-1.13.07l-4.5-4.5a.75.75 0 011.06-1.06l3.9 3.9 7.47-9.82a.75.75 0 011.05-.14z" clipRule="evenodd" />
                                    </svg>
                                </span>
                                <div>
                                    <h2 className="text-[15px] font-semibold">{feat.title}</h2>
                                    <p className="mt-0.5 text-sm leading-relaxed text-[#F3F2F2]/60">{feat.description}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="relative z-10 text-xs text-[#F3F2F2]/45">
                    Point of sale, kitchen display, tables, inventory and reports in one place.
                </p>
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

                    <div className="hidden xl:block">
                        <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-stone-400">
                            Restaurant management platform
                        </span>
                    </div>

                    {/* Right utilities: Language Selector & Header Action */}
                    <div className="ml-auto flex items-center gap-3 whitespace-nowrap">
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
                <div className="auth-form my-auto mx-auto w-full max-w-[480px] py-8">
                    {children}
                </div>

                <div className="border-t border-stone-200/70 pt-6 text-center text-xs text-stone-500">
                    <div className="mb-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
                        <Link href="/privacy-policy" className="hover:text-stone-900">Privacy</Link>
                        <Link href="/terms-of-service" className="hover:text-stone-900">Terms</Link>
                        <Link href="/help" className="hover:text-stone-900">Help</Link>
                    </div>
                    <p className="text-[11px] text-stone-400">&copy; {new Date().getFullYear()} Touch Dine. All rights reserved.</p>
                </div>
            </div>
        </div>
    );
}
