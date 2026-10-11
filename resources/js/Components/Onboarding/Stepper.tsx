import { useT } from '@/i18n';
import { OnboardingStepInfo } from '@/types/onboarding';
import { Link } from '@inertiajs/react';

export default function Stepper({ steps, current, percent }: { steps: OnboardingStepInfo[]; current: string; percent: number }) {
    const t = useT();

    return (
        <div>
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                <span>{t('dash.setup_progress')}</span>
                <span className="tabular-nums">{percent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-indigo-600 transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>

            <ol className="mt-4 flex flex-wrap gap-2">
                {steps.map((step, index) => {
                    const isCurrent = step.value === current;

                    return (
                        <li key={step.value}>
                            <Link
                                href={route('onboarding.show', step.value)}
                                className={
                                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition ' +
                                    (isCurrent
                                        ? 'border-indigo-300 bg-indigo-50 text-indigo-700'
                                        : step.complete
                                          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                          : 'border-gray-200 text-gray-500 hover:bg-gray-50')
                                }
                            >
                                <span
                                    className={
                                        'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ' +
                                        (step.complete ? 'bg-emerald-600 text-white' : isCurrent ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-600')
                                    }
                                >
                                    {step.complete ? '✓' : index + 1}
                                </span>
                                {step.label}
                                {step.optional && (
                                    <span className="rounded bg-white/70 px-1 text-[10px] uppercase tracking-wide text-gray-400">optional</span>
                                )}
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
