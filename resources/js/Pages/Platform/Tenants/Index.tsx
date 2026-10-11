import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface TenantRow {
    id: number;
    name: string;
    slug: string;
    business_email: string;
    status: string;
    plan: string | null;
    subscription_status: string | null;
    branches_count: number;
    users_count: number;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

export default function TenantsIndex({
    tenants,
    filters,
}: {
    tenants: Paginated<TenantRow>;
    filters: { search: string };
}) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (params: Record<string, unknown> = {}) =>
        router.get(route('platform.tenants.index'), { search, ...params }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <PlatformLayout title="Tenants">
            <div className="mb-4 flex justify-end">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                    }}
                    className="flex gap-2"
                >
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search name or email"
                        className="rounded-md border-gray-300 text-sm"
                    />
                    <button type="submit" className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white">
                        Search
                    </button>
                </form>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="py-2">Tenant</th>
                            <th className="py-2">Plan</th>
                            <th className="py-2">Subscription</th>
                            <th className="py-2 text-right">Branches</th>
                            <th className="py-2 text-right">Users</th>
                            <th className="py-2">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {tenants.data.map((t) => (
                            <tr key={t.id}>
                                <td className="py-3">
                                    <Link href={route('platform.tenants.show', t.id)} className="font-medium text-indigo-600 hover:text-indigo-700">
                                        {t.name}
                                    </Link>
                                    <div className="text-xs text-gray-400">{t.business_email}</div>
                                </td>
                                <td className="py-3 text-gray-600">{t.plan ?? '—'}</td>
                                <td className="py-3 text-gray-600">{t.subscription_status ?? '—'}</td>
                                <td className="py-3 text-right text-gray-600">{t.branches_count}</td>
                                <td className="py-3 text-right text-gray-600">{t.users_count}</td>
                                <td className="py-3">
                                    <span
                                        className={
                                            'rounded-full px-2 py-0.5 text-xs font-medium ' +
                                            (t.status === 'active'
                                                ? 'bg-green-100 text-green-800'
                                                : t.status === 'suspended'
                                                  ? 'bg-red-100 text-red-800'
                                                  : 'bg-gray-200 text-gray-600')
                                        }
                                    >
                                        {t.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {tenants.data.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-gray-500">No tenants found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {tenants.links.length > 3 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                        {tenants.links.map((link, i) =>
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    preserveScroll
                                    className={'rounded px-3 py-1 text-sm ' + (link.active ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100')}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            ) : (
                                <span key={i} className="px-3 py-1 text-sm text-gray-400" dangerouslySetInnerHTML={{ __html: link.label }} />
                            ),
                        )}
                    </div>
                )}
            </div>
        </PlatformLayout>
    );
}
