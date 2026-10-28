import { Badge, Button, Card, CardBody, CardHeader, CheckboxField } from '@/Components/ui';
import { useT } from '@/i18n';
import { OnboardingProgress } from '@/types/onboarding';
import { Link, useForm } from '@inertiajs/react';
import { Check } from 'lucide-react';
import { FormEventHandler } from 'react';

export default function ReviewStep({
    progress,
    demo,
}: {
    progress: OnboardingProgress;
    demo: { days: number; min_days: number };
}) {
    const t = useT();
    // Sample data is offered by default — the owner can still switch it off here.
    const { data, setData, post, processing } = useForm({ demo_enabled: true });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.complete'));
    };

    const blocked = progress.steps.some((step) => step.required && !step.complete);
    const setupSteps = progress.steps.filter((step) => step.value !== 'review');

    const included = [
        t('onboarding.demo_include_menu'),
        t('onboarding.demo_include_team'),
        t('onboarding.demo_include_sales', { days: demo.days }),
        t('onboarding.demo_include_stock'),
        t('onboarding.demo_include_guests'),
    ];

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

            <Card>
                <CardHeader title={t('onboarding.demo_title')} description={t('onboarding.demo_hint')} />
                <CardBody className="space-y-3">
                    <CheckboxField
                        label={t('onboarding.demo_populate')}
                        hint={t('onboarding.demo_populate_hint', { days: demo.days })}
                        checked={Boolean(data.demo_enabled)}
                        onChange={(checked) => setData('demo_enabled', checked)}
                    />

                    {data.demo_enabled && (
                        <ul className="grid grid-cols-1 gap-1.5 border-t border-border/60 pt-3 sm:grid-cols-2">
                            {included.map((item) => (
                                <li key={item} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    )}
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
