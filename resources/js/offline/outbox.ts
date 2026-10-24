import { db } from './db';
import type { OfflineOperation, OfflineOperationType } from './types';

export function newOperationId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    return `op-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Write a captured operation to IndexedDB before anything else, so a reload or a
 * crash never loses a sale.
 *
 * The operation id is reused as the order idempotency key — that is what makes
 * replaying a batch safe, since the server short-circuits a key it has seen.
 */
export async function enqueue(input: {
    type: OfflineOperationType;
    payload: Record<string, unknown>;
    offlineReference?: string | null;
    /** What the device charged. The server flags a difference instead of hiding it. */
    expectedTotal?: number | null;
    capturedAt?: string;
}): Promise<OfflineOperation> {
    const uuid = newOperationId();

    const operation: OfflineOperation = {
        uuid,
        type: input.type,
        payload: { ...input.payload, idempotency_key: uuid },
        offline_reference: input.offlineReference ?? `OFF-${uuid.slice(0, 8).toUpperCase()}`,
        expected_total: input.expectedTotal ?? null,
        captured_at: input.capturedAt ?? new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        last_error: null,
    };

    const database = await db();
    await database.put('outbox', operation);

    return operation;
}

/**
 * Oldest first, so dependent operations (open a table, then settle it) replay in
 * causal order. `syncing` entries are included: a previous attempt that was cut
 * off mid-flight must be retried, and replay is safe.
 */
export async function pendingOperations(): Promise<OfflineOperation[]> {
    const database = await db();
    const operations = await database.getAllFromIndex('outbox', 'by-captured');

    return operations.filter(
        (operation) => operation.status === 'pending' || operation.status === 'syncing',
    );
}

export async function countPending(): Promise<number> {
    const database = await db();
    const pending = await database.getAllFromIndex('outbox', 'by-status', 'pending');
    const syncing = await database.getAllFromIndex('outbox', 'by-status', 'syncing');

    return pending.length + syncing.length;
}

export async function countRejected(): Promise<number> {
    const database = await db();
    const rejected = await database.getAllFromIndex('outbox', 'by-status', 'rejected');

    return rejected.length;
}

export async function save(operation: OfflineOperation): Promise<void> {
    const database = await db();
    await database.put('outbox', operation);
}

export async function remove(uuid: string): Promise<void> {
    const database = await db();
    await database.delete('outbox', uuid);
}

/** Discard everything queued — only for an explicit "abandon pending sales" action. */
export async function discardAll(): Promise<void> {
    const database = await db();
    await database.clear('outbox');
}
