import ApplicationLogo from '@/Components/ApplicationLogo';
import Stepper from '@/Components/Onboarding/Stepper';
import { Badge, Button, Progress } from '@/Components/ui';
import { useT } from '@/i18n';
import { OnboardingProgress } from '@/types/onboarding';
import { Head, usePage } from '@inertiajs/react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { PropsWithChildren, ReactNode } from 'react';

export default function OnboardingLayout({
    step,
    progress,
    title,
    description,
    children,
    actions,
}: PropsWithChildren<{
    step: string;
    progress: OnboardingProgress;
    title: string;
    description?: string;
    actions?: ReactNode;
}>) {
    const { auth, tenant, flash } = usePage().props as Record<string, any>;
    const t = useT();
    const current = progress.steps.find((s) => s.value === step);
    const index = Math.max(1, progress.steps.findIndex((s) => s.value === step) + 1);

    return (
        <div className="app-type min-h-screen bg-muted/40">
            <Head title={`${title} — ${t('onboarding.title')}`} />

            <header className="sticky top-0 z-20 border-b border-border bg-card/90 backdrop-blur-md animate-fade-down">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <ApplicationLogo className="h-8 w-8" />
                        <div className="min-w-0">
                            <div className="truncate font-display text-sm font-semibold tracking-tight text-foreground">
                                {tenant?.name ?? 'Restrly'}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{t('onboarding.title')}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <Badge tone="neutral" dot={false} className="hidden sm:inline-flex">
                            {t('onboarding.step_of', { current: index, total: progress.steps.length })}
                        </Badge>
                        <span className="hidden text-sm text-muted-foreground md:inline">{auth?.user?.name}</span>
                        <Button variant="ghost" size="sm" href={route('logout')} method="post">
                            {t('shell.signout')}
                        </Button>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
                    {/* Setup rail (desktop) */}
                    <aside className="hidden lg:block">
                        <div className="sticky top-20 space-y-4">
                            <div className="rounded-xl border border-border bg-card p-4 shadow-xs animate-fade-up">
                                <div className="mb-2 flex items-center justify-between text-xs font-medium">
                                    <span className="text-muted-foreground">{t('dash.setup_progress')}</span>
                                    <span className="font-semibold tabular-nums text-foreground">{progress.percent}%</span>
                                </div>
                                <Progress value={progress.percent} />
                                <div className="mt-1.5 text-[11px] text-muted-foreground">
                                    {progress.completed} of {progress.total} {t('dash.complete')}
                                </div>
                            </div>

                            <nav
                                className="rounded-xl border border-border bg-card p-2 shadow-xs animate-fade-up"
                                style={{ animationDelay: '60ms' }}
                                aria-label="Setup steps"
                            >
                                <Stepper steps={progress.steps} current={step} />
                            </nav>

                            <div
                                className="rounded-xl border border-border bg-card p-4 shadow-xs animate-fade-up"
                                style={{ animationDelay: '120ms' }}
                            >
                                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                    Saved automatically
                                </div>
                                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                                    Your progress is stored as you go — leave and pick up right where you left off.
                                </p>
                            </div>
                        </div>
                    </aside>

                    <div className="min-w-0 space-y-4">
                        {/* Compact progress (mobile) */}
                        <div className="rounded-xl border border-border bg-card p-4 shadow-xs lg:hidden animate-fade-up">
                            <div className="mb-2 flex items-center justify-between text-xs font-medium">
                                <span className="text-muted-foreground">
                                    {t('onboarding.step_of', { current: index, total: progress.steps.length })}
                                </span>
                                <span className="font-semibold tabular-nums text-foreground">{progress.percent}%</span>
                            </div>
                            <Progress value={progress.percent} />
                        </div>

                        {flash?.success && (
                            <div className="flex animate-fade-in items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                <span>{flash.success}</span>
                            </div>
                        )}
                        {flash?.error && (
                            <div className="animate-fade-in rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{flash.error}</div>
                        )}
                        {progress.completed > 0 && !flash?.success && (
                            <div className="animate-fade-in rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-foreground">
                                Welcome back — resuming where you left off.
                            </div>
                        )}

                        <section
                            className="overflow-hidden rounded-xl border border-border bg-card shadow-xs animate-fade-up"
                            style={{ animationDelay: '40ms' }}
                        >
                            <header className="border-b border-border/70 bg-gradient-to-b from-muted/40 to-transparent p-5 sm:p-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-primary">Step {index}</span>
                                    {current?.optional && (
                                        <Badge tone="neutral" dot={false}>
                                            Optional
                                        </Badge>
                                    )}
                                </div>
                                <h1 className="mt-2 font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h1>
                                {description && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}
                            </header>

                            <div className="p-5 sm:p-6">{children}</div>

                            {actions && <div className="border-t border-border/70 p-5 sm:p-6">{actions}</div>}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
