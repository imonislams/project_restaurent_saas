<?php

namespace Tests\Feature\Reporting;

use App\Domain\Reporting\ReportPeriod;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ReportPeriodTest extends TestCase
{
    private function period(string $from, string $to, ?string $preset): ReportPeriod
    {
        return new ReportPeriod(
            Carbon::parse($from, 'Asia/Dhaka'),
            Carbon::parse($to, 'Asia/Dhaka'),
            null,
            'Asia/Dhaka',
            $preset,
        );
    }

    public function test_today_preset_compares_against_yesterday(): void
    {
        $previous = $this->period('2026-10-20 00:00:00', '2026-10-20 23:59:59', 'today')->previous();

        $this->assertSame('2026-10-19', $previous->from->toDateString());
        $this->assertSame('2026-10-19', $previous->to->toDateString());
    }

    public function test_week_preset_compares_against_the_previous_monday_to_sunday(): void
    {
        // 2026-10-19 is a Monday; the previous week is 12th–18th October.
        $previous = $this->period('2026-10-19 00:00:00', '2026-10-21 23:59:59', 'week')->previous();

        $this->assertSame('2026-10-12', $previous->from->toDateString());
        $this->assertSame('2026-10-18', $previous->to->toDateString());
    }

    public function test_month_preset_compares_against_the_whole_previous_month(): void
    {
        $previous = $this->period('2026-10-01 00:00:00', '2026-10-24 23:59:59', 'month')->previous();

        $this->assertSame('2026-09-01', $previous->from->toDateString());
        $this->assertSame('2026-09-30', $previous->to->toDateString());
    }

    public function test_custom_window_compares_against_an_equal_length_window(): void
    {
        $previous = $this->period('2026-10-01 00:00:00', '2026-10-07 23:59:59', null)->previous();

        $this->assertSame('2026-09-24', $previous->from->toDateString());
        $this->assertSame('2026-09-30', $previous->to->toDateString());
    }
}
