import { formatMoney } from '@/Components/ui';
import { useToast } from '@/Components/ui/Toast';
import { onPrivate } from '@/realtime';
import { router, usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';

function chime() {
    try {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.setValueAtTime(880, now + 0.12);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
    } catch {
        /* audio unavailable — ignore */
    }
}

interface AwaitingApprovalPayload {
    order_id: number;
    order_number?: string;
    branch_id?: number;
    table?: string | null;
    total?: number;
    currency?: string;
    items?: number;
}

interface TenantAlertPayload {
    area?: string;
    title?: string;
    body?: string;
    level?: string;
    branch_id?: number | null;
}

/** Tenant areas the watcher follows, and the permission each one requires. */
const AREAS: Array<{ area: string; permission: string; chime: boolean }> = [
    { area: 'billing', permission: 'invoices.view', chime: true },
    { area: 'inventory', permission: 'inventory.view', chime: false },
    { area: 'orders', permission: 'orders.view', chime: false },
];

/** Shared props refreshed on any push — `business360` only exists on the dashboard. */
const RELOAD_PROPS = ['pending_approvals', 'notifications', 'business360'];

const TONES: Record<string, 'success' | 'error' | 'info'> = {
    success: 'success',
    danger: 'error',
    warning: 'info',
    info: 'info',
};

/**
 * Keeps the notification bell, the Orders badge and a toast in sync.
 *
 * With real-time on, a new QR order is announced the moment it is placed; the
 * counts themselves are always re-read from the server (the socket changes
 * *when* they arrive, never *what* they are). The 60-second poll remains as a
 * fallback for a blocked socket or an offline till.
 */
export default function NotificationWatcher({ pending }: { pending: number }) {
    const { push } = useToast();
    const previous = useRef<number | null>(null);
    const lastEventAt = useRef(0);

    const page = usePage().props as Record<string, any>;
    const tenantId: number | undefined = page.tenant?.id;
    const driver: string = page.realtime?.driver ?? 'off';
    const currency: string = page.currency ?? 'USD';
    const permissions: string[] = page.auth?.permissions ?? [];
    const canApprove: boolean = permissions.includes('orders.approve');
    const permissionKey = permissions.join(',');

    // Branch access can change after navigation; read it at event time.
    const branchIds = useRef<number[]>([]);
    branchIds.current = (page.branches ?? []).map((branch: { id: number }) => branch.id);

    useEffect(() => {
        const tick = () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            router.reload({ only: RELOAD_PROPS });
        };

        const id = window.setInterval(tick, 60000);

        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (!tenantId || driver === 'off' || !canApprove) {
            return;
        }

        return onPrivate(`tenant.${tenantId}.approvals`, 'order.awaiting_approval', (payload: AwaitingApprovalPayload) => {
            // Only announce orders from branches this user works in.
            if (payload.branch_id && branchIds.current.length > 0 && !branchIds.current.includes(payload.branch_id)) {
                return;
            }

            lastEventAt.current = Date.now();

            const where = payload.table ? `Table ${payload.table}` : `${payload.items ?? 1} item(s)`;
            const amount = payload.total !== undefined ? ` · ${formatMoney(payload.total, payload.currency ?? currency)}` : '';

            push('info', `${payload.order_number ?? 'New order'} · ${where}${amount} — awaiting your approval.`);
            chime();

            router.reload({ only: RELOAD_PROPS });
        });
    }, [tenantId, driver, canApprove, push, currency]);

    // Billing / inventory / order activity: toast (chime for money), then refresh.
    useEffect(() => {
        if (!tenantId || driver === 'off') {
            return;
        }

        const unsubscribers = AREAS.filter(({ permission }) => permissions.includes(permission)).map(({ area, chime: playChime }) =>
            onPrivate<TenantAlertPayload>(`tenant.${tenantId}.${area}`, 'tenant.alert', (payload) => {
                if (payload.branch_id && branchIds.current.length > 0 && !branchIds.current.includes(payload.branch_id)) {
                    return;
                }

                if (payload.title) {
                    push(TONES[payload.level ?? 'info'] ?? 'info', payload.body ? `${payload.title} — ${payload.body}` : payload.title);

                    if (playChime) {
                        chime();
                    }
                }

                router.reload({ only: RELOAD_PROPS });
            }),
        );

        return () => unsubscribers.forEach((off) => off());
    }, [tenantId, driver, permissionKey, push]);

    useEffect(() => {
        if (previous.current !== null && pending > previous.current) {
            // The live event (or its reload) already announced this — no double toast.
            if (Date.now() - lastEventAt.current < 8000) {
                previous.current = pending;
                return;
            }

            const added = pending - previous.current;
            push('info', `${added} new QR order${added > 1 ? 's' : ''} awaiting approval — open Orders to accept.`);
            chime();
        }

        previous.current = pending;
    }, [pending, push]);

    return null;
}
