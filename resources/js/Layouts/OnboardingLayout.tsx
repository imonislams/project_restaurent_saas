import ApplicationLogo from '@/Components/ApplicationLogo';
import Stepper from '@/Components/Onboarding/Stepper';
import { OnboardingProgress } from '@/types/onboarding';
import { Head, Link, usePage } from '@inertiajs/react';
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
    const { auth, tenant, flash } = usePage().props;

    return (
        <div className="min-h-screen bg-gray-100">
            <Head title={`${title} — Setup`} />

            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <ApplicationLogo className="h-8 w-8 fill-current text-gray-700" />
                        <div>
                            <div className="text-sm font-semibold text-gray-800">
                                {tenant?.name ?? 'Restaurant setup'}
                            </div>
                            <div className="text-xs text-gray-500">
                                Welcome, {auth.user.name}
                            </div>
                        </div>
                    </div>
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Sign out
                    </Link>
                </div>
            </header>

            {flash?.success && (
                <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
                    <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                        {flash.success}
                    </div>
                </div>
            )}
            {flash?.error && (
                <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 lg:px-8">
                    <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-800">
                        {flash.error}
                    </div>
                </div>
            )}

            <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
                    <aside className="rounded-lg bg-white p-4 shadow-sm">
                        <Stepper
                            steps={progress.steps}
                            current={step}
                            percent={progress.percent}
                        />
                    </aside>

                    <section className="rounded-lg bg-white p-6 shadow-sm">
                        <header className="mb-6 border-b border-gray-100 pb-4">
                            <h1 className="text-lg font-semibold text-gray-900">
                                {title}
                            </h1>
                            {description && (
                                <p className="mt-1 text-sm text-gray-500">
                                    {description}
                                </p>
                            )}
                        </header>

                        {children}

                        {actions && (
                            <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4">
                                {actions}
                            </div>
                        )}
                    </section>
                </div>
            </main>
        </div>
    );
}
