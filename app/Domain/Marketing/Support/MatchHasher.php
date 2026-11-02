<?php

namespace App\Domain\Marketing\Support;

/**
 * Normalises and hashes match keys for advertising platforms.
 *
 * Meta's Conversions API requires SHA-256 hashed customer information, and requires
 * the value to be normalised first (lower-cased, trimmed, punctuation removed) or the
 * hash will not match. Nothing here is reversible, and raw values never leave the
 * server — see docs/marketing/SECURITY.md §5.
 */
final class MatchHasher
{
    public static function hash(?string $value): ?string
    {
        $normalised = self::normalise($value);

        return $normalised === null ? null : hash('sha256', $normalised);
    }

    public static function normalise(?string $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $value = mb_strtolower(trim($value));

        return $value === '' ? null : $value;
    }

    public static function email(?string $email): ?string
    {
        return self::hash($email);
    }

    /** Digits only, with any leading plus or zero-width punctuation removed. */
    public static function phone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone);

        if (! is_string($digits) || $digits === '') {
            return null;
        }

        return self::hash($digits);
    }

    /** Single name part: letters only. */
    public static function name(?string $name): ?string
    {
        if ($name === null) {
            return null;
        }

        $letters = preg_replace('/[^\p{L}\p{N}]+/u', '', $name);

        return is_string($letters) && $letters !== '' ? self::hash($letters) : null;
    }

    /** City or country: letters only, no spaces or punctuation. */
    public static function place(?string $place): ?string
    {
        return self::name($place);
    }

    /**
     * Split a display name into hashed first and last parts.
     *
     * @return array{fn: ?string, ln: ?string}
     */
    public static function splitName(?string $fullName): array
    {
        $parts = preg_split('/\s+/', trim((string) $fullName), 2) ?: [];

        return [
            'fn' => self::name($parts[0] ?? null),
            'ln' => self::name($parts[1] ?? null),
        ];
    }
}
