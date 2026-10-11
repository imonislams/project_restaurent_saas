import PlatformLayout from '@/Layouts/PlatformLayout';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';

interface LogRow {
    id: number;
    tenant_id: number | null;
    action: string;
    actor: string | null;
    subject: string | null;
    ip: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
}

export default function PlatformAudit({
    logs,
    filters,
}: {
    logs: Paginated<LogRow>;
    filters: { action: string };
}) {
    const [action, setAction] = useState(filters.action ?? '');

    const apply = () =>
        router.get(route('platform.audit.index'), { action }, { preserveState: true, preserveScroll: true, replace: true });

    return (
        <PlatformLayout title="Audit log">
            <div className="mb-4 flex justify-end">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply();
                    }}
                    className="flex gap-2"
                >
                    <input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Filter by action" className="rounded-md border-gray-300 text-sm" />
                    <button type="submit" className="rounded-md bg-gray-800 px-3 py-1.5 text-sm text-white">Filter</button>
                </form>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
                <table className="w-full text-left text-sm">
                    <thead className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                        <tr>
                            <th className="py-2">When</th>
                            <th className="py-2">Action</th>
                            <th className="py-2">Actor</th>
                            <th className="py-2">Tenant</th>
                            <th className="py-2">IP</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {logs.data.map((log) => (
                            <tr key={log.id}>
                                <td className="py-2 text-gray-500">{log.created_at ? new Date(log.created_at).toLocaleString() : ''}</td>
                                <td className="py-2 font-medium text-gray-800">{log.action}</td>
                                <td className="py-2 text-gray-600">{log.actor ?? '—'}</td>
                                <td className="py-2 text-gray-600">{log.tenant_id ?? '—'}</td>
                                <td className="py-2 text-gray-500">{log.ip ?? '—'}</td>
                            </tr>
                        ))}
                        {logs.data.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-500">No audit records.</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {logs.links.length > 3 && (
                    <div className="mt-4 flex flex-wrap gap-1">
                        {logs.links.map((link, i) =>
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
