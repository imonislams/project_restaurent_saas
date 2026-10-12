import { useToast } from '@/Components/ui/Toast';
import { router } from '@inertiajs/react';
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

/**
 * Keeps the notification bell, the Orders badge and a toast in sync without a
 * manual refresh: polls the shared counts and alerts when a new QR order is
 * waiting for approval. Matches the app's existing polling pattern.
 */
export default function NotificationWatcher({ pending }: { pending: number }) {
    const { push } = useToast();
    const previous = useRef<number | null>(null);

    useEffect(() => {
        const tick = () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            router.reload({ only: ['pending_approvals', 'notifications'] });
        };

        const id = window.setInterval(tick, 15000);

        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        if (previous.current !== null && pending > previous.current) {
            const added = pending - previous.current;
            push('info', `${added} new QR order${added > 1 ? 's' : ''} awaiting approval — open Orders to accept.`);
            chime();
        }

        previous.current = pending;
    }, [pending, push]);

    return null;
}
