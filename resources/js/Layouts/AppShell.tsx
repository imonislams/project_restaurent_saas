import ApplicationLogo from '@/Components/ApplicationLogo';
import Icon, { IconName } from '@/Components/Icon';
import BranchSelector from '@/Components/ui/BranchSelector';
import CommandPalette, { CommandItem } from '@/Components/ui/CommandPalette';
import KeyboardShortcutsModal from '@/Components/ui/KeyboardShortcutsModal';
import { ToastProvider } from '@/Components/ui/Toast';
import { useT } from '@/i18n';
import { BranchSummary } from '@/types';
import { Link, router } from '@inertiajs/react';
import {
    PropsWithChildren,
    ReactNode,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

export interface NavItem {
    label: string;
    href: string;
    icon: IconName;
    active: boolean;
    badge?: number;
    keywords?: string;
}

export interface NavGroup {
    key?: string;
    label?: string;
    items: NavItem[];
}

let navScrollMemory = 0;

export interface AppShellProps {
    brand: { title: string; subtitle?: string };
    nav: NavGroup[];
    header?: ReactNode;
    banner?: ReactNode;
    topbarRight?: ReactNode;
    user: { name: string; email: string; role?: string };
    branches?: BranchSummary[];
    activeBranchId?: number | null;
    dark?: boolean;
    padded?: boolean;
}

export default function AppShell({
    brand,
    nav,
    header,
    banner,
    topbarRight,
    user,
    branches = [],
    activeBranchId,
    dark = false,
    padded = false,
    children,
}: PropsWithChildren<AppShellProps>) {
    const t = useT();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

    const navRef = useRef<HTMLElement | null>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCollapsed(localStorage.getItem('restrly_sidebar') === '1');
        try {
            setOpenGroups(JSON.parse(localStorage.getItem('restrly_nav_open') ?? '{}'));
        } catch {
            setOpenGroups({});
        }
    }, []);

    // Handle global keyboard shortcuts: ⌘K or Ctrl+K for search, ? for shortcuts modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            const isInput =
                target?.tagName === 'INPUT' ||
                target?.tagName === 'TEXTAREA' ||
                target?.isContentEditable;

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setCommandPaletteOpen((prev) => !prev);
            } else if (e.key === '?' && !isInput && !e.metaKey && !e.ctrlKey) {
                e.preventDefault();
                setShortcutsModalOpen((prev) => !prev);
            } else if (e.key === 'Escape') {
                setUserMenuOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Click outside user menu
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Preserve sidebar scroll position across Inertia visits
    useLayoutEffect(() => {
        const element = navRef.current;
        if (!element) return;

        const saved = navScrollMemory || Number(sessionStorage.getItem('restrly_nav_scroll') ?? '0');
        element.scrollTop = saved > 0 ? saved : 0;

        const active = element.querySelector<HTMLElement>('[data-nav-active="true"]');
        if (active) {
            const navRect = element.getBoundingClientRect();
            const itemRect = active.getBoundingClientRect();
            if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) {
                active.scrollIntoView({ block: 'nearest' });
            }
        }
    }, []);

    const handleNavScroll = () => {
        const element = navRef.current;
        if (!element) return;
        navScrollMemory = element.scrollTop;
        sessionStorage.setItem('restrly_nav_scroll', String(element.scrollTop));
    };

    const groupKey = (group: NavGroup, index: number) => group.key ?? group.label ?? `group-${index}`;

    const toggleGroup = (key: string) => {
        setOpenGroups((prev) => {
            const next = { ...prev, [key]: prev[key] === false };
            localStorage.setItem('restrly_nav_open', JSON.stringify(next));
            return next;
        });
    };

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('restrly_sidebar', next ? '1' : '0');
            return next;
        });
    };

    // Never render a section header with nothing under it (e.g. a group whose
    // items were all filtered out by permissions or plan entitlements).
    const visibleGroups = useMemo(() => nav.filter((group) => group.items.length > 0), [nav]);

    // Flatten all navigable items for Command Palette
    const commandItems: CommandItem[] = useMemo(() => {
        return visibleGroups.flatMap((g, gIdx) =>
            g.items.map((item, iIdx) => ({
                id: `${gIdx}-${iIdx}-${item.href}`,
                label: item.label,
                category: g.label ?? 'Workspace',
                href: item.href,
                icon: item.icon,
                keywords: item.keywords,
            })),
        );
    }, [visibleGroups]);

    const sidebarWidth = collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64';
    const sidebarSide = dark ? 'bg-slate-900 text-slate-300' : 'bg-white text-gray-700';

    const sidebarContent = (
        <div className="flex h-full flex-col">
            {/* Sidebar Brand Header */}
            <div
                className={
                    'flex h-14 shrink-0 items-center justify-between border-b px-4 ' +
                    (dark ? 'border-slate-800' : 'border-gray-100')
                }
            >
                <Link href={route('dashboard')} className="flex items-center gap-2.5 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-restrly-600 text-white shadow-subtle">
                        <ApplicationLogo className="h-5 w-5 fill-current text-white" />
                    </div>
                    {!collapsed && (
                        <div className="min-w-0">
                            <div className={'truncate text-sm font-bold tracking-tight ' + (dark ? 'text-white' : 'text-gray-900')}>
                                {brand.title}
                            </div>
                            {brand.subtitle && (
                                <div className={'truncate text-[10px] font-medium tracking-wide uppercase ' + (dark ? 'text-slate-400' : 'text-gray-400')}>
                                    {brand.subtitle}
                                </div>
                            )}
                        </div>
                    )}
                </Link>

                {!collapsed && (
                    <button
                        type="button"
                        onClick={toggleCollapsed}
                        className="hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 lg:block transition"
                        title={t('shell.toggleSidebar')}
                    >
                        <Icon name="chevron" className="h-4 w-4 rotate-180" />
                    </button>
                )}
            </div>

            {/* Navigation Groups */}
            <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 overflow-y-auto px-2.5 py-3 space-y-4">
                {visibleGroups.map((group, gi) => {
                    const key = groupKey(group, gi);
                    const open = collapsed ? true : openGroups[key] !== false;

                    return (
                        <div key={key} className={gi > 0 ? 'pt-1' : ''}>
                            {group.label && !collapsed && (
                                <button
                                    type="button"
                                    onClick={() => toggleGroup(key)}
                                    aria-expanded={open}
                                    className={
                                        'flex w-full items-center justify-between rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition ' +
                                        (dark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-700')
                                    }
                                >
                                    <span>{group.label}</span>
                                    <Icon name="chevron" className={'h-3 w-3 transition-transform ' + (open ? 'rotate-90' : '')} />
                                </button>
                            )}

                            {collapsed && gi > 0 && (
                                <div className={'my-2 border-t ' + (dark ? 'border-slate-800' : 'border-gray-100')} />
                            )}

                            {open && (
                                <div className="mt-1 space-y-0.5">
                                    {group.items.map((item) => {
                                        return (
                                            <Link
                                                key={item.href + item.label}
                                                href={item.href}
                                                data-nav-active={item.active ? 'true' : undefined}
                                                title={collapsed ? item.label : undefined}
                                                className={
                                                    'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-xs font-medium transition ' +
                                                    (item.active
                                                        ? 'bg-restrly-50 text-restrly-800 font-semibold shadow-subtle border-l-2 border-restrly-600'
                                                        : dark
                                                          ? 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900') +
                                                    (collapsed ? ' justify-center px-2' : '')
                                                }
                                            >
                                                <Icon
                                                    name={item.icon}
                                                    className={
                                                        'h-4 w-4 shrink-0 transition-colors ' +
                                                        (item.active ? 'text-restrly-600' : 'text-gray-400 group-hover:text-gray-600')
                                                    }
                                                />
                                                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                                                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                                                    <span className="rounded-full bg-red-600 px-1.5 py-0.2 text-[10px] font-bold text-white shadow-subtle">
                                                        {item.badge}
                                                    </span>
                                                )}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            {/* Sidebar Footer User Section */}
            <div className={'shrink-0 border-t p-2.5 ' + (dark ? 'border-slate-800' : 'border-gray-100')}>
                <div
                    className={
                        'flex items-center gap-2.5 rounded-lg p-2 transition ' +
                        (dark ? 'hover:bg-slate-800' : 'hover:bg-gray-50')
                    }
                >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-restrly-600 text-xs font-bold text-white shadow-subtle">
                        {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    {!collapsed && (
                        <div className="min-w-0 flex-1">
                            <div className={'truncate text-xs font-semibold ' + (dark ? 'text-white' : 'text-gray-900')}>
                                {user.name}
                            </div>
                            <div className={'truncate text-[10px] ' + (dark ? 'text-slate-400' : 'text-gray-400')}>
                                {user.email}
                            </div>
                        </div>
                    )}
                    {!collapsed && (
                        <Link
                            href={route('logout')}
                            method="post"
                            as="button"
                            title={t('shell.signout')}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                        >
                            <Icon name="logout" className="h-4 w-4" />
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <ToastProvider>
            <div className="min-h-screen bg-gray-50/60 font-sans text-gray-900 antialiased selection:bg-restrly-500 selection:text-white">
                {/* Desktop Sidebar */}
                <aside
                    className={
                        'fixed inset-y-0 left-0 z-30 hidden shrink-0 border-r transition-all duration-200 lg:block shadow-subtle ' +
                        sidebarWidth +
                        ' ' +
                        sidebarSide +
                        ' ' +
                        (dark ? 'border-slate-800' : 'border-gray-200/80')
                    }
                >
                    {sidebarContent}
                </aside>

                {/* Mobile Drawer */}
                {mobileOpen && (
                    <div className="fixed inset-0 z-50 lg:hidden">
                        <div
                            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
                            onClick={() => setMobileOpen(false)}
                        />
                        <aside className={'absolute inset-y-0 left-0 w-64 shadow-elevated ' + sidebarSide}>
                            {sidebarContent}
                        </aside>
                    </div>
                )}

                {/* Main Content Area */}
                <div className={'flex min-h-screen flex-col transition-all duration-200 ' + (collapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64')}>
                    {/* Top Bar */}
                    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-gray-200/80 bg-white/95 px-4 backdrop-blur shadow-subtle sm:px-6">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Mobile menu toggle */}
                            <button
                                type="button"
                                onClick={() => setMobileOpen(true)}
                                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:hidden transition"
                                aria-label="Open mobile navigation"
                            >
                                <Icon name="menu" className="h-5 w-5" />
                            </button>

                            {/* Desktop sidebar expand toggle when collapsed */}
                            {collapsed && (
                                <button
                                    type="button"
                                    onClick={toggleCollapsed}
                                    className="hidden rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 lg:block transition"
                                    title="Expand sidebar"
                                >
                                    <Icon name="menu" className="h-5 w-5" />
                                </button>
                            )}

                            {/* Active Branch Selector */}
                            <BranchSelector branches={branches} activeBranchId={activeBranchId} />
                        </div>

                        {/* Search & Actions */}
                        <div className="flex items-center gap-2 sm:gap-3">
                            {/* Command Search Bar Trigger */}
                            <button
                                type="button"
                                onClick={() => setCommandPaletteOpen(true)}
                                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/80 px-2.5 py-1.5 text-xs text-gray-500 hover:border-gray-300 hover:bg-white hover:text-gray-700 transition shadow-subtle sm:w-64"
                            >
                                <Icon name="search" className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                <span className="hidden sm:inline truncate text-left flex-1">Quick search or command...</span>
                                <span className="sm:hidden text-left">Search</span>
                                <kbd className="hidden sm:inline-flex items-center rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-mono text-gray-400">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* Keyboard Shortcuts Trigger Button */}
                            <button
                                type="button"
                                onClick={() => setShortcutsModalOpen(true)}
                                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                                title="Keyboard shortcuts (?)"
                            >
                                <span className="font-mono text-xs font-semibold">?</span>
                            </button>

                            {/* Topbar Right Slot (Language, etc.) */}
                            {topbarRight}

                            {/* User Profile Popover */}
                            <div ref={userMenuRef} className="relative">
                                <button
                                    type="button"
                                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                                    className="flex items-center gap-2 rounded-lg p-1 hover:bg-gray-100 transition focus:outline-none"
                                    aria-expanded={userMenuOpen}
                                    aria-haspopup="true"
                                >
                                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-restrly-600 text-xs font-bold text-white shadow-subtle">
                                        {user.name.slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="hidden text-left md:block">
                                        <div className="text-xs font-semibold text-gray-800 leading-tight">{user.name}</div>
                                        <div className="text-[10px] text-gray-400 leading-tight">
                                            {user.role ?? 'Staff'}
                                        </div>
                                    </div>
                                    <Icon name="chevron" className="hidden md:block h-3 w-3 text-gray-400" />
                                </button>

                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-gray-200 bg-white p-1 shadow-elevated z-50">
                                        <div className="border-b border-gray-100 px-3 py-2.5">
                                            <div className="text-xs font-semibold text-gray-900">{user.name}</div>
                                            <div className="truncate text-[11px] text-gray-500">{user.email}</div>
                                        </div>
                                        <div className="py-1">
                                            <Link
                                                href={route('profile.edit')}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                <Icon name="user" className="h-3.5 w-3.5 text-gray-400" />
                                                <span>My Profile</span>
                                            </Link>
                                            <Link
                                                href={route('settings.show', { group: 'company' })}
                                                onClick={() => setUserMenuOpen(false)}
                                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                                <Icon name="sliders" className="h-3.5 w-3.5 text-gray-400" />
                                                <span>Restaurant Settings</span>
                                            </Link>
                                        </div>
                                        <div className="border-t border-gray-100 pt-1">
                                            <Link
                                                href={route('logout')}
                                                method="post"
                                                as="button"
                                                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50"
                                            >
                                                <Icon name="logout" className="h-3.5 w-3.5" />
                                                <span>{t('shell.signout')}</span>
                                            </Link>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </header>

                    {/* Impersonation / Announcement Banners */}
                    {banner}

                    {/* Main View Container */}
                    <main className="flex-1">
                        {header && (
                            <div className="border-b border-gray-200/80 bg-white">
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

                {/* Command Palette Modal */}
                <CommandPalette
                    show={commandPaletteOpen}
                    onClose={() => setCommandPaletteOpen(false)}
                    items={commandItems}
                />

                {/* Keyboard Shortcuts Modal */}
                <KeyboardShortcutsModal
                    show={shortcutsModalOpen}
                    onClose={() => setShortcutsModalOpen(false)}
                />
            </div>
        </ToastProvider>
    );
}
