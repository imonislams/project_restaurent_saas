import Icon from '@/Components/Icon';
import { useT } from '@/i18n';
import AppShell, { NavGroup, NavItem } from '@/Layouts/AppShell';
import { router, usePage } from '@inertiajs/react';
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
            can('kitchen.view') && entitled('kitchen') && item(t('nav.kitchen'), route('kitchen.index'), 'fire', 'kitchen.*'),
            can('tables.view') && entitled('tables') && item(t('nav.tables'), route('tables.index'), 'table', 'tables.*'),
        ]),
        group(t('nav.section.catalog'), [
            can('menu.view') && entitled('menu') && item(t('nav.menu'), route('menu.index'), 'book', 'menu.*'),
            can('inventory.view') && entitled('inventory') && item(t('nav.inventory'), route('inventory.index'), 'cube', 'inventory.*'),
            can('purchasing.view') && entitled('purchasing') && item(t('nav.purchasing'), route('purchasing.orders.index'), 'store', 'purchasing.*'),
            can('waste.view') && entitled('waste') && item(t('nav.waste'), route('waste.index'), 'trash', 'waste.*'),
            can('inventory.view') && entitled('transfers') && item(t('nav.transfers'), route('transfers.index'), 'transfer', 'transfers.*'),
        ]),
        group(t('nav.section.finance'), [
            can('expenses.view') && item(t('nav.expenses'), route('expenses.index'), 'wallet', 'expenses.*'),
            can('accounts.view') && entitled('accounts') && item(t('nav.accounts'), route('accounts.index'), 'wallet', 'accounts.*'),
            can('reports.view') && entitled('reports') && item(t('nav.reports'), route('reports.index'), 'chart', 'reports.*'),
        ]),
        group(t('nav.section.people'), [
            can('customers.view') && item(t('nav.customers'), route('customers.index'), 'users', 'customers.*'),
            can('staff.view') && item(t('nav.staff'), route('staff.index'), 'user', 'staff.*'),
        ]),
        group(t('nav.section.settings'), [
            can('settings.manage') && item(t('nav.delivery'), route('delivery-zones.index'), 'truck', 'delivery-zones.*'),
            item(t('nav.profile'), route('profile.edit'), 'cog', 'profile.*'),
        ]),
        group(t('nav.section.platform'), [
            isPlatformAdmin && item(t('nav.platform'), route('platform.dashboard'), 'crown', 'platform.*'),
        ]),
    ];

    const topbarRight = (
        <>
            {locales.length > 1 && (
                <select
                    value={locale}
                    onChange={(e) => router.post(route('locale.update'), { locale: e.target.value }, { preserveScroll: true })}
                    className="rounded-md border-gray-200 py-1 text-xs text-gray-600"
                    aria-label={t('shell.language')}
                >
                    {locales.map((l) => (
                        <option key={l.value} value={l.value}>
                            {l.label}
                        </option>
                    ))}
                </select>
            )}
            <a
                href={route('notifications.index')}
                className="relative rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Notifications"
            >
                <Icon name="bell" className="h-5 w-5" />
                {unread > 0 && (
                    <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                        {unread > 9 ? '9+' : unread}
                    </span>
                )}
            </a>
        </>
    );

    const banner = impersonation ? (
        <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-medium text-white">
            <span>Support impersonation active — you are viewing as a tenant user.</span>
            <a href={route('platform.impersonate.stop')} className="rounded bg-black/20 px-2 py-0.5 text-xs hover:bg-black/30">
                Stop impersonating
            </a>
        </div>
    ) : null;

    return (
        <AppShell
            brand={{ title: tenant?.name ?? 'Restaurant POS', subtitle: t('shell.management') }}
            nav={nav}
            header={header}
            banner={banner}
            topbarRight={topbarRight}
            user={{ name: user?.name ?? '', email: user?.email ?? '' }}
        >
            {children}
        </AppShell>
    );
}
