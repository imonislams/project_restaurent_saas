import { useEffect, useState } from 'react';

/**
 * Whether the browser currently reports no network.
 *
 * `navigator.onLine` is only a hint (it says nothing about the server being
 * reachable), so it is treated as an early signal: the sync engine still verifies
 * every operation against the server.
 */
export function useOfflineStatus(): boolean {
    const [offline, setOffline] = useState(
        () => typeof navigator !== 'undefined' && !navigator.onLine,
    );

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);

        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        update();

        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    return offline;
}
