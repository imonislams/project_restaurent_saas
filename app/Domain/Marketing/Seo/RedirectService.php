<?php

namespace App\Domain\Marketing\Seo;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Marketing\Models\MarketingRedirect;
use App\Models\User;

/**
 * Redirect management with loop detection.
 *
 * A redirect is validated on save *and* again when it is followed, and the chain is
 * walked with a depth guard both times. An operator who later adds a second redirect
 * can therefore create a cycle only by having it rejected, and a chain that somehow
 * becomes circular is refused at request time instead of hanging the browser.
 */
class RedirectService
{
    /** Longest chain we will store or follow. */
    public const MAX_CHAIN = 5;

    public function __construct(protected AuditLogger $audit) {}

    /**
     * @param  array<string, mixed>  $data
     * @return array{errors: array<string, string>, chain: list<string>}
     */
    public function validate(array $data, ?int $ignoreId = null): array
    {
        $errors = [];

        $from = MarketingRedirect::normalisePath((string) ($data['from_path'] ?? ''));
        $to = trim((string) ($data['to_url'] ?? ''));
        $code = (int) ($data['status_code'] ?? 301);

        if ($from === '' || $from === '/') {
            $errors['from_path'] = 'Enter the path to redirect, for example /old-page.';
        }

        if ($to === '') {
            $errors['to_url'] = 'Enter where it should go.';
        } elseif (! $this->isValidTarget($to)) {
            $errors['to_url'] = 'Use an absolute http(s) URL, or a path beginning with /.';
        }

        if (! in_array($code, MarketingRedirect::STATUS_CODES, true)) {
            $errors['status_code'] = 'Choose 301, 302, 307 or 308.';
        }

        if ($from !== '' && $from === $to) {
            $errors['to_url'] = 'A redirect cannot point at itself.';
        }

        $duplicate = MarketingRedirect::query()
            ->where('from_path', $from)
            ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($duplicate) {
            $errors['from_path'] = 'Another redirect already starts at '.$from.'.';
        }

        if ($to !== '' && $this->isValidTarget($to)) {
            $chain = $this->follow($from, $to, $ignoreId);

            if ($chain['loop']) {
                $errors['to_url'] = 'That would create a loop: '.implode(' → ', $chain['path']).'.';
            } elseif (count($chain['path']) > self::MAX_CHAIN) {
                $errors['to_url'] = 'That chain is '.count($chain['path']).' hops long. Keep it under '.self::MAX_CHAIN.': '
                    .implode(' → ', $chain['path']).'.';
            }
        }

        return ['errors' => $errors, 'chain' => $this->isValidTarget($to) ? $this->follow($from, $to, $ignoreId)['path'] : [$from]];
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(array $data, ?User $actor = null): MarketingRedirect
    {
        $redirect = MarketingRedirect::create([
            'from_path' => MarketingRedirect::normalisePath((string) $data['from_path']),
            'to_url' => trim((string) $data['to_url']),
            'status_code' => (int) ($data['status_code'] ?? 301),
            'is_active' => (bool) ($data['is_active'] ?? true),
            'notes' => $data['notes'] ?? null,
            'created_by' => $actor?->getKey(),
        ]);

        $this->audit->log('marketing.redirect_created', $redirect, [
            'from' => $redirect->from_path,
            'to' => $redirect->to_url,
            'status' => $redirect->status_code,
        ], $actor);

        return $redirect;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(MarketingRedirect $redirect, array $data, ?User $actor = null): MarketingRedirect
    {
        $before = ['from' => $redirect->from_path, 'to' => $redirect->to_url, 'status' => $redirect->status_code];

        $redirect->forceFill([
            'from_path' => MarketingRedirect::normalisePath((string) $data['from_path']),
            'to_url' => trim((string) $data['to_url']),
            'status_code' => (int) ($data['status_code'] ?? 301),
            'is_active' => (bool) ($data['is_active'] ?? true),
            'notes' => $data['notes'] ?? null,
        ])->save();

        $this->audit->logChange('marketing.redirect_updated', $redirect, $before, [
            'from' => $redirect->from_path,
            'to' => $redirect->to_url,
            'status' => $redirect->status_code,
        ], $actor);

        return $redirect;
    }

    public function delete(MarketingRedirect $redirect, ?User $actor = null): void
    {
        $this->audit->log('marketing.redirect_deleted', $redirect, [
            'from' => $redirect->from_path,
        ], $actor);

        $redirect->delete();
    }

    /**
     * Find the redirect for a path, following the chain to its final destination.
     *
     * @return array{redirect: MarketingRedirect, to: string, code: int, hops: int}|null
     */
    public function resolve(string $path): ?array
    {
        $cursor = MarketingRedirect::normalisePath($path);
        $visited = [];
        $first = null;
        $code = 302;

        for ($hop = 0; $hop <= self::MAX_CHAIN; $hop++) {
            $row = MarketingRedirect::query()
                ->active()
                ->where('from_path', $cursor)
                ->first();

            if ($row === null) {
                break;
            }

            // A cycle that reached the database is refused at runtime rather than followed.
            if (in_array($row->from_path, $visited, true)) {
                return null;
            }

            $visited[] = $row->from_path;
            $first ??= $row;
            $code = $row->status_code;

            if (! $this->isInternal($row->to_url)) {
                return ['redirect' => $first, 'to' => $row->to_url, 'code' => $code, 'hops' => count($visited)];
            }

            $cursor = MarketingRedirect::normalisePath($row->to_url);
        }

        if ($first === null) {
            return null;
        }

        return ['redirect' => $first, 'to' => $cursor, 'code' => $code, 'hops' => count($visited)];
    }

    public function recordHit(MarketingRedirect $redirect): void
    {
        $redirect->forceFill([
            'hits' => $redirect->hits + 1,
            'last_hit_at' => now(),
        ])->save();
    }

    /**
     * @return array{created: int, updated: int, skipped: int, errors: list<string>}
     */
    public function importCsv(string $csv, ?User $actor = null): array
    {
        $created = 0;
        $updated = 0;
        $skipped = 0;
        $errors = [];

        $lines = preg_split('/\R/', trim($csv)) ?: [];
        $header = null;

        foreach ($lines as $index => $line) {
            $line = trim($line);

            if ($line === '') {
                continue;
            }

            $cells = array_map('trim', str_getcsv($line));

            if ($header === null) {
                $header = array_map('strtolower', $cells);

                continue;
            }

            $row = array_combine(
                array_slice($header, 0, count($cells)),
                array_slice($cells, 0, count($header)),
            ) ?: [];

            $payload = [
                'from_path' => $row['from_path'] ?? $row['from'] ?? '',
                'to_url' => $row['to_url'] ?? $row['to'] ?? '',
                'status_code' => (int) ($row['status_code'] ?? $row['status'] ?? 301),
            ];

            $existing = MarketingRedirect::query()
                ->where('from_path', MarketingRedirect::normalisePath($payload['from_path']))
                ->first();

            $validation = $this->validate($payload, $existing?->getKey());

            if ($validation['errors'] !== []) {
                $skipped++;
                $errors[] = 'Row '.($index + 1).': '.implode(' ', $validation['errors']);

                continue;
            }

            if ($existing !== null) {
                $this->update($existing, $payload, $actor);
                $updated++;
            } else {
                $this->create($payload, $actor);
                $created++;
            }
        }

        return ['created' => $created, 'updated' => $updated, 'skipped' => $skipped, 'errors' => $errors];
    }

    public function exportCsv(): string
    {
        $rows = ['from_path,to_url,status_code,is_active,hits'];

        foreach (MarketingRedirect::query()->orderBy('from_path')->get() as $redirect) {
            $rows[] = implode(',', [
                $this->csvCell($redirect->from_path),
                $this->csvCell($redirect->to_url),
                $redirect->status_code,
                $redirect->is_active ? '1' : '0',
                $redirect->hits,
            ]);
        }

        return implode("\n", $rows)."\n";
    }

    public function isValidTarget(string $target): bool
    {
        return $this->isInternal($target) || preg_match('#^https?://#i', $target) === 1;
    }

    public function isInternal(string $target): bool
    {
        return str_starts_with($target, '/');
    }

    /**
     * Walk the chain a new redirect would create.
     *
     * @return array{loop: bool, path: list<string>}
     */
    protected function follow(string $from, string $to, ?int $ignoreId): array
    {
        $path = [$from];
        $cursor = $to;

        for ($hop = 0; $hop < 20; $hop++) {
            if (! $this->isInternal($cursor)) {
                return ['loop' => false, 'path' => $path];
            }

            $normalised = MarketingRedirect::normalisePath($cursor);

            if (in_array($normalised, $path, true)) {
                $path[] = $normalised;

                return ['loop' => true, 'path' => $path];
            }

            $path[] = $normalised;

            $next = MarketingRedirect::query()
                ->where('from_path', $normalised)
                ->where('is_active', true)
                ->when($ignoreId !== null, fn ($query) => $query->whereKeyNot($ignoreId))
                ->first();

            if ($next === null) {
                return ['loop' => false, 'path' => $path];
            }

            $cursor = $next->to_url;
        }

        return ['loop' => false, 'path' => $path];
    }

    protected function csvCell(string $value): string
    {
        return '"'.str_replace('"', '""', $value).'"';
    }
}
