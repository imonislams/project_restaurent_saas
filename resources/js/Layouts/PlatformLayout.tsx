import { useT } from '@/i18n';
import AppShell, { NavGroup, NavItem } from '@/Layouts/AppShell';
import { usePage } from '@inertiajs/react';
import { PropsWithChildren } from 'react';

export default function PlatformLayout({ title, children }: PropsWithChildren<{ title: string }>) {
    const { auth } = usePage().props;
    const t = useT();

    const item = (label: string, href: string, icon: NavItem['icon'], pattern: string): NavItem => ({
        label,
        href,
        icon,
        active: route().current(pattern),
    });

    const nav: NavGroup[] = [
        {
            items: [
                item(t('nav.overview'), route('platform.dashboard'), 'grid', 'platform.dashboard'),
                item('Tenants', route('platform.tenants.index'), 'store', 'platform.tenants.*'),
                item('Plans', route('platform.plans.index'), 'cube', 'platform.plans.*'),
                item('Audit Log', route('platform.audit.index'), 'receipt', 'platform.audit.*'),
            ],
        },
    ];

    return (
        <AppShell
            dark
            padded
            brand={{ title: t('shell.control'), subtitle: t('shell.platform') }}
            nav={nav}
            header={<h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
            user={{ name: auth.user?.name ?? '', email: auth.user?.email ?? '' }}
        >
            {children}
        </AppShell>
    );
}
