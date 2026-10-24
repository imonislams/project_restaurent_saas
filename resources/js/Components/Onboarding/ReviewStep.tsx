import { Badge, Button, Card, CardBody, CardHeader } from '@/Components/ui';
import { useT } from '@/i18n';
import { OnboardingProgress } from '@/types/onboarding';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ReviewStep({ progress }: { progress: OnboardingProgress }) {
    const t = useT();
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.complete'));
    };

    const blocked = progress.steps.some((step) => step.required && !step.complete);
    const setupSteps = progress.steps.filter((step) => step.value !== 'review');

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-[#F3F2F2] p-4">
                <div className="grid h-12 w-12 shrink-0 grid-cols-2 gap-1" aria-hidden>
                    <span className="bg-[#201E1D]" />
                    <span className="bg-[#EC3013]" />
                    <span className="bg-[#201E1D]" />
                    <span className="bg-[#201E1D]" />
                </div>
                <div>
                    <div className="text-sm font-semibold text-foreground">
                        {setupSteps.filter((step) => step.complete).length} of {setupSteps.length} setup steps done
                    </div>
                    <p className="text-sm text-muted-foreground">{t('onboarding.review_hint')}</p>
                </div>
            </div>

            <Card>
                <CardHeader title={t('onboarding.review_title')} />
                <CardBody className="p-0">
                    <ul className="divide-y divide-border/60">
                        {setupSteps.map((step) => (
                            <li key={step.value} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={
                                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                                            (step.complete ? 'bg-emerald-600 text-white' : 'bg-muted text-muted-foreground')
                                        }
                                    >
                                        {step.complete ? '✓' : '•'}
                                    </span>
                                    <div>
                                        <div className="text-sm font-medium text-foreground">{step.label}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {step.complete
                                                ? t('onboarding.configured')
                                                : step.required
                                                  ? t('onboarding.required_not_configured')
                                                  : t('onboarding.optional_not_configured')}
                                        </div>
                                    </div>
                                </div>
                                {step.required && !step.complete ? (
                                    <Badge tone="danger">{t('dash.required')}</Badge>
                                ) : (
                                    <Link href={route('onboarding.show', step.value)} className="text-sm font-medium text-primary hover:text-primary/80">
                                        {step.complete ? t('onboarding.edit') : t('dash.set_up')}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            {blocked && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('onboarding.blocked')}</div>}

            <form onSubmit={submit} className="flex justify-end border-t border-border/70 pt-4">
                <Button type="submit" loading={processing} disabled={blocked}>
                    {t('onboarding.finish')}
                </Button>
            </form>
        </div>
    );
}
