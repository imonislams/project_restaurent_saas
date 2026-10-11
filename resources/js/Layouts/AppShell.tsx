import ApplicationLogo from '@/Components/ApplicationLogo';
import Icon, { IconName } from '@/Components/Icon';
import { useT } from '@/i18n';
import { Link, router } from '@inertiajs/react';
import { PropsWithChildren, ReactNode, useEffect, useMemo, useState } from 'react';

export interface NavItem {
    label: string;
    href: string;
    icon: IconName;
    active: boolean;
    badge?: number;
}

export interface NavGroup {
    label?: string;
    items: NavItem[];
}

const ACCENTS: Record<string, { brand: string; active: string; dot: string }> = {
    indigo: { brand: 'text-indigo-600', active: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-600' },
    slate: { brand: 'text-slate-100', active: 'bg-slate-700 text-white', dot: 'bg-sky-400' },
};

export default function AppShell({
    brand,
    nav,
    header,
    banner,
    topbarRight,
    user,
    dark = false,
    padded = false,
    children,
}: PropsWithChildren<{
    brand: { title: string; subtitle?: string };
    nav: NavGroup[];
    header?: ReactNode;
    banner?: ReactNode;
    topbarRight?: ReactNode;
    user: { name: string; email: string };
    dark?: boolean;
    padded?: boolean;
}>) {
    const accent = ACCENTS[dark ? 'slate' : 'indigo'];
    const t = useT();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [query, setQuery] = useState('');

    useEffect(() => {
        setCollapsed(localStorage.getItem('cc_sidebar') === '1');
    }, []);

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            localStorage.setItem('cc_sidebar', prev ? '0' : '1');
            return !prev;
        });
    };

    const flatItems = useMemo(() => nav.flatMap((g) => g.items), [nav]);

    const results = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (q === '') return [];
        return flatItems.filter((i) => i.label.toLowerCase().includes(q)).slice(0, 6);
    }, [query, flatItems]);

    const sidebarWidth = collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64';

    const sidebarSide = dark ? 'bg-slate-900 text-slate-300' : 'bg-white text-gray-700';

    const sidebarContent = (
        <div className="flex h-full flex-col">
            <div className={'flex h-14 shrink-0 items-center gap-2 border-b px-4 ' + (dark ? 'border-slate-800' : 'border-gray-100')}>
                <ApplicationLogo className={'h-6 w-6 shrink-0 fill-current ' + (dark ? 'text-white' : 'text-gray-700')} />
                {!collapsed && (
                    <div className="min-w-0">
                        <div className={'truncate text-sm font-semibold ' + (dark ? 'text-white' : 'text-gray-900')}>
                            {brand.title}
                        </div>
                        {brand.subtitle && (
                            <div className={'truncate text-[11px] ' + (dark ? 'text-slate-400' : 'text-gray-400')}>
                                {brand.subtitle}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-2 py-3">
                {nav.map((group, gi) => (
                    <div key={gi} className={gi > 0 ? 'mt-4' : ''}>
                        {group.label && !collapsed && (
                            <div className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                                {group.label}
                            </div>
                        )}
                        <div className="space-y-0.5">
                            {group.items.map((item) => (
                                <Link
                                    key={item.href + item.label}
                                    href={item.href}
                                    title={collapsed ? item.label : undefined}
                                    className={
                                        'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ' +
                                        (item.active
                                            ? accent.active
                                            : dark
                                              ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900') +
                                        (collapsed ? ' justify-center px-2' : '')
                                    }
                                >
                                    <Icon name={item.icon} className="h-5 w-5 shrink-0" />
                                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                                    {!collapsed && item.badge !== undefined && item.badge > 0 && (
                                        <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            <div className={'shrink-0 border-t p-2 ' + (dark ? 'border-slate-800' : 'border-gray-100')}>
                <div className={'flex items-center gap-2 rounded-md px-2 py-2 ' + (dark ? 'hover:bg-slate-800' : 'hover:bg-gray-50')}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-xs font-semibold text-white">
                        {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <div className={'truncate text-sm font-medium ' + (dark ? 'text-white' : 'text-gray-800')}>
                                {user.name}
                            </div>
                            <div className={'truncate text-[11px] ' + (dark ? 'text-slate-400' : 'text-gray-400')}>
                                {user.email}
                            </div>
                        </div>
                    )}
                    {!collapsed && (
                        <Link href={route('logout')} method="post" as="button" title={t('shell.signout')} className="text-gray-400 hover:text-red-600">
                            <Icon name="logout" className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-100">
            {/* Desktop sidebar */}
            <aside
                className={
                    'fixed inset-y-0 left-0 z-30 hidden shrink-0 border-r transition-all duration-200 lg:block ' +
                    sidebarWidth +
                    ' ' +
                    sidebarSide +
                    ' ' +
                    (dark ? 'border-slate-800' : 'border-gray-200')
                }
            >
                {sidebarContent}
            </aside>

            {/* Mobile slide-over */}
            {mobileOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
                    <aside className={'absolute inset-y-0 left-0 w-64 ' + sidebarSide}>{sidebarContent}</aside>
                </div>
            )}

            <div className={'flex min-h-screen flex-col ' + (collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64')}>
                {/* Top bar */}
                <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/90 px-4 backdrop-blur">
                    <button onClick={() => setMobileOpen(true)} className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden">
                        <Icon name="menu" />
                    </button>
                    <button onClick={toggleCollapsed} className="hidden rounded-md p-1.5 text-gray-500 hover:bg-gray-100 lg:block" title={t('shell.toggleSidebar')}>
                        <Icon name="menu" />
                    </button>

                    <div className="relative w-full max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                            <Icon name="search" className="h-4 w-4" />
                        </div>
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder={t('shell.search')}
                            className="w-full rounded-md border-gray-200 bg-gray-50 py-1.5 pl-9 pr-3 text-sm focus:border-indigo-400 focus:bg-white focus:ring-indigo-400"
                        />
                        {results.length > 0 && (
                            <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
                                {results.map((item) => (
                                    <button
                                        key={item.href}
                                        onClick={() => {
                                            router.visit(item.href);
                                            setQuery('');
                                        }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                                    >
                                        <Icon name={item.icon} className="h-4 w-4 text-gray-400" />
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="ms-auto flex items-center gap-3">{topbarRight}</div>
                </header>

                {banner}

                <main className="flex-1">
                    {header && (
                        <div className="border-b border-gray-200 bg-white">
                            <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">{header}</div>
                        </div>
                    )}
                    {padded ? (
                        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
                    ) : (
                        children
                    )}
                </main>
            </div>
        </div>
    );
}
