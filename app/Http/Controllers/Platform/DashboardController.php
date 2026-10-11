<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\Subscription;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(): Response
    {
        $subscriptions = Subscription::withoutGlobalScopes()->with('plan')->get();

        $mrr = $subscriptions
            ->filter(fn (Subscription $s) => $s->status === SubscriptionStatus::Active)
            ->sum(function (Subscription $s) {
                $price = (float) $s->plan?->price_monthly;

                return $s->billing_cycle->value === 'yearly' ? round($price, 2) : $price;
            });

        $recent = Tenant::query()->with(['subscription.plan'])->latest('id')->limit(8)->get()
            ->map(fn (Tenant $tenant) => [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'status' => $tenant->status->value,
                'plan' => $tenant->subscription?->plan?->name,
                'subscription_status' => $tenant->subscription?->status->value,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/Dashboard', [
            'kpis' => [
                ['label' => 'Tenants', 'value' => Tenant::count()],
                ['label' => 'Active tenants', 'value' => Tenant::where('status', TenantStatus::Active->value)->count()],
                ['label' => 'Trialing', 'value' => $subscriptions->where('status', SubscriptionStatus::Trialing)->count()],
                ['label' => 'Suspended', 'value' => Tenant::where('status', TenantStatus::Suspended->value)->count()],
                ['label' => 'Active users', 'value' => User::whereNotNull('tenant_id')->count()],
                ['label' => 'MRR', 'value' => round($mrr, 2)],
                ['label' => 'Plans', 'value' => Plan::where('is_active', true)->count()],
            ],
            'health' => [
                'failed_jobs' => DB::table('failed_jobs')->count(),
                'queued_jobs' => DB::table('jobs')->count(),
                'db' => 'ok',
            ],
            'recentTenants' => $recent,
        ]);
    }
}
