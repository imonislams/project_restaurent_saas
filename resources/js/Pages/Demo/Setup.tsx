import ApplicationLogo from '@/Components/ApplicationLogo';
import { Badge, Button, Progress, formatMoney, formatNumber } from '@/Components/ui';
import { useT } from '@/i18n';
import type { DemoState } from '@/types/demo';
import { Head, router, usePage } from '@inertiajs/react';
import { AlertTriangle, ArrowRight, CheckCircle2, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StepResponse {
    demo: DemoState;
    error: string | null;
}

/**
 * Builds the demo workspace while the owner watches.
 *
 * One step per request, **sequentially** — the previous request must finish
 * before the next starts, otherwise the browser cancels it and the progress
 * never reaches the screen. State comes back from each response, so the counters
 * always reflect what the server actually did.
 */
export default function DemoSetup({ demo: initialDemo }: { demo: DemoState }) {
    const t = useT();
    const page = usePage().props as Record<string, any>;
    const tenant = page.tenant as { name: string } | null;
    const flash = page.flash as { success?: string; error?: string } | undefined;

    const [demo, setDemo] = useState<DemoState>(initialDemo);
    const [problem, setProblem] = useState<string | null>(null);
    const [retrying, setRetrying] = useState(false);

    const active = demo.status === 'pending' || demo.status === 'running';
    const completed = demo.status === 'completed';
    const failed = demo.status === 'failed';
    const broken = problem !== null || failed;

    // A full page visit (Retry, or landing here again) replaces the seed state.
    useEffect(() => {
        setDemo(initialDemo);
    }, [initialDemo]);

    useEffect(() => {
        if (!active) {
            return;
        }

        let cancelled = false;

        const run = async () => {
            while (!cancelled) {
                try {
                    const { data } = await window.axios.post<StepResponse>(route('demo.step'), {});

                    if (cancelled) {
                        return;
                    }

                    if (data?.demo) {
                        setDemo(data.demo);
                    }

                    if (data?.error) {
                        setProblem(data.error);

                        return;
                    }

                    if (!data?.demo) {
                        setProblem('The server returned an unexpected response (no demo state).');

                        return;
                    }

                    if (data.demo.status !== 'pending' && data.demo.status !== 'running') {
                        return;
                    }
                } catch (error) {
                    if (cancelled) {
                        return;
                    }

                    // Never swallow it: the operator gets the status and message.
                    const response = (error as { response?: { status?: number; data?: any } }).response;
                    const payload = response?.data;
                    const message =
                        typeof payload === 'string'
                            ? payload.slice(0, 300)
                            : (payload?.error ?? payload?.message ?? (error as Error)?.message);

                    setProblem(`${response?.status ? `HTTP ${response.status}` : 'Network error'}${message ? ` — ${message}` : ''}`);

                    return;
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [active, demo.batch_id]);

    useEffect(() => {
        if (!completed) {
            return;
        }

        const timer = window.setTimeout(() => router.visit(route('dashboard')), 1200);

        return () => window.clearTimeout(timer);
    }, [completed]);

    const retry = () => {
        setProblem(null);
        setRetrying(true);
        router.post(route('demo.generate'), {}, { onFinish: () => setRetrying(false) });
    };

    const counts = (demo.counts ?? {}) as Record<string, any>;
    const currency = String(counts.currency ?? demo.currency ?? 'USD');
    const percent = demo.percent ?? 0;
    const message = problem ?? demo.error ?? flash?.error ?? t('demo.failed_body');

    const stats = [
        { label: t('demo.counters_orders'), value: formatNumber(Number(counts.orders ?? 0)) },
        { label: t('demo.counters_revenue'), value: formatMoney(Number(counts.revenue ?? 0), currency) },
        { label: t('demo.counters_customers'), value: formatNumber(Number(counts.customers ?? 0)) },
        { label: t('demo.counters_products'), value: formatNumber(Number(counts.products ?? 0)) },
    ];

    return (
        <div className="app-type min-h-screen bg-[#F3F2F2]">
            <Head title={`${t('demo.title')} — ${tenant?.name ?? 'Touch Dine'}`} />

            <header className="border-b border-border bg-card/90">
                <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3 sm:px-6">
                    <ApplicationLogo className="h-8 w-8" />
                    <div className="min-w-0">
                        <div className="truncate font-display text-sm font-bold tracking-tight text-foreground">Touch Dine</div>
                        <div className="truncate text-xs text-muted-foreground">{tenant?.name}</div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
                <section className="animate-fade-up overflow-hidden rounded-xl border border-border bg-card shadow-xs">
                    <div className="border-b border-border/70 p-5 sm:p-6">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge tone={broken ? 'danger' : completed ? 'success' : 'info'} dot={false}>
                                {broken ? t('demo.status_failed') : completed ? t('demo.status_ready') : t('demo.status_building')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                                {t('demo.progress', { done: demo.steps_done ?? 0, total: demo.steps_total ?? 0 })}
                            </span>
                        </div>

                        <h1 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                            {broken ? t('demo.failed_title') : completed ? t('demo.done_title') : t('demo.title')}
                        </h1>

                        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                            {broken ? t('demo.failed_body') : completed ? t('demo.done_body') : t('demo.subtitle', { days: demo.days })}
                        </p>
                    </div>

                    <div className="space-y-5 p-5 sm:p-6">
                        {!broken && (
                            <div>
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs font-medium">
                                    <span className="truncate text-muted-foreground">
                                        {demo.next_label && !completed ? t('demo.building', { step: demo.next_label }) : t('demo.bar_label')}
                                    </span>
                                    <span className="shrink-0 font-semibold tabular-nums text-foreground">{percent}%</span>
                                </div>
                                <Progress value={percent} className="h-2" />
                            </div>
                        )}

                        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                            {stats.map((stat) => (
                                <div key={stat.label} className="rounded-lg border border-border bg-background px-3 py-2.5">
                                    <dt className="text-[13px] font-medium text-muted-foreground">{stat.label}</dt>
                                    <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums text-foreground">{stat.value}</dd>
                                </div>
                            ))}
                        </dl>

                        {broken && (
                            <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                <div className="min-w-0">
                                    <p className="font-medium">{t('demo.failed_title')}</p>
                                    <p className="mt-0.5 break-words text-xs leading-relaxed">{message}</p>
                                    <p className="mt-1 text-xs leading-relaxed text-rose-700/80">{t('demo.error_hint')}</p>
                                </div>
                            </div>
                        )}

                        {completed && (
                            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                                <span>{t('demo.done_body')}</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-5 py-4 sm:px-6">
                        <p className="text-xs text-muted-foreground">{t('demo.background_hint')}</p>
                        <div className="flex items-center gap-2">
                            {broken && (
                                <Button variant="primary" icon={<RefreshCw className="h-3.5 w-3.5" />} loading={retrying} onClick={retry}>
                                    {t('demo.retry')}
                                </Button>
                            )}
                            <Button variant="outline" href={route('dashboard')} icon={<ArrowRight className="h-3.5 w-3.5" />}>
                                {t('demo.background')}
                            </Button>
                        </div>
                    </div>
                </section>

                <p className="mt-4 text-center text-xs text-muted-foreground">{t('demo.banner_ready_hint')}</p>
            </main>
        </div>
    );
}
