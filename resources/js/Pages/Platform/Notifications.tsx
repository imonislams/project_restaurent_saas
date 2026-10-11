import { Badge, Button, Card, CardBody, EmptyState, Pagination, formatDateTime } from '@/Components/ui';
import type { PageLink } from '@/Components/ui';
import PlatformLayout from '@/Layouts/PlatformLayout';
import { router } from '@inertiajs/react';

interface NotificationRow {
    id: string;
    type: string;
    data: Record<string, any>;
    read_at: string | null;
    created_at: string | null;
}

interface Paginated<T> {
    data: T[];
    links: PageLink[];
}

export default function PlatformNotifications({ notifications, unread }: { notifications: Paginated<NotificationRow>; unread: number }) {
    return (
        <PlatformLayout
            title="Notifications"
            description="In-app notifications for your administrator account."
            actions={unread > 0 ? <Button size="sm" variant="secondary" onClick={() => router.post(route('platform.notifications.read-all'), {}, { preserveScroll: true })}>Mark all read</Button> : undefined}
        >
            <Card>
                <CardBody className="space-y-3">
                    {notifications.data.map((notification) => (
                        <div key={notification.id} className="flex items-start justify-between gap-4 border-b border-gray-50 pb-3 last:border-0">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-gray-800">{notification.data.title ?? notification.type}</span>
                                    {!notification.read_at && <Badge tone="info">unread</Badge>}
                                </div>
                                {notification.data.message && <p className="mt-0.5 text-sm text-gray-600">{notification.data.message}</p>}
                                <p className="mt-0.5 text-xs text-gray-400">{formatDateTime(notification.created_at)}</p>
                            </div>
                        </div>
                    ))}
                    {notifications.data.length === 0 && <EmptyState title="You're all caught up" description="No notifications for your account." />}
                </CardBody>
            </Card>
            <Pagination links={notifications.links} />
        </PlatformLayout>
    );
}
