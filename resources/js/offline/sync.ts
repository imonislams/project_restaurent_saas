import { isOfflineStorageAvailable } from './db';
import { countPending, pendingOperations, remove, save } from './outbox';
import { markServerContact } from './session';
import type { OfflineOperation, SyncResultItem, SyncState } from './types';

/**
 * Flushes queued offline operations to the server.
 *
 * Deliberately does NOT rely on the Background Sync API: iOS Safari does not
 * implement it. Instead the queue is flushed on reconnect, when the window
 * regains focus/visibility and on a slow interval while the app is open.
 */

const BATCH_SIZE = 25;
const FLUSH_INTERVAL_MS = 30_000;

let state: SyncState = {
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    syncing: false,
    pending: 0,
    toReview: 0,
    lastSyncedAt: null,
    lastError: null,
};

let engineStarted = false;

const listeners = new Set<(state: SyncState) => void>();

export function getSyncState(): SyncState {
    return { ...state };
}

export function subscribe(listener: (state: SyncState) => void): () => void {
    listeners.add(listener);
    listener({ ...state });

    return () => {
        listeners.delete(listener);
    };
}

function setState(patch: Partial<SyncState>): void {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener({ ...state }));
}

function errorMessage(error: unknown): string {
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message ?? 'Sync failed.');
    }

    return 'Sync failed.';
}

export async function refreshPendingCount(): Promise<void> {
    if (!isOfflineStorageAvailable()) {
        return;
    }

    try {
        setState({ pending: await countPending() });
    } catch {
        // Storage unavailable — the indicator simply keeps its last value.
    }
}

export async function flush(): Promise<void> {
    if (state.syncing || !state.online || !isOfflineStorageAvailable()) {
        return;
    }

    let operations: OfflineOperation[];

    try {
        operations = await pendingOperations();
    } catch {
        return;
    }

    if (operations.length === 0) {
        setState({ pending: 0 });

        return;
    }

    setState({ syncing: true, lastError: null });

    try {
        let conflicted = 0;

        for (let index = 0; index < operations.length; index += BATCH_SIZE) {
            conflicted += await sendBatch(operations.slice(index, index + BATCH_SIZE));
        }

        setState({
            lastSyncedAt: new Date().toISOString(),
            toReview: state.toReview + conflicted,
        });

        // Reaching the server here renews the offline trading window.
        await markServerContact();
    } catch (error) {
        // A transport failure leaves the batch queued for the next attempt.
        setState({ lastError: errorMessage(error) });
    } finally {
        setState({ syncing: false });
        await refreshPendingCount();
    }
}

/**
 * Sends one batch. Returns how many operations the server applied but resolved
 * differently, so the UI can report that something needs review.
 */
async function sendBatch(operations: OfflineOperation[]): Promise<number> {
    for (const operation of operations) {
        await save({ ...operation, status: 'syncing', attempts: operation.attempts + 1 });
    }

    const { data } = await window.axios.post<{ results: SyncResultItem[] }>(
        route('pos.offline.sync'),
        {
            operations: operations.map((operation) => ({
                uuid: operation.uuid,
                type: operation.type,
                payload: operation.payload,
                captured_at: operation.captured_at,
                offline_reference: operation.offline_reference ?? null,
                expected_total: operation.expected_total ?? null,
            })),
        },
    );

    const results = new Map(data.results.map((result) => [result.uuid, result]));
    let conflicted = 0;

    for (const operation of operations) {
        const result = results.get(operation.uuid);

        if (!result) {
            await save({ ...operation, status: 'pending', last_error: 'No result returned.' });

            continue;
        }

        // `conflicted` means the operation was applied but resolved differently —
        // the order exists, so it leaves the queue and is surfaced for review.
        if (result.status === 'accepted' || result.status === 'conflicted') {
            if (result.status === 'conflicted') {
                conflicted++;
            }

            await remove(operation.uuid);

            continue;
        }

        await save({
            ...operation,
            status: 'rejected',
            last_error: result.message ?? 'Rejected by the server.',
        });
    }

    return conflicted;
}

/** Wire the flush triggers. Returns a teardown function. */
export function startSyncEngine(): () => void {
    // The engine is mounted from more than one place (app shell and the standalone
    // POS screen); starting it twice would double every flush.
    if (engineStarted) {
        return () => {};
    }

    engineStarted = true;

    const onOnline = () => {
        setState({ online: true });
        void flush();
    };

    const onOffline = () => setState({ online: false });

    const onWake = () => {
        if (document.visibilityState === 'visible' && navigator.onLine) {
            void flush();
        }
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);

    const timer = window.setInterval(() => {
        if (navigator.onLine) {
            void flush();
        }
    }, FLUSH_INTERVAL_MS);

    void refreshPendingCount();
    void flush();

    return () => {
        engineStarted = false;

        window.removeEventListener('online', onOnline);
        window.removeEventListener('offline', onOffline);
        window.removeEventListener('focus', onWake);
        document.removeEventListener('visibilitychange', onWake);
        window.clearInterval(timer);
    };
}
