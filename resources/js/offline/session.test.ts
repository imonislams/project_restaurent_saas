import { describe, expect, it } from 'vitest';
import { isWindowExpired } from './session';

describe('offline trading window', () => {
    const now = new Date('2026-10-24T12:00:00Z');

    it('stays open within the window', () => {
        expect(isWindowExpired('2026-10-24T06:00:00Z', 12, now)).toBe(false);
    });

    it('closes once the window has passed', () => {
        expect(isWindowExpired('2026-10-23T12:00:00Z', 12, now)).toBe(true);
    });

    it('fails closed when the device has never reached the server', () => {
        expect(isWindowExpired(null, 12, now)).toBe(true);
    });

    it('treats an unparseable timestamp as expired', () => {
        expect(isWindowExpired('not-a-date', 12, now)).toBe(true);
    });

    it('can be disabled with a zero window', () => {
        expect(isWindowExpired(null, 0, now)).toBe(false);
    });
});
