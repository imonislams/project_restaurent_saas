<?php

namespace App\Domain\Reporting;

use App\Domain\Branches\Models\Branch;
use App\Domain\Tenancy\Models\Tenant;
use Illuminate\Support\Carbon;

/**
 * A reporting window expressed in the tenant/branch timezone. Queries run
 * against UTC-stored timestamps, so the range is converted to UTC.
 */
class ReportPeriod
{
    public function __construct(
        public Carbon $from,
        public Carbon $to,
        public ?int $branchId,
        public string $timezone,
        public ?string $preset = null,
    ) {}

    public static function make(?string $from, ?string $to, ?int $branchId, Tenant $tenant, ?Branch $branch = null): self
    {
        $timezone = $branch?->effectiveTimezone()
            ?? $tenant->getSetting('region.timezone')
            ?? config('app.timezone');

        $start = ($from ? Carbon::parse($from, $timezone) : Carbon::now($timezone))->startOfDay();
        $end = ($to ? Carbon::parse($to, $timezone) : Carbon::now($timezone))->endOfDay();

        return new self($start, $end, $branchId, $timezone);
    }

    /**
     * Build a window from a named preset (today|week|month). Any other value
     * falls back to today. Weeks start on Monday and every boundary is
     * resolved in the tenant/branch timezone.
     */
    public static function forPreset(string $preset, ?int $branchId, Tenant $tenant, ?Branch $branch = null): self
    {
        $timezone = $branch?->effectiveTimezone()
            ?? $tenant->getSetting('region.timezone')
            ?? config('app.timezone');

        $now = Carbon::now($timezone);

        [$from, $to] = match ($preset) {
            'week' => [$now->copy()->startOfWeek(Carbon::MONDAY)->startOfDay(), $now->copy()->endOfDay()],
            'month' => [$now->copy()->startOfMonth()->startOfDay(), $now->copy()->endOfDay()],
            default => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
        };

        $key = in_array($preset, ['today', 'week', 'month'], true) ? $preset : 'today';

        return new self($from, $to, $branchId, $timezone, $key);
    }

    /**
     * The equivalent window immediately before this one, used for period-over-
     * period comparison. Preset windows align to the previous day/week/month;
     * custom windows use the same length rounded to whole days.
     */
    public function previous(): self
    {
        if ($this->preset === 'week') {
            $from = $this->from->copy()->subWeek()->startOfWeek(Carbon::MONDAY);
            $to = $from->copy()->endOfWeek(Carbon::SUNDAY)->endOfDay();

            return new self($from, $to, $this->branchId, $this->timezone, 'week');
        }

        if ($this->preset === 'month') {
            $from = $this->from->copy()->subMonthNoOverflow()->startOfMonth();
            $to = $from->copy()->endOfMonth()->endOfDay();

            return new self($from, $to, $this->branchId, $this->timezone, 'month');
        }

        if ($this->preset === 'today') {
            $from = $this->from->copy()->subDay()->startOfDay();

            return new self($from, $from->copy()->endOfDay(), $this->branchId, $this->timezone, 'today');
        }

        // Count whole days (from/to are start/end of day) so the comparison
        // window is the same length as this one, not one day longer.
        $days = (int) round($this->from->copy()->startOfDay()->diffInDays($this->to->copy()->startOfDay())) + 1;
        $to = $this->from->copy()->subSecond();
        $from = $to->copy()->startOfDay()->subDays($days - 1)->startOfDay();

        return new self($from, $to, $this->branchId, $this->timezone);
    }

    public function utcStart(): Carbon
    {
        return $this->from->copy()->utc();
    }

    public function utcEnd(): Carbon
    {
        return $this->to->copy()->utc();
    }

    /** Local (tenant) date key for a UTC timestamp, used for day grouping. */
    public function localDate(Carbon $utc): string
    {
        return $utc->copy()->setTimezone($this->timezone)->toDateString();
    }

    /** @return list<string> */
    public function localDates(): array
    {
        $dates = [];
        $cursor = $this->from->copy()->setTimezone($this->timezone)->startOfDay();
        $end = $this->to->copy()->setTimezone($this->timezone)->startOfDay();

        while ($cursor->lte($end)) {
            $dates[] = $cursor->toDateString();
            $cursor->addDay();
        }

        return $dates;
    }
}
