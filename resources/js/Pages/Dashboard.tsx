import { useT } from '@/i18n';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { OnboardingProgress } from '@/types/onboarding';
import { Head, Link, usePage } from '@inertiajs/react';

interface ChecklistItem {
    key: string;
    label: string;
    done: boolean;
    required: boolean;
}

interface TenantInfo {
    name: string;
    slug: string;
    status: string;
    on_trial: boolean;
    trial_ends_at: string | null;
    onboarding_completed: boolean;
    currency: string | null;
    timezone: string | null;
}

export default function Dashboard({
    tenant,
    checklist,
    warnings,
    progress,
    stats,
}: {
    tenant: TenantInfo | null;
    checklist: ChecklistItem[];
    warnings: { key: string; label: string }[];
    progress: OnboardingProgress | null;
    stats: { branches?: number; users?: number };
}) {
    const { flash } = usePage().props;
    const t = useT();

    if (tenant === null) {
        return (
            <AuthenticatedLayout
                header={
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Dashboard
                    </h2>
                }
            >
                <Head title="Dashboard" />
                <div className="py-12">
                    <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
                        <div className="bg-white p-6 shadow-sm sm:rounded-lg">
                            <p className="text-gray-700">
                                This account is not linked to a restaurant.
                            </p>
                        </div>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-semibold leading-tight text-gray-800">
                            {tenant.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                            {tenant.timezone} · {tenant.currency}
                        </p>
                    </div>
                    {tenant.on_trial && (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                            Trial
                        </span>
                    )}
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="py-8">
                <div className="mx-auto max-w-7xl space-y-6 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">
                            {flash.success}
                        </div>
                    )}

                    {!tenant.onboarding_completed && warnings.length > 0 && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm text-amber-800">
                                Finish setup to start selling. Required:{' '}
                                {warnings.map((w) => w.label).join(', ')}.
                            </p>
                            <Link
                                href={route('onboarding.index')}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
                            >
                                {t('dash.continue_setup')}
                            </Link>
                        </div>
                    )}

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {t('dash.checklist')}
                                </h3>
                                {progress && (
                                    <span className="text-sm text-gray-500">
                                        {progress.completed}/{progress.total}{' '}
                                        complete
                                    </span>
                                )}
                            </div>

                            {progress && (
                                <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                    <div
                                        className="h-full rounded-full bg-indigo-600 transition-all"
                                        style={{
                                            width: `${progress.percent}%`,
                                        }}
                                    />
                                </div>
                            )}

                            <ul className="divide-y divide-gray-100">
                                {checklist.map((item) => (
                                    <li
                                        key={item.key}
                                        className="flex items-center justify-between py-3"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span
                                                className={
                                                    'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ' +
                                                    (item.done
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-200 text-gray-600')
                                                }
                                            >
                                                {item.done ? '✓' : '!'}
                                            </span>
                                            <span className="text-sm text-gray-700">
                                                {item.label}
                                            </span>
                                        </div>
                                        {item.required && !item.done && (
                                            <span className="text-xs font-medium uppercase tracking-wide text-red-600">
                                                Required
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {t('dash.overview')}
                                </h3>
                                <dl className="mt-4 space-y-3 text-sm">
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">
                                            {t('dash.status')}
                                        </dt>
                                        <dd className="font-medium capitalize text-gray-800">
                                            {tenant.status}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">
                                            {t('dash.branches')}
                                        </dt>
                                        <dd className="font-medium text-gray-800">
                                            {stats.branches ?? 0}
                                        </dd>
                                    </div>
                                    <div className="flex justify-between">
                                        <dt className="text-gray-500">{t('dash.users')}</dt>
                                        <dd className="font-medium text-gray-800">
                                            {stats.users ?? 0}
                                        </dd>
                                    </div>
                                </dl>
                            </div>

                            <div className="rounded-lg bg-white p-6 shadow-sm">
                                <h3 className="text-base font-semibold text-gray-900">
                                    {t('dash.next_up')}
                                </h3>
                                <p className="mt-2 text-sm text-gray-500">
                                    Menu & products, inventory and the POS
                                    terminal arrive in upcoming phases. The
                                    foundation is ready.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
