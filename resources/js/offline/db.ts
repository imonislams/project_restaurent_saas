import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BundleRecord, OfflineOperation } from './types';

interface MetaRecord {
    key: string;
    value: string;
}

interface TouchDineOfflineDB extends DBSchema {
    bundles: {
        key: string;
        value: BundleRecord;
    };
    outbox: {
        key: string;
        value: OfflineOperation;
        indexes: { 'by-status': string; 'by-captured': string };
    };
    meta: {
        key: string;
        value: MetaRecord;
    };
}

const DB_NAME = 'touchdine-offline';
const DB_VERSION = 2;

let handle: Promise<IDBPDatabase<TouchDineOfflineDB>> | null = null;

export function db(): Promise<IDBPDatabase<TouchDineOfflineDB>> {
    handle ??= openDB<TouchDineOfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(database, oldVersion) {
            if (oldVersion < 1) {
                database.createObjectStore('bundles', { keyPath: 'key' });

                const outbox = database.createObjectStore('outbox', { keyPath: 'uuid' });
                outbox.createIndex('by-status', 'status');
                outbox.createIndex('by-captured', 'captured_at');
            }

            if (oldVersion < 2) {
                database.createObjectStore('meta', { keyPath: 'key' });
            }
        },
    });

    return handle;
}

/**
 * Local data is namespaced by tenant, branch *and* user. A shared terminal must
 * never show one user's mirrored catalogue (or queue) to another.
 */
export const scopeKey = (
    tenantId: number | string | null,
    branchId: number | string | null,
    userId: number | string | null,
): string => `tenant:${tenantId ?? 'none'}:branch:${branchId ?? 'none'}:user:${userId ?? 'none'}`;

/** IndexedDB is unavailable in private-mode Safari and some embedded webviews. */
export function isOfflineStorageAvailable(): boolean {
    try {
        return typeof indexedDB !== 'undefined' && indexedDB !== null;
    } catch {
        return false;
    }
}
