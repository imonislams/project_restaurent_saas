import { Badge, Button, Card, CardBody, CardHeader, KpiCard, PageHeader, StatusDot } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, usePage } from '@inertiajs/react';

interface ChecklistItem {
    key: string;
    label: string;
    done: boolean;
    required: boolean;
    action: { label: string; href: string } | null;
}

interface TenantInfo {
    name: string;
    slug: string;
    status: string;
    on_trial: boolean;
    trial_ends_at: string | null;
    onboarding_completed: boolean;
    currency: string | null;
    timezone: string | null;
    plan: string | null;
    subscription_status: string | null;
}

interface Progress {
    percent: number;
    completed: number;
    total: number;
    steps: { value: string; label: string; complete: boolean; required: boolean }[];
}

const STATUS_TONE: Record<string, BadgeTone> = { active: 'success', suspended: 'danger', pending: 'warning', archived: 'neutral' };

export default function Dashboard({
    tenant,
    checklist,
    warnings,
    progress,
    stats,
}: {
    tenant: TenantInfo | null;
    checklist: ChecklistItem[];
    warnings: { key: string; label: string }[];
    progress: Progress | null;
    stats: { branches?: number; users?: number };
}) {
    const { flash } = usePage().props as Record<string, any>;
    const t = useT();

    if (tenant === null) {
        return (
            <AuthenticatedLayout header={<PageHeader title={t('nav.overview')} />}>
                <Head title="Dashboard" />
                <div className="py-12">
                    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                        <Card>
                            <CardBody>
                                <p className="text-sm text-gray-600">This account is not linked to a restaurant.</p>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    const remaining = checklist.filter((item) => !item.done);

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title={tenant.name}
                    description={`${tenant.timezone ?? '—'} · ${tenant.currency ?? '—'}`}
                    actions={
                        <>
                            {tenant.on_trial && <Badge tone="warning">Trial</Badge>}
                            <Badge tone={STATUS_TONE[tenant.status] ?? 'neutral'}>{tenant.status}</Badge>
                            {!tenant.onboarding_completed && (
                                <Button size="sm" href={route('onboarding.index')}>
                                    {t('dash.continue_setup')}
                                </Button>
                            )}
                        </>
                    }
                />
            }
        >
            <Head title="Dashboard" />

            <div className="py-6">
                <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                        <KpiCard label={t('dash.branches')} value={stats.branches ?? 0} />
                        <KpiCard label={t('dash.users')} value={stats.users ?? 0} />
                        <KpiCard label={t('dash.plan')} value={tenant.plan ?? '—'} hint={tenant.subscription_status ?? undefined} />
                        <KpiCard
                            label={t('dash.status')}
                            value={tenant.status}
                            tone={tenant.status === 'active' ? 'success' : tenant.status === 'suspended' ? 'danger' : 'warning'}
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <Card className="lg:col-span-2">
                            <CardHeader
                                title={t('dash.checklist')}
                                description={progress ? `${progress.completed}/${progress.total} ${t('dash.complete')}` : undefined}
                            />
                            <CardBody>
                                {progress && (
                                    <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                                        <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${progress.percent}%` }} />
                                    </div>
                                )}

                                <ul className="divide-y divide-gray-100">
                                    {checklist.map((item) => (
                                        <li key={item.key} className="flex items-center justify-between gap-3 py-3">
                                            <div className="flex min-w-0 items-center gap-3">
                                                <span
                                                    className={
                                                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                                                        (item.done ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400')
                                                    }
                                                >
                                                    {item.done ? '✓' : '•'}
                                                </span>
                                                <span className={'truncate text-sm ' + (item.done ? 'text-gray-400 line-through' : 'text-gray-700')}>{item.label}</span>
                                                {item.required && !item.done && <Badge tone="danger">{t('dash.required')}</Badge>}
                                            </div>
                                            {!item.done && item.action && (
                                                <Link
                                                    href={item.action.href}
                                                    className="shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-indigo-600 transition hover:border-indigo-300 hover:bg-indigo-50"
                                                >
                                                    {item.action.label} →
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </CardBody>
                        </Card>

                        <div className="space-y-6">
                            <Card>
                                <CardHeader title={t('dash.next_steps')} />
                                <CardBody className="space-y-2">
                                    <p className="text-sm text-gray-500">{t('dash.next_steps_body')}</p>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <Link href={route('menu.index')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50">
                                            {t('dash.go_menu')} →
                                        </Link>
                                        <Link href={route('pos.index')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50">
                                            {t('dash.open_pos')} →
                                        </Link>
                                        <Link href={route('staff.index')} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50">
                                            {t('dash.invite_staff')} →
                                        </Link>
                                    </div>
                                </CardBody>
                            </Card>

                            {remaining.length > 0 && !tenant.onboarding_completed && (
                                <Card>
                                    <CardHeader title={t('dash.finish_banner')} />
                                    <CardBody className="space-y-2">
                                        <StatusDot tone="warn" label={remaining.filter((i) => i.required).length + ' required'} />
                                        <p className="text-xs text-gray-500">{warnings.map((w) => w.label).join(', ') || '—'}</p>
                                    </CardBody>
                                </Card>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
