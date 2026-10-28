import { SETTINGS_TABS, settingsTabHref } from '@/Components/Settings/tabs';
import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    EmptyState,
    Input,
    PageHeader,
    Progress,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    Tabs,
    formatDateTime,
    formatMoney,
    formatNumber,
} from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import type { DemoState } from '@/types/demo';
import { router, usePage } from '@inertiajs/react';
import { Database, FlaskConical, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface DemoRun {
    id: number;
    status: string;
    days: number;
    steps_done: number;
    steps_total: number;
    counts: Record<string, number | string | null>;
    error: string | null;
    started_at: string | null;
    completed_at: string | null;
    removed_at: string | null;
}

/**
 * Demo data tab: what the sample workspace contains, where it came from, and the
 * two actions that matter — rebuild it, or remove every trace of it.
 */
export default function SettingsDemo({ demo, history, currency }: { demo: DemoState; history: DemoRun[]; currency: string }) {
    const t = useT();
    const page = usePage().props as Record<string, any>;
    const tenant = page.tenant as { slug: string; name: string } | null;
    const flash = page.flash as { success?: string; error?: string } | undefined;
    const errors = (page.errors ?? {}) as Record<string, string>;

    const [confirmRebuild, setConfirmRebuild] = useState(false);
    const [confirmRemove, setConfirmRemove] = useState(false);
    const [typed, setTyped] = useState('');
    const [processing, setProcessing] = useState(false);

    const counts = (demo.counts ?? {}) as Record<string, any>;
    const active = demo.status === 'pending' || demo.status === 'running';
    const ready = demo.status === 'completed';
    const failed = demo.status === 'failed';
    const hasRun = demo.status !== 'none';

    const tone: BadgeTone = active ? 'info' : ready ? 'success' : failed ? 'danger' : 'neutral';
    const statusLabel = active
        ? t('demo.status_building')
        : ready
          ? t('demo.status_ready')
          : failed
            ? t('demo.status_failed')
            : demo.status === 'removed'
              ? t('settings.demo_status_removed')
              : t('settings.demo_status_none');

    const post = (
        url: string,
        data: Record<string, string | number | boolean | null> = {},
        onSuccess?: () => void,
    ) => {
        setProcessing(true);
        router.post(url, data, {
            preserveScroll: true,
            onFinish: () => setProcessing(false),
            onSuccess: () => onSuccess?.(),
        });
    };

    const stats = [
        { label: t('demo.counters_orders'), value: formatNumber(Number(counts.orders ?? 0)) },
        { label: t('demo.counters_revenue'), value: formatMoney(Number(counts.revenue ?? 0), String(counts.currency ?? currency)) },
        { label: t('demo.counters_customers'), value: formatNumber(Number(counts.customers ?? 0)) },
        { label: t('demo.counters_products'), value: formatNumber(Number(counts.products ?? 0)) },
    ];

    return (
        <AuthenticatedLayout header={<PageHeader title={t('settings.demo_title')} description={t('settings.demo_intro')} />}>
            <div className="py-6">
                <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                    {flash?.error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                    <Tabs
                        tabs={SETTINGS_TABS.map((key) => ({ key, label: t(`settings.tab.${key}`) }))}
                        value="demo"
                        onChange={(key) => router.get(settingsTabHref(key), {}, { preserveScroll: true })}
                    />

                    <Card>
                        <CardHeader
                            title={
                                <span className="flex items-center gap-2">
                                    {t('demo.banner_title')}
                                    <Badge tone={tone} dot={false}>
                                        {statusLabel}
                                    </Badge>
                                </span>
                            }
                            description={
                                hasRun
                                    ? t('settings.demo_generated', {
                                          date: formatDateTime(demo.completed_at ?? demo.started_at ?? null),
                                      })
                                    : t('settings.demo_empty_body')
                            }
                            action={
                                hasRun ? (
                                    <span className="text-xs text-muted-foreground">
                                        {t('settings.demo_records', { count: formatNumber(demo.records ?? 0) })}
                                    </span>
                                ) : null
                            }
                        />

                        <CardBody className="space-y-5">
                            {active && (
                                <div>
                                    <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
                                        <span className="truncate text-muted-foreground">
                                            {demo.next_label ? t('demo.building', { step: demo.next_label }) : t('demo.bar_label')}
                                        </span>
                                        <span className="shrink-0 font-semibold tabular-nums text-foreground">{demo.percent ?? 0}%</span>
                                    </div>
                                    <Progress value={demo.percent ?? 0} className="h-1.5" />
                                </div>
                            )}

                            {ready && (
                                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                    {stats.map((stat) => (
                                        <div key={stat.label} className="rounded-lg border border-border bg-background px-3 py-2.5">
                                            <dt className="text-[13px] font-medium text-muted-foreground">{stat.label}</dt>
                                            <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{stat.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}

                            {failed && (
                                <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                    <p className="font-medium">{t('demo.failed_title')}</p>
                                    <p className="mt-0.5 break-words text-xs leading-relaxed">{demo.error ?? t('demo.failed_body')}</p>
                                </div>
                            )}

                            {hasRun && (
                                <div className="flex items-start gap-2.5 rounded-lg border border-border bg-muted/30 px-4 py-3">
                                    <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold text-foreground">{t('settings.demo_sample_title')}</p>
                                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t('settings.demo_sample_notice')}</p>
                                        {ready && (
                                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                                                {t('settings.demo_coverage', {
                                                    days: demo.days,
                                                    from: String(counts.first_day ?? '—'),
                                                    to: String(counts.last_day ?? '—'),
                                                })}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {! hasRun && (
                                <EmptyState
                                    icon={<Database className="h-6 w-6 stroke-[1.5]" />}
                                    title={t('settings.demo_empty_title')}
                                    description={t('settings.demo_empty_body')}
                                    action={
                                        <Button
                                            variant="primary"
                                            icon={<FlaskConical className="h-3.5 w-3.5" />}
                                            loading={processing}
                                            onClick={() => post(route('demo.generate'))}
                                        >
                                            {t('settings.demo_generate')}
                                        </Button>
                                    }
                                />
                            )}
                        </CardBody>

                        {hasRun && (
                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-5 py-4">
                                <p className="text-xs text-muted-foreground">{t('settings.demo_actions_hint')}</p>
                                <div className="flex flex-wrap items-center gap-2">
                                    {active && (
                                        <Button variant="outline" size="sm" href={route('demo.setup')}>
                                            {t('demo.banner_resume')}
                                        </Button>
                                    )}
                                    {failed && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                                            loading={processing}
                                            onClick={() => post(route('demo.generate'))}
                                        >
                                            {t('demo.retry')}
                                        </Button>
                                    )}
                                    {ready && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<RefreshCw className="h-3.5 w-3.5" />}
                                            onClick={() => setConfirmRebuild(true)}
                                        >
                                            {t('settings.demo_rebuild')}
                                        </Button>
                                    )}
                                    {(ready || failed) && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            icon={<Trash2 className="h-3.5 w-3.5" />}
                                            onClick={() => setConfirmRemove(true)}
                                        >
                                            {t('demo.banner_remove')}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        )}
                    </Card>

                    {history.length > 0 && (
                        <Card>
                            <CardHeader title={t('settings.demo_history_title')} description={t('settings.demo_history_hint')} />
                            <CardBody className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>{t('settings.demo_col_status')}</TableHead>
                                            <TableHead>{t('settings.demo_col_days')}</TableHead>
                                            <TableHead>{t('settings.demo_col_started')}</TableHead>
                                            <TableHead>{t('settings.demo_col_finished')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {history.map((run) => {
                                            const runActive = run.status === 'pending' || run.status === 'running';
                                            const runTone: BadgeTone = runActive
                                                ? 'info'
                                                : run.status === 'completed'
                                                  ? 'success'
                                                  : run.status === 'failed'
                                                    ? 'danger'
                                                    : 'neutral';

                                            return (
                                                <TableRow key={run.id}>
                                                    <TableCell>
                                                        <Badge tone={runTone} dot={false}>
                                                            {runActive
                                                                ? t('demo.status_building')
                                                                : run.status === 'completed'
                                                                  ? t('demo.status_ready')
                                                                  : run.status === 'failed'
                                                                    ? t('demo.status_failed')
                                                                    : t('settings.demo_status_removed')}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{run.days}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">{formatDateTime(run.started_at)}</TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {formatDateTime(run.removed_at ?? run.completed_at)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardBody>
                        </Card>
                    )}
                </div>
            </div>

            <ConfirmDialog
                show={confirmRebuild}
                title={t('settings.demo_rebuild_title')}
                description={t('settings.demo_rebuild_body')}
                confirmLabel={t('settings.demo_rebuild')}
                cancelLabel={t('demo.cancel')}
                tone="primary"
                processing={processing}
                onConfirm={() => post(route('settings.demo.rebuild'), {}, () => setConfirmRebuild(false))}
                onClose={() => setConfirmRebuild(false)}
            />

            <ConfirmDialog
                show={confirmRemove}
                title={t('demo.remove_title')}
                description={t('demo.remove_body')}
                confirmLabel={t('demo.remove_confirm')}
                cancelLabel={t('demo.cancel')}
                tone="danger"
                processing={processing}
                requireText={tenant?.slug ?? ''}
                onConfirm={() =>
                    post(route('demo.purge'), { confirm: typed }, () => {
                        setConfirmRemove(false);
                        setTyped('');
                    })
                }
                onClose={() => {
                    setConfirmRemove(false);
                    setTyped('');
                }}
            >
                <div className="space-y-1.5 pt-2">
                    <label htmlFor="demo-settings-confirm" className="text-xs font-medium text-muted-foreground">
                        {t('demo.remove_typed', { slug: tenant?.slug ?? '' })}
                    </label>
                    <Input
                        id="demo-settings-confirm"
                        value={typed}
                        onChange={(event) => setTyped(event.target.value)}
                        placeholder={tenant?.slug ?? ''}
                    />
                    {errors.confirm && <p className="text-xs font-medium text-destructive">{errors.confirm}</p>}
                </div>
            </ConfirmDialog>
        </AuthenticatedLayout>
    );
}
