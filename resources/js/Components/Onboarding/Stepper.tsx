import { OnboardingStepInfo } from '@/types/onboarding';
import { Link } from '@inertiajs/react';

function CheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
        >
            <path
                fillRule="evenodd"
                d="M16.704 5.29a1 1 0 010 1.415l-7.5 7.5a1 1 0 01-1.415 0l-3.5-3.5a1 1 0 111.415-1.415l2.793 2.793 6.793-6.793a1 1 0 011.414 0z"
                clipRule="evenodd"
            />
        </svg>
    );
}

export default function Stepper({
    steps,
    current,
    percent,
}: {
    steps: OnboardingStepInfo[];
    current: string;
    percent: number;
}) {
    return (
        <div>
            <div className="mb-6">
                <div className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500">
                    <span>Setup progress</span>
                    <span>{percent}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                        className="h-full rounded-full bg-indigo-600 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                    />
                </div>
            </div>

            <ol className="space-y-1">
                {steps.map((step, index) => {
                    const isCurrent = step.value === current;
                    const isComplete = step.complete;

                    return (
                        <li key={step.value}>
                            <Link
                                href={route('onboarding.show', step.value)}
                                className={
                                    'flex items-start gap-3 rounded-md px-3 py-2 text-sm transition ' +
                                    (isCurrent
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-gray-700 hover:bg-gray-50')
                                }
                            >
                                <span
                                    className={
                                        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ' +
                                        (isComplete
                                            ? 'bg-green-600 text-white'
                                            : isCurrent
                                              ? 'bg-indigo-600 text-white'
                                              : 'bg-gray-200 text-gray-600')
                                    }
                                >
                                    {isComplete ? (
                                        <CheckIcon />
                                    ) : (
                                        index + 1
                                    )}
                                </span>
                                <span className="min-w-0">
                                    <span className="flex items-center gap-2 font-medium">
                                        {step.label}
                                        {step.optional && (
                                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-gray-500">
                                                Optional
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-0.5 block text-xs text-gray-500">
                                        {step.description}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
