import { IconName } from '@/Components/Icon';
import { PageHeader, ToastProvider } from '@/Components/ui';
import { useT } from '@/i18n';
import AppShell, { NavGroup, NavItem } from '@/Layouts/AppShell';
import { usePage } from '@inertiajs/react';
import { PropsWithChildren, ReactNode } from 'react';

interface NavSpec {
    label: string;
    icon: IconName;
    permission: string;
    routeName: string;
    pattern: string;
}

interface NavSection {
    key: string;
    label: string;
    items: NavSpec[];
}

/**
 * Platform control-center information architecture. Every item is gated by a
 * platform.* permission — filtered here for the UI and enforced on the route
 * server-side. Each destination is a distinct, real page: near-duplicates are
 * surfaced as tabs (Tenants → verification, Subscriptions → trials/cancellations)
 * rather than separate menu entries.
 */
const NAV: NavSection[] = [
    {
        key: 'overview',
        label: 'Overview',
        items: [
            { label: 'Platform Dashboard', icon: 'grid', permission: 'platform.dashboard.view', routeName: 'platform.dashboard', pattern: 'platform.dashboard' },
            { label: 'Revenue Analytics', icon: 'activity', permission: 'platform.dashboard.view', routeName: 'platform.analytics.index', pattern: 'platform.analytics.*' },
            { label: 'System Health', icon: 'server', permission: 'platform.monitoring.view', routeName: 'platform.ops.health', pattern: 'platform.ops.health' },
        ],
    },
    {
        key: 'business',
        label: 'Business Management',
        items: [
            { label: 'Tenants', icon: 'store', permission: 'platform.tenants.view', routeName: 'platform.tenants.index', pattern: 'platform.tenants.*' },
            { label: 'Diagnostics', icon: 'activity', permission: 'platform.diagnostics.view', routeName: 'platform.diagnostics.index', pattern: 'platform.diagnostics.*' },
            { label: 'Support Tickets', icon: 'ticket', permission: 'platform.support.view', routeName: 'platform.support.index', pattern: 'platform.support.*' },
        ],
    },
    {
        key: 'subscriptions',
        label: 'Subscriptions & Plans',
        items: [
            { label: 'Plans', icon: 'cube', permission: 'platform.plans.view', routeName: 'platform.plans.index', pattern: 'platform.plans.*' },
            { label: 'Entitlements', icon: 'key', permission: 'platform.plans.view', routeName: 'platform.entitlements.index', pattern: 'platform.entitlements.*' },
            { label: 'Subscriptions', icon: 'refresh', permission: 'platform.subscriptions.view', routeName: 'platform.subscriptions.index', pattern: 'platform.subscriptions.*' },
            { label: 'Usage & Limits', icon: 'activity', permission: 'platform.subscriptions.view', routeName: 'platform.usage.index', pattern: 'platform.usage.*' },
            { label: 'Coupons & Promotions', icon: 'tag', permission: 'platform.subscriptions.view', routeName: 'platform.coupons.index', pattern: 'platform.coupons.*' },
        ],
    },
    {
        key: 'financial',
        label: 'Financial Management',
        items: [
            { label: 'Billing', icon: 'wallet', permission: 'platform.billing.view', routeName: 'platform.billing.overview', pattern: 'platform.billing.overview' },
            { label: 'Invoices', icon: 'file', permission: 'platform.invoices.view', routeName: 'platform.billing.invoices.index', pattern: 'platform.billing.invoices.*' },
            { label: 'Credit Notes', icon: 'file', permission: 'platform.invoices.view', routeName: 'platform.billing.credit-notes', pattern: 'platform.billing.credit-notes' },
            { label: 'Adjustments', icon: 'sliders', permission: 'platform.billing.manage', routeName: 'platform.billing.adjustments', pattern: 'platform.billing.adjustments' },
            { label: 'Payments', icon: 'credit-card', permission: 'platform.payments.view', routeName: 'platform.billing.payments.index', pattern: 'platform.billing.payments.*' },
            { label: 'Refunds', icon: 'refresh', permission: 'platform.refunds.manage', routeName: 'platform.billing.refunds', pattern: 'platform.billing.refunds' },
        ],
    },
    {
        key: 'payments',
        label: 'Payment Infrastructure',
        items: [
            { label: 'Payment Gateways', icon: 'credit-card', permission: 'platform.gateways.configure', routeName: 'platform.gateways.index', pattern: 'platform.gateways.*' },
            { label: 'Payment Webhooks', icon: 'transfer', permission: 'platform.webhooks.manage', routeName: 'platform.payments.webhooks', pattern: 'platform.payments.webhooks' },
        ],
    },
    {
        key: 'communications',
        label: 'Communications',
        items: [
            { label: 'Email Dashboard', icon: 'envelope', permission: 'platform.email.view', routeName: 'platform.email.dashboard', pattern: 'platform.email.dashboard' },
            { label: 'Email Logs', icon: 'file', permission: 'platform.email.view', routeName: 'platform.email.logs', pattern: 'platform.email.logs' },
            { label: 'Failed Emails', icon: 'alert', permission: 'platform.email.view', routeName: 'platform.email.failed', pattern: 'platform.email.failed' },
            { label: 'Email Templates', icon: 'file', permission: 'platform.email.manage', routeName: 'platform.email.templates', pattern: 'platform.email.templates' },
            { label: 'Email Provider', icon: 'sliders', permission: 'platform.email.manage', routeName: 'platform.email.settings', pattern: 'platform.email.settings' },
            { label: 'Notifications', icon: 'bell', permission: 'platform.email.view', routeName: 'platform.notifications.index', pattern: 'platform.notifications.*' },
        ],
    },
    {
        key: 'marketing',
        label: 'Marketing',
        items: [
            { label: 'Campaigns', icon: 'envelope', permission: 'platform.marketing.manage', routeName: 'platform.marketing.campaigns', pattern: 'platform.marketing.campaigns*' },
            { label: 'Announcements', icon: 'bell', permission: 'platform.marketing.manage', routeName: 'platform.marketing.announcements', pattern: 'platform.marketing.announcements*' },
        ],
    },
    {
        key: 'maintenance',
        label: 'Maintenance & Recovery',
        items: [
            { label: 'Maintenance', icon: 'cog', permission: 'platform.maintenance.view', routeName: 'platform.maintenance', pattern: 'platform.maintenance' },
            { label: 'Database Backups', icon: 'database', permission: 'platform.backups.view', routeName: 'platform.backups.index', pattern: 'platform.backups.*' },
            { label: 'Restore Center', icon: 'refresh', permission: 'platform.backups.restore', routeName: 'platform.restores.index', pattern: 'platform.restores.*' },
            { label: 'Retention', icon: 'clock', permission: 'platform.settings.view', routeName: 'platform.settings.retention', pattern: 'platform.settings.retention' },
            { label: 'Maintenance History', icon: 'receipt', permission: 'platform.audit.view', routeName: 'platform.ops.maintenance-history', pattern: 'platform.ops.maintenance-history' },
        ],
    },
    {
        key: 'operations',
        label: 'System Operations',
        items: [
            { label: 'Application Logs', icon: 'file', permission: 'platform.logs.view', routeName: 'platform.ops.logs', pattern: 'platform.ops.logs' },
            { label: 'Queue Monitoring', icon: 'server', permission: 'platform.monitoring.view', routeName: 'platform.ops.queue', pattern: 'platform.ops.queue' },
            { label: 'Failed Jobs', icon: 'alert', permission: 'platform.monitoring.view', routeName: 'platform.ops.failed-jobs', pattern: 'platform.ops.failed-jobs' },
            { label: 'Scheduled Tasks', icon: 'clock', permission: 'platform.monitoring.view', routeName: 'platform.ops.schedule', pattern: 'platform.ops.schedule' },
            { label: 'Command Runner', icon: 'terminal', permission: 'platform.commands.run', routeName: 'platform.commands.index', pattern: 'platform.commands.*' },
        ],
    },
    {
        key: 'security',
        label: 'Security & Access',
        items: [
            { label: 'Administrators', icon: 'users', permission: 'platform.admins.manage', routeName: 'platform.admins.index', pattern: 'platform.admins.*' },
            { label: 'Roles & Permissions', icon: 'key', permission: 'platform.roles.manage', routeName: 'platform.roles.index', pattern: 'platform.roles.*' },
            { label: 'Admin Sessions', icon: 'user', permission: 'platform.security.view', routeName: 'platform.sessions.index', pattern: 'platform.sessions.*' },
            { label: 'Security Events', icon: 'shield', permission: 'platform.security.view', routeName: 'platform.security.index', pattern: 'platform.security.*' },
            { label: 'Audit Logs', icon: 'receipt', permission: 'platform.audit.view', routeName: 'platform.audit.index', pattern: 'platform.audit.*' },
            { label: 'Impersonation History', icon: 'user', permission: 'platform.audit.view', routeName: 'platform.impersonation.index', pattern: 'platform.impersonation.*' },
        ],
    },
    {
        key: 'configuration',
        label: 'Platform Configuration',
        items: [
            { label: 'General Settings', icon: 'sliders', permission: 'platform.settings.view', routeName: 'platform.settings.general', pattern: 'platform.settings.general' },
            { label: 'Branding', icon: 'building', permission: 'platform.settings.view', routeName: 'platform.settings.branding', pattern: 'platform.settings.branding' },
            { label: 'Localization', icon: 'sliders', permission: 'platform.settings.view', routeName: 'platform.settings.localization', pattern: 'platform.settings.localization' },
            { label: 'Billing Settings', icon: 'wallet', permission: 'platform.settings.view', routeName: 'platform.settings.billing', pattern: 'platform.settings.billing' },
            { label: 'Payment Settings', icon: 'credit-card', permission: 'platform.settings.view', routeName: 'platform.settings.payments', pattern: 'platform.settings.payments' },
            { label: 'Operations', icon: 'server', permission: 'platform.settings.view', routeName: 'platform.settings.operations', pattern: 'platform.settings.operations' },
            { label: 'Security Policy', icon: 'shield', permission: 'platform.settings.view', routeName: 'platform.settings.security', pattern: 'platform.settings.security' },
            { label: 'Receipt Branding', icon: 'receipt', permission: 'platform.settings.view', routeName: 'platform.settings.receipts', pattern: 'platform.settings.receipts' },
            { label: 'Feature Flags', icon: 'flag', permission: 'platform.settings.view', routeName: 'platform.settings.features', pattern: 'platform.settings.features' },
        ],
    },
];

export default function PlatformLayout({
    title,
    description,
    actions,
    children,
}: PropsWithChildren<{ title: string; description?: string; actions?: ReactNode }>) {
    const { auth } = usePage().props;
    const t = useT();

    const permissions = (auth as { platform_permissions?: string[] }).platform_permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);

    const nav: NavGroup[] = NAV.map((section) => ({
        key: section.key,
        label: section.label,
        items: section.items
            .filter((item) => can(item.permission))
            .map<NavItem>((item) => ({
                label: item.label,
                icon: item.icon,
                href: route(item.routeName),
                active: route().current(item.pattern),
            })),
    })).filter((section) => section.items.length > 0);

    return (
        <ToastProvider>
            <AppShell
                dark
                padded
                brand={{ title: t('shell.control'), subtitle: t('shell.platform') }}
                nav={nav}
                header={<PageHeader title={title} description={description} actions={actions} />}
                user={{ name: auth.user?.name ?? '', email: auth.user?.email ?? '' }}
            >
                {children}
            </AppShell>
        </ToastProvider>
    );
}
