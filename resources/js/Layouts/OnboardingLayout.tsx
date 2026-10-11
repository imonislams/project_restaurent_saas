import ApplicationLogo from '@/Components/ApplicationLogo';
import Stepper from '@/Components/Onboarding/Stepper';
import { useT } from '@/i18n';
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
    const { auth, tenant, flash } = usePage().props as Record<string, any>;
    const t = useT();
    const index = Math.max(1, progress.steps.findIndex((s) => s.value === step) + 1);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100">
            <Head title={`${title} — Setup`} />

            <header className="border-b border-gray-200 bg-white">
                <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center gap-3">
                        <ApplicationLogo className="h-8 w-8 fill-current text-indigo-600" />
                        <div>
                            <div className="text-sm font-semibold text-gray-900">{tenant?.name ?? t('onboarding.title')}</div>
                            <div className="text-xs text-gray-500">
                                {t('onboarding.step_of', { current: index, total: progress.steps.length })}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="hidden sm:inline">{auth?.user?.name}</span>
                        <Link href={route('logout')} method="post" as="button" className="hover:text-gray-700">
                            {t('shell.signout')}
                        </Link>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                    <Stepper steps={progress.steps} current={step} percent={progress.percent} />
                </div>

                {flash?.success && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}
                {flash?.error && <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800">{flash.error}</div>}

                <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                    <header className="mb-6 border-b border-gray-100 pb-4">
                        <h1 className="text-lg font-semibold tracking-tight text-gray-900">{title}</h1>
                        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
                    </header>

                    {children}

                    {actions && <div className="mt-8 border-t border-gray-100 pt-4">{actions}</div>}
                </section>
            </main>
        </div>
    );
}
