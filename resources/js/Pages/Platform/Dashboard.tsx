import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link } from '@inertiajs/react';

interface Kpi {
    label: string;
    value: number;
}

export default function PlatformDashboard({
    kpis,
    health,
    recentTenants,
}: {
    kpis: Kpi[];
    health: { failed_jobs: number; queued_jobs: number; db: string };
    recentTenants: {
        id: number;
        name: string;
        status: string;
        plan: string | null;
        subscription_status: string | null;
        created_at: string | null;
    }[];
}) {
    return (
        <PlatformLayout title="Overview">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {kpis.map((kpi) => (
                    <div key={kpi.label} className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="text-xs text-gray-500">{kpi.label}</div>
                        <div className="mt-1 text-xl font-semibold text-gray-900">
                            {kpi.label === 'MRR' ? kpi.value.toFixed(2) : kpi.value}
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-lg bg-white p-6 shadow-sm lg:col-span-2">
                    <h2 className="mb-3 text-base font-semibold text-gray-900">Recent tenants</h2>
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                                <th className="py-2">Tenant</th>
                                <th className="py-2">Plan</th>
                                <th className="py-2">Subscription</th>
                                <th className="py-2">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {recentTenants.map((t) => (
                                <tr key={t.id}>
                                    <td className="py-2">
                                        <Link href={route('platform.tenants.show', t.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                                            {t.name}
                                        </Link>
                                    </td>
                                    <td className="py-2 text-gray-600">{t.plan ?? '—'}</td>
                                    <td className="py-2 text-gray-600">{t.subscription_status ?? '—'}</td>
                                    <td className="py-2 text-gray-600 capitalize">{t.status}</td>
                                </tr>
                            ))}
                            {recentTenants.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="py-6 text-center text-gray-500">No tenants yet.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="rounded-lg bg-white p-6 shadow-sm">
                    <h2 className="mb-3 text-base font-semibold text-gray-900">System health</h2>
                    <dl className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Database</dt>
                            <dd className="font-medium text-green-600">{health.db}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Queued jobs</dt>
                            <dd className="font-medium text-gray-800">{health.queued_jobs}</dd>
                        </div>
                        <div className="flex justify-between">
                            <dt className="text-gray-500">Failed jobs</dt>
                            <dd className={'font-medium ' + (health.failed_jobs > 0 ? 'text-red-600' : 'text-gray-800')}>
                                {health.failed_jobs}
                            </dd>
                        </div>
                    </dl>
                </div>
            </div>
        </PlatformLayout>
    );
}
