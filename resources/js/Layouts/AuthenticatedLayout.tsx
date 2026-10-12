import Icon from '@/Components/Icon';
import { useT } from '@/i18n';
import AppShell, { NavGroup, NavItem } from '@/Layouts/AppShell';
import { Link, router, usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

export default function Authenticated({
    header,
    children,
}: PropsWithChildren<{ header?: ReactNode }>) {
    const page = usePage().props as Record<string, any>;
    const user = page.auth.user;
    const permissions: string[] = page.auth.permissions ?? [];
    const tenant = page.tenant;
    const impersonation = page.impersonation;
    const unread = page.notifications?.unread ?? 0;
    const locale = page.locale ?? 'en';
    const locales: { value: string; label: string }[] = page.locales ?? [];
    const features: string[] | null = page.features ?? null;

    const can = (permission: string) => permissions.includes(permission);
    const entitled = (feature: string) => features === null || features.includes(feature);
    const isPlatformAdmin = user?.is_platform_admin === true;
    const t = useT();

    const item = (
        label: string,
        href: string,
        icon: NavItem['icon'],
        pattern: string,
    ): NavItem => ({ label, href, icon, active: route().current(pattern) });

    const group = (label: string | undefined, items: (NavItem | false)[]): NavGroup => ({
        label,
        items: items.filter((i): i is NavItem => Boolean(i)),
    });

    const nav: NavGroup[] = [
        group(undefined, [item(t('nav.overview'), route('dashboard'), 'grid', 'dashboard')]),
        group(t('nav.section.workspace'), [
            can('pos.use') && entitled('pos') && item(t('nav.pos'), route('pos.index'), 'cart', 'pos.*'),
            can('orders.view') && item(t('nav.orders'), route('orders.index'), 'receipt', 'orders.*'),
            can('tables.view') && entitled('tables') && item(t('nav.tables'), route('tables.index'), 'table', 'tables.*'),
            can('kitchen.view') && entitled('kitchen') && item(t('nav.kitchen'), route('kitchen.index'), 'fire', 'kitchen.*'),
        ]),
        group(t('nav.section.operations'), [
            can('qr.view') && entitled('qr_dining') && item(t('nav.qr_tables'), route('qr-dining.tables.index'), 'qr', 'qr-dining.*'),
        ]),
        group(t('nav.section.catalog'), [
            can('menu.view') && entitled('menu') && item(t('nav.menu'), route('menu.index'), 'book', 'menu.*'),
            can('modifiers.view') && entitled('menu') && item(t('nav.modifiers'), route('modifiers.index'), 'tag', 'modifiers.*'),
            can('inventory.view') && entitled('inventory') && item(t('nav.inventory'), route('inventory.index'), 'cube', 'inventory.*'),
            can('purchasing.view') && entitled('purchasing') && item(t('nav.purchasing'), route('purchasing.orders.index'), 'store', 'purchasing.*'),
            can('waste.view') && entitled('waste') && item(t('nav.waste'), route('waste.index'), 'trash', 'waste.*'),
            can('inventory.view') && entitled('transfers') && item(t('nav.transfers'), route('transfers.index'), 'transfer', 'transfers.*'),
        ]),
        group(t('nav.section.people'), [
            can('customers.view') && item(t('nav.customers'), route('customers.index'), 'users', 'customers.*'),
            can('staff.view') && item(t('nav.staff'), route('staff.index'), 'user', 'staff.*'),
        ]),
        group(t('nav.section.finance'), [
            can('expenses.view') && item(t('nav.expenses'), route('expenses.index'), 'wallet', 'expenses.*'),
            can('accounts.view') && entitled('accounts') && item(t('nav.accounts'), route('accounts.index'), 'credit-card', 'accounts.*'),
            can('reports.view') && entitled('reports') && item(t('nav.reports'), route('reports.index'), 'chart', 'reports.*'),
        ]),
        group(t('nav.section.business'), [
            can('settings.manage') && item(t('nav.delivery'), route('delivery-zones.index'), 'truck', 'delivery-zones.*'),
            can('branches.view') && item(t('nav.branches'), route('branches.index'), 'building', 'branches.*'),
            can('subscription.view') && item(t('nav.subscription'), route('subscription.index'), 'crown', 'subscription.*'),
            can('settings.manage') && item(t('nav.settings'), route('settings.show', { group: 'company' }), 'sliders', 'settings.*'),
        ]),
        group(t('nav.section.platform'), [
            isPlatformAdmin && item(t('nav.platform'), route('platform.dashboard'), 'shield', 'platform.*'),
        ]),
    ];

    const topbarRight = (
        <div className="flex items-center gap-2">
            {locales.length > 1 && (
                <select
                    value={locale}
                    onChange={(e) => router.post(route('locale.update'), { locale: e.target.value }, { preserveScroll: true })}
                    className="rounded-lg border-gray-200 bg-white py-1 px-2 text-xs text-gray-600 focus:border-restrly-500 focus:ring-restrly-500 shadow-subtle"
                    aria-label={t('shell.language')}
                >
                    {locales.map((l) => (
                        <option key={l.value} value={l.value}>
                            {l.label}
                        </option>
                    ))}
                </select>
            )}
            <Link
                href={route('notifications.index')}
                className="relative rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-gray-50 hover:text-gray-700 shadow-subtle transition"
                aria-label="Notifications"
            >
                <Icon name="bell" className="h-4 w-4" />
                {unread > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white shadow-subtle">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </Link>
        </div>
    );

    const announcements = (page.announcements ?? []) as { id: number; title: string; body: string; level: string }[];
    const announcementTone = (level: string) => (level === 'critical' ? 'bg-red-600' : level === 'warning' ? 'bg-amber-500' : 'bg-restrly-600');

    const banner =
        impersonation || announcements.length > 0 ? (
            <div>
                {impersonation && (
                    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-xs font-semibold text-white shadow-subtle">
                        <span>Support impersonation active — you are viewing as a tenant user.</span>
                        <a href={route('platform.impersonate.stop')} className="rounded bg-black/20 px-2 py-0.5 text-xs hover:bg-black/30 font-medium">
                            Stop impersonating
                        </a>
                    </div>
                )}
                {announcements.map((announcement) => (
                    <div key={announcement.id} className={`flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 px-4 py-2 text-xs text-white ${announcementTone(announcement.level)}`}>
                        <strong className="font-semibold">{announcement.title}</strong>
                        <span className="opacity-90">{announcement.body}</span>
                    </div>
                ))}
            </div>
        ) : null;

    return (
        <AppShell
            brand={{ title: tenant?.name ?? 'Restrly POS', subtitle: t('shell.management') }}
            nav={nav}
            header={header}
            banner={banner}
            topbarRight={topbarRight}
            user={{ name: user?.name ?? 'User', email: user?.email ?? '', role: isPlatformAdmin ? 'Platform Admin' : 'Staff' }}
            branches={page.branches ?? []}
            activeBranchId={page.active_branch_id ?? null}
        >
            {children}
        </AppShell>
    );
}
