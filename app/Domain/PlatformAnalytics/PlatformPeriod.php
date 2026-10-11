<?php

namespace App\Domain\PlatformAnalytics;

use Illuminate\Support\Carbon;

/**
 * A reporting window for platform metrics, expressed in the platform reporting
 * timezone. Queries run against UTC-stored timestamps, so bounds are converted.
 */
class PlatformPeriod
{
    public function __construct(
        public Carbon $fromUtc,
        public Carbon $toUtc,
        public string $timezone,
        public string $label,
    ) {}

    public static function make(?string $from = null, ?string $to = null, ?string $preset = null): self
    {
        $tz = config('platform.reporting_timezone', 'UTC');

        if ($preset !== null && $preset !== '') {
            [$start, $end, $label] = self::resolvePreset($preset, $tz);
        } else {
            $start = $from ? Carbon::parse($from, $tz)->startOfDay() : Carbon::now($tz)->subMonthsNoOverflow(11)->startOfMonth();
            $end = $to ? Carbon::parse($to, $tz)->endOfDay() : Carbon::now($tz)->endOfDay();
            $label = $from || $to ? 'Custom range' : 'Last 12 months';
        }

        if ($end->lessThan($start)) {
            [$start, $end] = [$end->copy()->startOfDay(), $start->copy()->endOfDay()];
        }

        return new self($start->copy()->utc(), $end->copy()->utc(), $tz, $label);
    }

    /** @return array{0: Carbon, 1: Carbon, 2: string} */
    protected static function resolvePreset(string $preset, string $tz): array
    {
        $now = Carbon::now($tz);
        $today = $now->copy()->startOfDay();

        return match ($preset) {
            'today' => [$today, $now->copy()->endOfDay(), 'Today'],
            '7d' => [$today->copy()->subDays(6), $now->copy()->endOfDay(), 'Last 7 days'],
            '30d' => [$today->copy()->subDays(29), $now->copy()->endOfDay(), 'Last 30 days'],
            'month' => [$now->copy()->startOfMonth(), $now->copy()->endOfDay(), 'This month'],
            'prev_month' => [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->startOfMonth()->subSecond(), 'Previous month'],
            'quarter' => [$now->copy()->startOfQuarter(), $now->copy()->endOfDay(), 'This quarter'],
            'year' => [$now->copy()->startOfYear(), $now->copy()->endOfDay(), 'This year'],
            default => [$now->copy()->subMonthsNoOverflow(11)->startOfMonth(), $now->copy()->endOfDay(), 'Last 12 months'],
        };
    }

    public function localFrom(): Carbon
    {
        return $this->fromUtc->copy()->setTimezone($this->timezone);
    }

    public function localTo(): Carbon
    {
        return $this->toUtc->copy()->setTimezone($this->timezone);
    }

    /** Month key (Y-m) for a UTC timestamp, in local time. */
    public function monthKey(Carbon $utc): string
    {
        return $utc->copy()->setTimezone($this->timezone)->format('Y-m');
    }

    /** @return list<string> Month keys spanning the period, inclusive. */
    public function monthKeys(): array
    {
        $keys = [];
        $cursor = $this->localFrom()->copy()->startOfMonth();
        $end = $this->localTo()->copy()->startOfMonth();

        while ($cursor->lessThanOrEqualTo($end)) {
            $keys[] = $cursor->format('Y-m');
            $cursor->addMonthNoOverflow();
        }

        return $keys;
    }

    /** Human label for a month key (e.g. 2026-10 => Oct 2026). */
    public static function monthLabel(string $key): string
    {
        return Carbon::createFromFormat('Y-m', $key)->format('M Y');
    }
}
