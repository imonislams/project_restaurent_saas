<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Marketing\Analytics\AttributionService;
use App\Domain\Marketing\Analytics\MarketingAnalyticsService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Growth analytics screens: the funnel, revenue attribution, and the customer
 * acquisition / retention / efficiency view.
 *
 * One period filter drives all of them, and every money figure arrives grouped by
 * currency from the service — the controller never adds currencies together.
 */
class GrowthController extends Controller
{
    public const PRESETS = ['today', 'yesterday', '7d', '30d', '90d', '12m'];

    public function __construct(
        protected MarketingAnalyticsService $analytics,
        protected AttributionService $attribution,
    ) {}

    public function funnel(Request $request): Response
    {
        $period = $this->period($request);

        return Inertia::render('Platform/Marketing/Growth/Funnel', [
            'period' => $this->periodProps($request, $period),
            'funnel' => $this->analytics->funnel($period),
            'methodology' => $this->analytics->methodology(),
        ]);
    }

    public function attribution(Request $request): Response
    {
        $period = $this->period($request);

        return Inertia::render('Platform/Marketing/Growth/Attribution', [
            'period' => $this->periodProps($request, $period),
            'attribution' => $this->analytics->attribution($period),
            'window_days' => $this->attribution->windowDays(),
            'headline_model' => $this->attribution->model()->value,
            'methodology' => $this->analytics->methodology(),
        ]);
    }

    public function customers(Request $request): Response
    {
        $period = $this->period($request);

        return Inertia::render('Platform/Marketing/Growth/Customers', [
            'period' => $this->periodProps($request, $period),
            'acquisition' => $this->analytics->acquisition($period),
            'subscriptions' => $this->analytics->subscriptions($period),
            'retention' => $this->analytics->retention($period),
            'lifetime' => $this->analytics->lifetimeValue(),
            'efficiency' => $this->analytics->efficiency($period),
            'methodology' => $this->analytics->methodology(),
        ]);
    }

    protected function period(Request $request): PlatformPeriod
    {
        $preset = (string) $request->string('preset');
        $preset = in_array($preset, [...self::PRESETS, 'custom'], true) ? $preset : '90d';

        return PlatformPeriod::make(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $preset === 'custom' ? null : $preset,
        );
    }

    /** @return array<string, string> */
    protected function periodProps(Request $request, PlatformPeriod $period): array
    {
        $preset = (string) $request->string('preset');

        return [
            'preset' => in_array($preset, [...self::PRESETS, 'custom'], true) ? $preset : '90d',
            'from' => $period->localFrom()->toDateString(),
            'to' => $period->localTo()->toDateString(),
            'label' => $period->label,
            'timezone' => $period->timezone,
        ];
    }
}
