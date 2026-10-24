import { db, scopeKey } from './db';
import { markServerContact } from './session';
import type { BundleRecord } from './types';

interface BundleResponse {
    version: string;
    generated_at: string;
    branch: { id: number; name: string; currency: string } | null;
    shift: { id: number; opened_at: string | null } | null;
    data: Record<string, unknown>;
}

interface Scope {
    tenantId: number | null;
    branchId: number | null;
    userId: number | null;
}

let scope: Scope = { tenantId: null, branchId: null, userId: null };

/** The mirror is namespaced by tenant, branch and user (see db.ts). */
export function setBundleScope(next: Scope): void {
    scope = next;
}

export function bundleKey(): string {
    return scopeKey(scope.tenantId, scope.branchId, scope.userId);
}

export async function cachedBundle(): Promise<BundleRecord | null> {
    const database = await db();

    return (await database.get('bundles', bundleKey())) ?? null;
}

/**
 * Fetch the catalogue snapshot and store it. When the server reports the same
 * version we keep the existing record, so the stored capture time is not reset.
 */
export async function refreshBundle(): Promise<BundleRecord | null> {
    const { data } = await window.axios.get<BundleResponse>(route('pos.offline.bundle'));

    // A successful snapshot fetch is also proof the device reached the server.
    await markServerContact();

    const record: BundleRecord = {
        key: bundleKey(),
        version: data.version,
        fetched_at: data.generated_at,
        branch: data.branch,
        shift: data.shift,
        data: data.data,
    };

    const database = await db();
    const existing = await database.get('bundles', record.key);

    if (existing && existing.version === record.version) {
        return existing;
    }

    await database.put('bundles', record);

    return record;
}
