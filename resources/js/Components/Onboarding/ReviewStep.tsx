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
            <p className="text-sm text-gray-500">{t('onboarding.review_hint')}</p>

            <Card>
                <CardHeader title={t('onboarding.review_title')} />
                <CardBody className="p-0">
                    <ul className="divide-y divide-gray-100">
                        {setupSteps.map((step) => (
                            <li key={step.value} className="flex items-center justify-between gap-3 px-5 py-3">
                                <div className="flex items-center gap-3">
                                    <span
                                        className={
                                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                                            (step.complete ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-400')
                                        }
                                    >
                                        {step.complete ? '✓' : '•'}
                                    </span>
                                    <div>
                                        <div className="text-sm font-medium text-gray-800">{step.label}</div>
                                        <div className="text-xs text-gray-500">
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
                                    <Link href={route('onboarding.show', step.value)} className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                                        {step.complete ? t('onboarding.edit') : t('dash.set_up')}
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </CardBody>
            </Card>

            {blocked && <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">{t('onboarding.blocked')}</div>}

            <form onSubmit={submit} className="flex justify-end border-t border-gray-100 pt-4">
                <Button type="submit" loading={processing} disabled={blocked}>
                    {t('onboarding.finish')}
                </Button>
            </form>
        </div>
    );
}
