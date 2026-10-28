import ConfirmDialog from '@/Components/ui/ConfirmDialog';
import { Badge, Button, Input, Progress, formatDate, formatMoney, formatNumber } from '@/Components/ui';
import type { BadgeTone } from '@/Components/ui';
import { useT } from '@/i18n';
import type { DemoState } from '@/types/demo';
import { router, usePage } from '@inertiajs/react';
import { FlaskConical, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';

/**
 * Says plainly that the workspace holds sample data, what it covers, and how to
 * remove it. Deliberately restrained: one row, in the page flow — never a modal
 * and never a colour-only signal.
 */
export default function DemoBanner() {
    const t = useT();
    const page = usePage().props as Record<string, any>;
    const demo = page.demo as DemoState | undefined;
    const tenant = page.tenant as { slug: string; name: string } | null;
    const errors = (page.errors ?? {}) as Record<string, string>;

    const [confirming, setConfirming] = useState(false);
    const [typed, setTyped] = useState('');
    const [processing, setProcessing] = useState(false);

    if (!demo || demo.status === 'none' || demo.status === 'removed' || !demo.status) {
        return null;
    }

    const counts = (demo.counts ?? {}) as Record<string, any>;
    const currency = String(counts.currency ?? page.currency ?? 'USD');
    const active = demo.status === 'pending' || demo.status === 'running';
    const failed = demo.status === 'failed';
    const percent = demo.percent ?? 0;

    const tone: BadgeTone = active ? 'info' : failed ? 'danger' : 'success';
    const statusLabel = active ? t('demo.status_building') : failed ? t('demo.status_failed') : t('demo.status_ready');

    const start = () => {
        setProcessing(true);
        router.post(route('demo.generate'), {}, { preserveScroll: true, onFinish: () => setProcessing(false) });
    };

    const purge = () => {
        setProcessing(true);
        router.post(
            route('demo.purge'),
            { confirm: typed },
            {
                preserveScroll: true,
                onFinish: () => setProcessing(false),
                onSuccess: () => {
                    setConfirming(false);
                    setTyped('');
                },
            },
        );
    };

    return (
        <>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-2.5">
                    <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-foreground">{t('demo.banner_title')}</span>
                            <Badge tone={tone} dot={false}>
                                {statusLabel}
                            </Badge>
                        </div>

                        {active && (
                            <div className="mt-2 max-w-md">
                                <Progress value={percent} className="h-1.5" />
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {t('demo.banner_generating', { percent })}
                                    {demo.next_label ? ` · ${t('demo.building', { step: demo.next_label })}` : ''}
                                </p>
                            </div>
                        )}

                        {failed && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {t('demo.banner_failed', { error: demo.error ?? '' })}
                            </p>
                        )}

                        {demo.status === 'completed' && (
                            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                                {t('demo.banner_ready', {
                                    days: demo.days,
                                    from: formatDate(counts.first_day as string),
                                    to: formatDate(counts.last_day as string),
                                })}
                                {' · '}
                                {t('demo.banner_counts', {
                                    orders: formatNumber(Number(counts.orders ?? 0)),
                                    revenue: formatMoney(Number(counts.revenue ?? 0), currency),
                                    customers: formatNumber(Number(counts.customers ?? 0)),
                                })}
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                    {active && (
                        <Button variant="outline" size="sm" href={route('demo.setup')}>
                            {t('demo.banner_resume')}
                        </Button>
                    )}
                    {failed && (
                        <Button variant="primary" size="sm" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={processing} onClick={start}>
                            {t('demo.retry')}
                        </Button>
                    )}
                    {demo.status === 'completed' && (
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Trash2 className="h-3.5 w-3.5" />}
                            onClick={() => setConfirming(true)}
                        >
                            {t('demo.banner_remove')}
                        </Button>
                    )}
                </div>
            </div>

            <ConfirmDialog
                show={confirming}
                title={t('demo.remove_title')}
                description={t('demo.remove_body')}
                confirmLabel={t('demo.remove_confirm')}
                cancelLabel={t('demo.cancel')}
                tone="danger"
                processing={processing}
                requireText={tenant?.slug ?? ''}
                onConfirm={purge}
                onClose={() => {
                    setConfirming(false);
                    setTyped('');
                }}
            >
                <div className="space-y-1.5 pt-2">
                    <label htmlFor="demo-confirm" className="text-xs font-medium text-muted-foreground">
                        {t('demo.remove_typed', { slug: tenant?.slug ?? '' })}
                    </label>
                    <Input id="demo-confirm" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder={tenant?.slug ?? ''} />
                    {errors.confirm && <p className="text-xs font-medium text-destructive">{errors.confirm}</p>}
                </div>
            </ConfirmDialog>
        </>
    );
}
