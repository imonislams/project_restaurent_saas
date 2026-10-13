import ApplicationLogo from '@/Components/ApplicationLogo';
import Icon, { IconName } from '@/Components/Icon';
import NotificationWatcher from '@/Components/NotificationWatcher';
import { Avatar, AvatarFallback, AvatarImage } from '@/Components/ui/Avatar';
import BranchSelector from '@/Components/ui/BranchSelector';
import CommandPalette, { CommandItem } from '@/Components/ui/CommandPalette';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/Components/ui/DropdownMenu';
import KeyboardShortcutsModal from '@/Components/ui/KeyboardShortcutsModal';
import { Separator } from '@/Components/ui/Separator';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarProvider,
    SidebarRail,
    SidebarTrigger,
} from '@/Components/ui/sidebar';
import { ToastProvider } from '@/Components/ui/Toast';
import { useT } from '@/i18n';
import { BranchSummary } from '@/types';
import { Link } from '@inertiajs/react';
import {
    ChevronsUpDown,
    HelpCircle,
    LogOut,
    Search,
    Sliders,
    User as UserIcon,
} from 'lucide-react';
import React, {
    PropsWithChildren,
    ReactNode,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { cn } from '@/Components/ui/cn';

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
    brand: { title: string; subtitle?: string; logoUrl?: string | null };
    nav: NavGroup[];
    header?: ReactNode;
    banner?: ReactNode;
    topbarRight?: ReactNode;
    user: { name: string; email: string; role?: string; avatarUrl?: string | null };
    branches?: BranchSummary[];
    activeBranchId?: number | null;
    dark?: boolean;
    padded?: boolean;
    pendingApprovals?: number;
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
    padded = false,
    pendingApprovals = 0,
    children,
}: PropsWithChildren<AppShellProps>) {
    const t = useT();
    const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
    const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
    const navRef = useRef<HTMLDivElement | null>(null);

    // Global keyboard shortcuts: ⌘K or Ctrl+K for search, ? for shortcuts modal
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
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Preserve sidebar scroll position across Inertia visits
    useLayoutEffect(() => {
        const element = navRef.current;
        if (!element) return;

        const saved = navScrollMemory || Number(sessionStorage.getItem('restrly_nav_scroll') ?? '0');
        element.scrollTop = saved > 0 ? saved : 0;

        const active = element.querySelector<HTMLElement>('[data-active="true"]');
        if (active) {
            const navRect = element.getBoundingClientRect();
            const itemRect = active.getBoundingClientRect();
            if (itemRect.top < navRect.top || itemRect.bottom > navRect.bottom) {
                active.scrollIntoView({ block: 'nearest' });
            }
        }
    }, []);

    const handleNavScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;
        navScrollMemory = target.scrollTop;
        sessionStorage.setItem('restrly_nav_scroll', String(target.scrollTop));
    };

    const groupKey = (group: NavGroup, index: number) => group.key ?? group.label ?? `group-${index}`;

    const visibleGroups = useMemo(() => nav.filter((group) => group.items.length > 0), [nav]);

    const commandItems: CommandItem[] = useMemo(() => {
        return visibleGroups.flatMap((g, gIdx) =>
            g.items.map((item, iIdx) => ({
                id: `${gIdx}-${iIdx}-${item.href}`,
                label: item.label,
                category: g.label ?? 'Workspace',
                href: item.href,
                icon: item.icon,
                keywords: item.keywords,
            }))
        );
    }, [visibleGroups]);

    // Active item finding for breadcrumb display
    const currentActiveItem = useMemo(() => {
        for (const group of visibleGroups) {
            const found = group.items.find((i) => i.active);
            if (found) return { groupLabel: group.label, item: found };
        }
        return null;
    }, [visibleGroups]);

    const userInitial = user.name ? user.name.slice(0, 1).toUpperCase() : 'U';

    return (
        <ToastProvider>
            <NotificationWatcher pending={pendingApprovals} />
            <SidebarProvider defaultOpen>
                {/* Desktop and Mobile Genuine shadcn Sidebar */}
                <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar select-none">
                    {/* Header: Logo, Brand wordmark & Restaurant Selector */}
                    <SidebarHeader className="p-3 border-b border-sidebar-border/80 space-y-2.5">
                        <div className="flex items-center gap-2.5 px-1 min-w-0">
                            <Link
                                href={
                                    typeof route !== 'undefined' && route().current('platform.*')
                                        ? route('platform.dashboard')
                                        : route('dashboard')
                                }
                                className="flex items-center gap-2.5 min-w-0 group-data-[collapsible=icon]:justify-center"
                            >
                                {brand.logoUrl ? (
                                    <img
                                        src={brand.logoUrl}
                                        alt={brand.title}
                                        className="h-7 w-7 shrink-0 rounded-md object-cover border border-sidebar-border shadow-xs"
                                    />
                                ) : (
                                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs">
                                        <ApplicationLogo className="h-4 w-4 fill-current text-white" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
                                    <div className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
                                        Restrly
                                    </div>
                                    <div className="truncate text-[10px] font-medium tracking-wide uppercase text-muted-foreground">
                                        {brand.title}
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Restaurant / Branch Selector Dropdown */}
                        {branches.length > 0 && (
                            <div className="group-data-[collapsible=icon]:hidden">
                                <BranchSelector branches={branches} activeBranchId={activeBranchId} />
                            </div>
                        )}
                    </SidebarHeader>

                    {/* Navigation Groups */}
                    <SidebarContent ref={navRef} onScroll={handleNavScroll} className="px-2 py-2 space-y-1">
                        {visibleGroups.map((group, gi) => {
                            const key = groupKey(group, gi);

                            return (
                                <SidebarGroup key={key} className="py-1">
                                    {group.label && (
                                        <SidebarGroupLabel className="px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none group-data-[collapsible=icon]:hidden">
                                            {group.label}
                                        </SidebarGroupLabel>
                                    )}

                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            {group.items.map((item) => (
                                                <SidebarMenuItem key={item.href + item.label}>
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={item.active}
                                                        tooltip={item.label}
                                                        className={cn(
                                                            'h-9 px-2.5 text-[13px] font-medium rounded-md transition-colors',
                                                            item.active
                                                                ? 'bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-2xs'
                                                                : 'text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
                                                        )}
                                                    >
                                                        <Link href={item.href} className="flex items-center gap-2.5">
                                                            <Icon
                                                                name={item.icon}
                                                                className={cn(
                                                                    'h-4 w-4 shrink-0 transition-colors',
                                                                    item.active
                                                                        ? 'text-primary'
                                                                        : 'text-muted-foreground/80 group-hover/menu-button:text-sidebar-foreground'
                                                                )}
                                                            />
                                                            <span className="truncate flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                                                            {item.badge !== undefined && item.badge > 0 && (
                                                                <SidebarMenuBadge className="ml-auto bg-primary text-primary-foreground font-bold group-data-[collapsible=icon]:hidden">
                                                                    {item.badge}
                                                                </SidebarMenuBadge>
                                                            )}
                                                        </Link>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            ))}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </SidebarGroup>
                            );
                        })}
                    </SidebarContent>

                    {/* Footer: Authenticated User and Menu */}
                    <SidebarFooter className="border-t border-sidebar-border/80 p-2">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-sidebar-accent cursor-pointer"
                                    tooltip={user.name}
                                >
                                    <Avatar className="h-8 w-8 rounded-full border border-sidebar-border">
                                        {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.name} />}
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                                            {userInitial}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-xs leading-tight min-w-0 group-data-[collapsible=icon]:hidden">
                                        <span className="truncate font-semibold text-sidebar-foreground">
                                            {user.name}
                                        </span>
                                        <span className="truncate text-[10px] text-muted-foreground">
                                            {user.role ?? user.email}
                                        </span>
                                    </div>
                                    <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground group-data-[collapsible=icon]:hidden" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                className="w-56 rounded-md border border-border bg-popover p-1 shadow-md text-popover-foreground"
                                side="right"
                                align="end"
                                sideOffset={8}
                            >
                                <DropdownMenuLabel className="p-2 font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-xs font-semibold leading-none text-foreground">{user.name}</p>
                                        <p className="text-[11px] leading-none text-muted-foreground truncate">
                                            {user.email}
                                        </p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('profile.edit')}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer"
                                    >
                                        <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>My Profile</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('settings.show', { group: 'company' })}
                                        className="flex items-center gap-2 px-2 py-1.5 text-xs rounded-sm cursor-pointer"
                                    >
                                        <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
                                        <span>Restaurant Settings</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                    <Link
                                        href={route('logout')}
                                        method="post"
                                        as="button"
                                        className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 rounded-sm cursor-pointer"
                                    >
                                        <LogOut className="h-3.5 w-3.5" />
                                        <span>{t('shell.signout')}</span>
                                    </Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarFooter>

                    <SidebarRail />
                </Sidebar>

                {/* Main Inset Application Shell */}
                <SidebarInset className="min-w-0 bg-background">
                    {/* Top Navigation Bar */}
                    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border/80 bg-card/95 px-4 backdrop-blur shadow-xs sm:px-6">
                        <div className="flex items-center gap-2.5 min-w-0">
                            {/* Accessible shadcn Sidebar Trigger */}
                            <SidebarTrigger />
                            <Separator orientation="vertical" className="h-4 bg-border/80" />

                            {/* Breadcrumb Context */}
                            {currentActiveItem && (
                                <nav className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground min-w-0">
                                    {currentActiveItem.groupLabel && (
                                        <>
                                            <span className="font-normal text-muted-foreground truncate">
                                                {currentActiveItem.groupLabel}
                                            </span>
                                            <span className="text-muted-foreground/40">/</span>
                                        </>
                                    )}
                                    <span className="font-semibold text-foreground truncate">
                                        {currentActiveItem.item.label}
                                    </span>
                                </nav>
                            )}
                        </div>

                        {/* Topbar Right Tools: Search, Shortcuts, Language, Notifications, User */}
                        <div className="flex items-center gap-2 sm:gap-2.5">
                            {/* Command Search Trigger */}
                            <button
                                type="button"
                                onClick={() => setCommandPaletteOpen(true)}
                                className="flex items-center gap-2 rounded-md border border-input bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground hover:border-border hover:bg-background hover:text-foreground transition-colors shadow-xs sm:w-60 cursor-pointer"
                            >
                                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <span className="hidden sm:inline truncate text-left flex-1">Search or jump to...</span>
                                <span className="sm:hidden text-left">Search</span>
                                <kbd className="hidden sm:inline-flex items-center rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                                    ⌘K
                                </kbd>
                            </button>

                            {/* Keyboard Shortcuts Trigger */}
                            <button
                                type="button"
                                onClick={() => setShortcutsModalOpen(true)}
                                className="hidden sm:flex h-8 w-8 items-center justify-center rounded-md border border-input text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
                                title="Keyboard shortcuts (?)"
                            >
                                <HelpCircle className="h-4 w-4" />
                            </button>

                            {/* Dynamic Topbar Right Slot (Language Selector, Notifications) */}
                            {topbarRight}
                        </div>
                    </header>

                    {/* Impersonation / Announcement Banners */}
                    {banner}

                    {/* Page Content Body */}
                    <main className="flex-1">
                        {header && (
                            <div className="border-b border-border/60 bg-card">
                                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">{header}</div>
                            </div>
                        )}
                        {padded ? (
                            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">{children}</div>
                        ) : (
                            children
                        )}
                    </main>
                </SidebarInset>
            </SidebarProvider>

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
        </ToastProvider>
    );
}
