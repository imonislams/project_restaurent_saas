import { useToast } from '@/Components/ui/Toast';
import { onPrivate } from '@/realtime';
import { router, usePage } from '@inertiajs/react';
import { useEffect } from 'react';

interface PlatformAlertPayload {
    area?: string;
    title?: string;
    body?: string;
    level?: string;
    url?: string | null;
}

const AREAS: Array<{ area: string; permission: string }> = [
    { area: 'payments', permission: 'platform.payments.view' },
    { area: 'tenants', permission: 'platform.tenants.view' },
    { area: 'ops', permission: 'platform.monitoring.view' },
    { area: 'security', permission: 'platform.security.view' },
    { area: 'support', permission: 'platform.support.view' },
];

const TONES: Record<string, 'success' | 'error' | 'info'> = {
    success: 'success',
    danger: 'error',
    warning: 'info',
    info: 'info',
};

/**
 * Live platform-admin alerts: subscribes to the areas this admin may see and
 * shows the toast; the unread bell count is always re-read from the server.
 */
export default function PlatformRealtime() {
    const { push } = useToast();
    const page = usePage().props as Record<string, any>;
    const driver: string = page.realtime?.driver ?? 'off';
    const permissions: string[] = page.auth?.platform_permissions ?? [];

    useEffect(() => {
        if (driver === 'off') {
            return;
        }

        const unsubscribers = AREAS.filter(({ permission }) => permissions.includes(permission)).map(({ area }) =>
            onPrivate<PlatformAlertPayload>(`platform.${area}`, 'platform.alert', (payload) => {
                if (payload.title) {
                    push(TONES[payload.level ?? 'info'] ?? 'info', payload.body ? `${payload.title} — ${payload.body}` : payload.title);
                }

                router.reload({ only: ['platform_notifications', 'notifications', 'unread'] });
            }),
        );

        return () => unsubscribers.forEach((off) => off());
    }, [driver, permissions.join(','), push]);

    return null;
}
