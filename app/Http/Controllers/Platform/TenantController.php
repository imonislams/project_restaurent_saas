<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Auditing\Models\AuditLog;
use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\Order;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class TenantController extends Controller
{
    public function __construct(
        protected UsageService $usage,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $search = $request->string('search')->toString();

        $tenants = Tenant::query()
            ->with(['subscription.plan'])
            ->withCount(['branches', 'users'])
            ->when($search !== '', fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('business_email', 'like', "%{$search}%"))
            ->latest('id')
            ->paginate(25)
            ->withQueryString()
            ->through(fn (Tenant $tenant) => [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'business_email' => $tenant->business_email,
                'status' => $tenant->status->value,
                'plan' => $tenant->subscription?->plan?->name,
                'subscription_status' => $tenant->subscription?->status->value,
                'branches_count' => $tenant->branches_count,
                'users_count' => $tenant->users_count,
                'created_at' => $tenant->created_at?->toIso8601String(),
            ]);

        return Inertia::render('Platform/Tenants/Index', [
            'tenants' => $tenants,
            'filters' => ['search' => $search],
        ]);
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load(['subscription.plan']);

        return Inertia::render('Platform/Tenants/Show', [
            'tenant' => [
                'id' => $tenant->getKey(),
                'name' => $tenant->name,
                'slug' => $tenant->slug,
                'business_email' => $tenant->business_email,
                'status' => $tenant->status->value,
                'created_at' => $tenant->created_at?->toIso8601String(),
                'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
                'region' => [
                    'country' => $tenant->getSetting('region.country'),
                    'currency' => $tenant->getSetting('region.currency'),
                    'timezone' => $tenant->getSetting('region.timezone'),
                ],
            ],
            'subscription' => $tenant->subscription ? [
                'id' => $tenant->subscription->getKey(),
                'status' => $tenant->subscription->status->value,
                'status_label' => $tenant->subscription->status->label(),
                'plan' => $tenant->subscription->plan?->name,
                'plan_id' => $tenant->subscription->plan_id,
                'billing_cycle' => $tenant->subscription->billing_cycle->value,
                'trial_ends_at' => $tenant->subscription->trial_ends_at?->toIso8601String(),
                'current_period_end' => $tenant->subscription->current_period_end?->toIso8601String(),
                'days_remaining' => $tenant->subscription->daysRemaining(),
                'invoices' => $tenant->subscription->invoices()->latest('id')->limit(10)->get()->map(fn ($invoice) => [
                    'number' => $invoice->number,
                    'amount' => (float) $invoice->amount,
                    'status' => $invoice->status->value,
                    'paid_at' => $invoice->paid_at?->toIso8601String(),
                ]),
            ] : null,
            'usage' => $this->usage->metrics($tenant),
            'limits' => [
                'branches' => $tenant->planLimit('branches'),
                'users' => $tenant->planLimit('users'),
                'orders_this_month' => $tenant->planLimit('orders_this_month'),
            ],
            'plans' => Plan::where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn ($p) => ['id' => $p->getKey(), 'name' => $p->name]),
            'stats' => [
                'branches' => Branch::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count(),
                'orders' => Order::withoutGlobalScopes()->where('tenant_id', $tenant->id)->count(),
            ],
            'recentActivity' => AuditLog::query()->where('tenant_id', $tenant->id)->latest('id')->limit(15)->get()
                ->map(fn (AuditLog $log) => [
                    'action' => $log->action,
                    'created_at' => $log->created_at?->toIso8601String(),
                    'user_id' => $log->user_id,
                ]),
        ]);
    }

    public function activate(Request $request, Tenant $tenant): RedirectResponse
    {
        $tenant->forceFill(['status' => TenantStatus::Active, 'suspended_at' => null])->save();
        $this->audit->log('platform.tenant_activated', $tenant, [], $request->user(), $tenant->getKey());

        return back()->with('success', 'Tenant activated.');
    }

    public function suspend(Request $request, Tenant $tenant): RedirectResponse
    {
        $tenant->forceFill(['status' => TenantStatus::Suspended, 'suspended_at' => now()])->save();
        $this->audit->log('platform.tenant_suspended', $tenant, [], $request->user(), $tenant->getKey());

        return back()->with('success', 'Tenant suspended.');
    }
}
