import PrimaryButton from '@/Components/PrimaryButton';
import { OnboardingProgress } from '@/types/onboarding';
import { Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ReviewStep({
    progress,
}: {
    progress: OnboardingProgress;
}) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('onboarding.complete'));
    };

    const blocked = progress.steps.some(
        (step) => step.required && !step.complete,
    );

    return (
        <div className="space-y-6">
            <ul className="divide-y divide-gray-100 rounded-md border border-gray-200">
                {progress.steps
                    .filter((step) => step.value !== 'review')
                    .map((step) => (
                        <li
                            key={step.value}
                            className="flex items-center justify-between px-4 py-3"
                        >
                            <div className="flex items-center gap-3">
                                <span
                                    className={
                                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                                        (step.complete
                                            ? 'bg-green-600 text-white'
                                            : 'bg-gray-200 text-gray-600')
                                    }
                                >
                                    {step.complete ? '✓' : '!'}
                                </span>
                                <div>
                                    <div className="text-sm font-medium text-gray-800">
                                        {step.label}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                        {step.complete
                                            ? 'Configured'
                                            : step.required
                                              ? 'Required — not configured'
                                              : 'Optional — not configured'}
                                    </div>
                                </div>
                            </div>
                            <Link
                                href={route('onboarding.show', step.value)}
                                className="text-sm text-indigo-600 hover:text-indigo-700"
                            >
                                {step.complete ? 'Edit' : 'Set up'}
                            </Link>
                        </li>
                    ))}
            </ul>

            {blocked && (
                <div className="rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    Complete the required steps above before activating your
                    restaurant.
                </div>
            )}

            <form
                onSubmit={submit}
                className="flex justify-end border-t border-gray-100 pt-4"
            >
                <PrimaryButton disabled={processing || blocked}>
                    Finish onboarding
                </PrimaryButton>
            </form>
        </div>
    );
}
