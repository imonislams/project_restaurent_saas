<?php

namespace App\Http\Controllers\Platform\Marketing;

use App\Domain\Marketing\MarketingOverviewService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The Marketing & Growth dashboard.
 *
 * Every figure comes from the tables this platform actually holds. When a source
 * has no data the metric renders as an honest zero, or as "not available" with its
 * reason — never as a substituted value.
 */
class DashboardController extends Controller
{
    /** Period presets offered by the dashboard, mirroring PlatformPeriod. */
    public const PRESETS = ['today', 'yesterday', '7d', '30d', '90d', '12m'];

    public function __construct(protected MarketingOverviewService $overview) {}

    public function index(Request $request): Response
    {
        $preset = (string) $request->string('preset');
        $preset = in_array($preset, [...self::PRESETS, 'custom'], true) ? $preset : '30d';

        $period = PlatformPeriod::make(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $preset === 'custom' ? null : $preset,
        );

        return Inertia::render('Platform/Marketing/Dashboard', [
            'period' => [
                'preset' => $preset,
                'from' => $period->localFrom()->toDateString(),
                'to' => $period->localTo()->toDateString(),
                'label' => $period->label,
                'timezone' => $period->timezone,
            ],
            'presets' => self::PRESETS,
            'blocks' => $this->overview->blocks($period),
            'trend' => $this->overview->trend($period),
            'tracking' => $this->overview->tracking(),
            'methodology' => $this->overview->methodology(),
        ]);
    }
}
