<?php

namespace App\Domain\Marketing;

/**
 * Builds campaign URLs that keep whatever is already in the address.
 *
 * The common mistake is replacing the query string, which silently drops a tracking
 * parameter or a filter a visitor was carrying. Every existing parameter is preserved
 * unless the builder is explicitly setting that exact key.
 */
class UtmBuilder
{
    /** @var list<string> */
    public const PARAMETERS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

    /**
     * @param  array<string, string|null>  $params
     */
    public function build(string $url, array $params): string
    {
        $url = trim($url);

        if ($url === '') {
            return '';
        }

        [$base, $existing] = $this->split($url);

        $merged = $existing;

        foreach (self::PARAMETERS as $key) {
            $value = trim((string) ($params[$key] ?? ''));

            if ($value !== '') {
                $merged[$key] = $value;
            }
        }

        return $merged === [] ? $base : $base.'?'.http_build_query($merged);
    }

    /**
     * @return array{0: string, 1: array<string, string>}
     */
    public function split(string $url): array
    {
        $parts = parse_url($url);

        if ($parts === false) {
            return [$url, []];
        }

        $scheme = isset($parts['scheme']) ? $parts['scheme'].'://' : '';
        $host = $parts['host'] ?? '';
        $port = isset($parts['port']) ? ':'.$parts['port'] : '';
        $path = $parts['path'] ?? '';
        $fragment = isset($parts['fragment']) ? '#'.$parts['fragment'] : '';

        $query = [];

        if (isset($parts['query'])) {
            parse_str($parts['query'], $query);
        }

        /** @var array<string, string> $query */
        $query = array_map(fn ($value) => is_array($value) ? implode(',', $value) : (string) $value, $query);

        return [$scheme.$host.$port.$path, $query];
    }

    /** @return array<string, string> */
    public function existingParameters(string $url): array
    {
        return $this->split($url)[1];
    }

    public function validate(string $url): ?string
    {
        $url = trim($url);

        if ($url === '') {
            return 'Enter the URL you want to track.';
        }

        if (! preg_match('#^https?://#i', $url)) {
            return 'Use a full URL beginning with http:// or https://.';
        }

        return filter_var($url, FILTER_VALIDATE_URL) === false ? 'That does not look like a valid URL.' : null;
    }
}
