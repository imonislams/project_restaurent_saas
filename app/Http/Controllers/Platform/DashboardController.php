<?php

namespace App\Http\Controllers\Platform;

use App\Domain\PlatformAnalytics\PlatformAnalyticsService;
use App\Domain\PlatformAnalytics\PlatformPeriod;
use App\Domain\PlatformAnalytics\SystemHealth;
use App\Http\Controllers\Controller;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(PlatformAnalyticsService $analytics, SystemHealth $health): Response
    {
        $period = PlatformPeriod::make();

        return Inertia::render('Platform/Dashboard', [
            'kpis' => $analytics->kpis($period),
            'charts' => [
                'revenue_trend' => $analytics->revenueTrend($period),
                'subscription_movement' => $analytics->subscriptionMovement($period),
                'tenant_growth' => $analytics->tenantGrowth($period),
                'revenue_by_plan' => $analytics->revenueByPlan($period),
                'subscriptions_by_status' => $analytics->subscriptionsByStatus(),
            ],
            'health' => $health->indicators(),
            'healthSummary' => $health->summary(),
            'recentTenants' => $analytics->recentTenants(8),
            'activity' => $analytics->recentActivity(12),
            'currency' => $analytics->currency(),
            'methodology' => $analytics->methodology(),
            'period' => [
                'label' => $period->label,
                'from' => $period->localFrom()->toDateString(),
                'to' => $period->localTo()->toDateString(),
            ],
        ]);
    }
}
