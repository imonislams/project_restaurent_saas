<?php

namespace App\Http\Controllers\Platform;

use App\Domain\PlatformAnalytics\PlatformAnalyticsService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AnalyticsController extends Controller
{
    public function index(Request $request, PlatformAnalyticsService $analytics): Response
    {
        $period = PlatformPeriod::make(
            $request->string('from')->toString() ?: null,
            $request->string('to')->toString() ?: null,
            $request->string('preset')->toString() ?: null,
        );

        return Inertia::render('Platform/RevenueAnalytics', [
            'kpis' => $analytics->kpis($period),
            'charts' => [
                'revenue_trend' => $analytics->revenueTrend($period),
                'subscription_movement' => $analytics->subscriptionMovement($period),
                'tenant_growth' => $analytics->tenantGrowth($period),
                'revenue_by_plan' => $analytics->revenueByPlan($period),
                'subscriptions_by_status' => $analytics->subscriptionsByStatus(),
            ],
            'currency' => $analytics->currency(),
            'methodology' => $analytics->methodology(),
            'period' => [
                'label' => $period->label,
                'from' => $period->localFrom()->toDateString(),
                'to' => $period->localTo()->toDateString(),
                'preset' => $request->string('preset')->toString() ?: null,
            ],
        ]);
    }
}
