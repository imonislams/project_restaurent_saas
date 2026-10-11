import { Badge, Button, EmptyState, PageHeader } from '@/Components/ui';
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

export default function NotificationsIndex({ notifications, unread }: { notifications: NotificationRow[]; unread: number }) {
    const { flash } = usePage().props as Record<string, any>;

    return (
        <AuthenticatedLayout
            header={
                <PageHeader
                    title="Notifications"
                    description={unread > 0 ? `${unread} unread` : 'You are all caught up.'}
                    actions={
                        unread > 0 && (
                            <Button size="sm" variant="secondary" onClick={() => router.post(route('notifications.read-all'), {}, { preserveScroll: true })}>
                                Mark all read
                            </Button>
                        )
                    }
                />
            }
        >
            <Head title="Notifications" />

            <div className="py-6">
                <div className="mx-auto max-w-3xl space-y-3 px-4 sm:px-6 lg:px-8">
                    {flash?.success && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{flash.success}</div>}

                    {notifications.length === 0 && <EmptyState title="No notifications yet" description="Stock alerts, shift reminders and daily summaries will appear here." />}

                    {notifications.map((n) => (
                        <div
                            key={n.id}
                            className={'rounded-xl border p-4 shadow-sm ' + (n.read ? 'border-gray-200 bg-white' : (LEVEL_STYLES[n.data.level ?? 'info'] ?? LEVEL_STYLES.info))}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                        {n.data.title ?? 'Notification'}
                                        {!n.read && <Badge tone="info">New</Badge>}
                                    </div>
                                    <p className="mt-0.5 text-sm text-gray-600">{n.data.body}</p>
                                    {n.data.items && n.data.items.length > 0 && (
                                        <ul className="mt-1 text-xs text-gray-500">
                                            {n.data.items.map((item, i) => (
                                                <li key={i}>
                                                    {item.name} — {item.quantity} on hand
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-xs text-gray-400">{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
                                    {!n.read && (
                                        <Button size="xs" variant="ghost" className="mt-1" onClick={() => router.post(route('notifications.read', n.id), {}, { preserveScroll: true })}>
                                            Mark read
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
