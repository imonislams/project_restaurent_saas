export type OfflineOperationType = 'place_sale' | 'open_order' | 'settle_order';

export type OutboxStatus = 'pending' | 'syncing' | 'accepted' | 'rejected';

/** One action taken while offline, waiting to be replayed to the server. */
export interface OfflineOperation {
    uuid: string;
    type: OfflineOperationType;
    payload: Record<string, unknown>;
    offline_reference?: string | null;
    /** The total the device charged, so the server can flag a difference. */
    expected_total?: number | null;
    captured_at: string;
    status: OutboxStatus;
    attempts: number;
    last_error?: string | null;
}

/** The locally mirrored catalogue, keyed per tenant/branch/user. */
export interface BundleRecord {
    key: string;
    version: string;
    fetched_at: string;
    branch: { id: number; name: string; currency: string } | null;
    shift: { id: number; opened_at: string | null } | null;
    data: Record<string, unknown>;
}

export interface SyncState {
    online: boolean;
    syncing: boolean;
    pending: number;
    /** Operations the server resolved differently and that need a human look. */
    toReview: number;
    lastSyncedAt: string | null;
    lastError: string | null;
}

export interface SyncResultItem {
    uuid: string;
    status: 'accepted' | 'rejected' | 'conflicted';
    order_id?: number;
    order_number?: string;
    message?: string;
}
