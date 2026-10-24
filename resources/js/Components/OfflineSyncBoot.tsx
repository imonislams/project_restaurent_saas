import { refreshBundle, setBundleScope } from '@/offline/bundle';
import { isOfflineStorageAvailable } from '@/offline/db';
import { refreshPendingCount, startSyncEngine } from '@/offline/sync';
import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';

/**
 * Boots the offline layer: scopes the local mirror to the signed-in
 * tenant/branch/user, starts the sync engine and keeps the catalogue snapshot
 * fresh. Renders nothing.
 *
 * Mounted from both the app shell and the standalone POS screen — the POS does
 * not use AppShell, and without this the queue captured there would never flush.
 */
export default function OfflineSyncBoot() {
    const page = usePage().props as Record<string, any>;
    const tenantId = page.tenant?.id ?? null;
    const branchId = page.active_branch_id ?? null;
    const userId = page.auth?.user?.id ?? null;

    useEffect(() => {
        if (!isOfflineStorageAvailable()) {
            return;
        }

        setBundleScope({ tenantId, branchId, userId });

        const stop = startSyncEngine();

        const refresh = () => {
            void refreshBundle().catch(() => {
                // Offline: keep the existing mirror.
                void refreshPendingCount();
            });
        };

        window.addEventListener('online', refresh);
        refresh();

        return () => {
            window.removeEventListener('online', refresh);
            stop();
        };
    }, [tenantId, branchId, userId]);

    return null;
}
