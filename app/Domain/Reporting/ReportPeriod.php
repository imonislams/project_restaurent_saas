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
