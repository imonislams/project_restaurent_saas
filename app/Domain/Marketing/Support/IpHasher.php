<?php

namespace App\Domain\Marketing\Support;

use Illuminate\Http\Request;

/**
 * Hashes an IP address for storage. A raw IP is never persisted anywhere in the
 * marketing tables — see docs/marketing/SECURITY.md §5.
 *
 * The hash is salted with the application key, so it is not reversible and not
 * portable between installs (which is the intent: it exists for coarse dedupe, not
 * for identifying a person).
 */
final class IpHasher
{
    public static function hash(?string $ip): ?string
    {
        $ip = trim((string) $ip);

        if ($ip === '') {
            return null;
        }

        return hash('sha256', $ip.'|'.(string) config('app.key'));
    }

    public static function fromRequest(Request $request): ?string
    {
        return self::hash($request->ip());
    }
}
