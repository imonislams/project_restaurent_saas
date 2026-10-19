<?php

namespace App\Http\Controllers\QrDining;

use App\Domain\Dining\QrAnalyticsService;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * QR dining analytics for authorised tenant users.
 */
class QrAnalyticsController extends Controller
{
    public function index(Request $request): Response
    {
        $user = $request->user();
        $tenant = $user->tenant;
        $accessible = $user->accessibleBranchIds();

        $from = $request->date('from')?->startOfDay() ?? now()->subDays(29)->startOfDay();
        $to = $request->date('to')?->endOfDay() ?? now()->endOfDay();
        $requested = $request->integer('branch_id') ?: null;
        $branchId = $requested !== null && in_array($requested, $accessible, true) ? $requested : null;

        return Inertia::render('QrDining/Analytics', [
            'analytics' => app(QrAnalyticsService::class)->forPeriod($tenant, $from, $to, $branchId),
            'branches' => \App\Domain\Branches\Models\Branch::query()
                ->whereIn('id', $accessible)->orderBy('name')->get()
                ->map(fn ($b) => ['id' => $b->getKey(), 'name' => $b->name]),
        ]);
    }
}
