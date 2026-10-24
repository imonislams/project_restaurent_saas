import { db } from './db';

/**
 * How long the offline POS may keep trading since the device last reached the
 * server.
 *
 * This is the whole offline authorisation story: there is no cached credential
 * and no way to start a session offline. A device that was authenticated while
 * online may keep selling for a bounded window — after that it refuses new
 * offline sales, so an unattended terminal cannot trade indefinitely on a stale
 * catalogue, stale prices and stale permissions.
 */

const LAST_CONTACT_KEY = 'last_server_contact_at';

/**
 * Pure so it can be tested without IndexedDB. A window of 0 disables the limit;
 * never having reached the server counts as expired (fail closed).
 */
export function isWindowExpired(
    lastContactAt: string | null,
    maxHours: number,
    now: Date = new Date(),
): boolean {
    if (maxHours <= 0) {
        return false;
    }

    if (!lastContactAt) {
        return true;
    }

    const contactedAt = new Date(lastContactAt).getTime();

    if (Number.isNaN(contactedAt)) {
        return true;
    }

    return now.getTime() - contactedAt > maxHours * 60 * 60 * 1000;
}

export async function markServerContact(at: Date = new Date()): Promise<void> {
    const database = await db();
    await database.put('meta', { key: LAST_CONTACT_KEY, value: at.toISOString() });
}

export async function lastServerContact(): Promise<string | null> {
    const database = await db();
    const record = await database.get('meta', LAST_CONTACT_KEY);

    return record?.value ?? null;
}

export async function offlineWindowExpired(maxHours: number): Promise<boolean> {
    return isWindowExpired(await lastServerContact(), maxHours);
}
