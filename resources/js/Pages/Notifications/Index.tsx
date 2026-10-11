import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';

interface NotificationRow {
    id: string;
    data: { title?: string; body?: string; level?: string; items?: { name: string; quantity: number }[] };
    read: boolean;
    created_at: string | null;
}

const LEVEL_STYLES: Record<string, string> = {
    danger: 'border-red-200 bg-red-50',
    warning: 'border-amber-200 bg-amber-50',
    info: 'border-gray-200 bg-white',
};

export default function NotificationsIndex({
    notifications,
    unread,
}: {
    notifications: NotificationRow[];
    unread: number;
}) {
    const { flash } = usePage().props;

    return (
        <AuthenticatedLayout
            header={
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold leading-tight text-gray-800">
                        Notifications {unread > 0 && <span className="text-sm text-gray-500">({unread} unread)</span>}
                    </h2>
                    {unread > 0 && (
                        <button
                            onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}
                            className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Mark all read
                        </button>
                    )}
                </div>
            }
        >
            <Head title="Notifications" />

            <div className="py-8">
                <div className="mx-auto max-w-3xl space-y-3 sm:px-6 lg:px-8">
                    {flash?.success && (
                        <div className="rounded-md bg-green-50 px-4 py-3 text-sm text-green-800">{flash.success}</div>
                    )}

                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={
                                'rounded-lg border p-4 shadow-sm ' +
                                (n.read ? 'border-gray-200 bg-white' : LEVEL_STYLES[n.data.level ?? 'info'] ?? LEVEL_STYLES.info)
                            }
                        >
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                        {n.data.title ?? 'Notification'}
                                        {!n.read && <span className="ml-2 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] text-white">NEW</span>}
                                    </div>
                                    <p className="mt-0.5 text-sm text-gray-600">{n.data.body}</p>
                                    {n.data.items && n.data.items.length > 0 && (
                                        <ul className="mt-1 text-xs text-gray-500">
                                            {n.data.items.map((item, i) => (
                                                <li key={i}>{item.name} — {item.quantity} on hand</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-xs text-gray-400">
                                        {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                    </div>
                                    {!n.read && (
                                        <button
                                            onClick={() => router.post(route('notifications.read', n.id), {}, { preserveScroll: true })}
                                            className="mt-1 text-xs text-indigo-600 hover:text-indigo-700"
                                        >
                                            Mark read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {notifications.length === 0 && (
                        <div className="rounded-lg bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
                            No notifications yet.
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
