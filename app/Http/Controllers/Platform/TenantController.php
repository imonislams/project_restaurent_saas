<?php

namespace App\Http\Controllers\Platform;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Auditing\Models\AuditLog;
use App\Domain\BackupAndRecovery\Models\Backup;
use App\Domain\BackupAndRecovery\Models\BackupRestore;
use App\Domain\Branches\Models\Branch;
use App\Domain\Orders\Models\Order;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Subscriptions\Models\SubscriptionInvoice;
use App\Domain\Subscriptions\Models\UsageRecord;
use App\Domain\Subscriptions\UsageService;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\BulkTenantActionRequest;
use App\Http\Requests\Platform\SuspendTenantRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class TenantController extends Controller
{
    public function __construct(
        protected UsageService $usage,
        protected AuditLogger $audit,
    ) {}

    public function index(Request $request): Response
    {
        $filters = $this->filters($request);

        return Inertia::render('Platform/Tenants/Index', [
            'tenants' => $this->filteredQuery($filters)
                ->with(['subscription.plan'])
                ->withCount(['branches', 'users'])
                ->orderBy($filters['sort'], $filters['direction'])
                ->paginate(25)
                ->withQueryString()
                ->through(fn (Tenant $tenant) => $this->row($tenant)),
            'filters' => $filters,
            'options' => [
                'statuses' => collect(TenantStatus::cases())->map(fn (TenantStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
                'subscription_statuses' => collect(SubscriptionStatus::cases())->map(fn (SubscriptionStatus $s) => ['value' => $s->value, 'label' => $s->label()])->all(),
                'plans' => Plan::query()->orderBy('sort_order')->get()->map(fn (Plan $p) => ['value' => $p->slug, 'label' => $p->name])->all(),
            ],
        ]);
    }

    public function verification(Request $request): Response
    {
        if (! $request->has('verification')) {
            $request->merge(['verification' => 'pending']);
        }

        return $this->index($request);
    }

    public function show(Tenant $tenant): Response
    {
        $tenant->load(['subscription.plan']);

        return Inertia::render('Platform/Tenants/Show', [
            'tenant' => $this->header($tenant),
            'tabs' => [
                'overview' => $this->overviewTab($tenant),
                'subscription' => $this->subscriptionTab($tenant),
                'billing' => $this->billingTab($tenant),
                'usage' => $this->usageTab($tenant),
                'security' => $this->securityTab($tenant),
                'diagnostics' => $this->diagnosticsTab($tenant),
                'backups' => $this->backupsTab($tenant),
            ],
            'plans' => Plan::query()->where('is_active', true)->orderBy('sort_order')->get()
                ->map(fn (Plan $p) => ['id' => $p->getKey(), 'name' => $p->name]),
        ]);
    }

    public function export(Request $request): StreamedResponse
    {
        $filters = $this->filters($request);

        $this->audit->log('platform.tenants_exported', null, [
            'filters' => array_filter($filters, fn ($value) => $value !== '' && $value !== null),
        ], $request->user());

        $query = $this->filteredQuery($filters)
            ->with(['subscription.plan'])
            ->withCount(['branches', 'users'])
            ->orderBy($filters['sort'], $filters['direction']);

        $filename = 'tenants-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($query) {
            $out = fopen('php://output', 'w');
            fputcsv($out, ['ID', 'Name', 'Slug', 'Business email', 'Account status', 'Verified', 'Plan', 'Subscription status', 'Branches', 'Users', 'Created at']);

            $query->chunk(500, function ($tenants) use ($out) {
                foreach ($tenants as $tenant) {
                    fputcsv($out, [
                        $tenant->getKey(),
                        $tenant->name,
                        $tenant->slug,
                        $tenant->business_email,
                        $tenant->status->value,
                        $tenant->isVerified() ? 'yes' : 'no',
                        $tenant->subscription?->plan?->name,
                        $tenant->subscription?->status?->value,
                        $tenant->branches_count,
                        $tenant->users_count,
                        $tenant->created_at?->toIso8601String(),
                    ]);
                }
            });

            fclose($out);
        }, $filename, ['Content-Type' => 'text/csv']);
    }

    public function bulk(BulkTenantActionRequest $request): RedirectResponse
    {
        $data = $request->validated();

        if ($data['action'] === 'suspend' && ! $request->user()->hasPermission('platform.tenants.suspend')) {
            abort(403);
        }

        $tenants = Tenant::query()->whereIn('id', $data['ids'])->get();
        $reason = $data['reason'] ?? null;

        foreach ($tenants as $tenant) {
            $this->applyAction($tenant, $data['action'], $request, $reason);
        }

        return back()->with('success', "Applied '{$data['action']}' to {$tenants->count()} tenant(s).");
    }

    public function verify(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->applyAction($tenant, 'verify', $request, null);

        return back()->with('success', 'Tenant verified.');
    }

    public function suspend(SuspendTenantRequest $request, Tenant $tenant): RedirectResponse
    {
        $this->applyAction($tenant, 'suspend', $request, $request->validated()['reason']);

        return back()->with('success', 'Tenant suspended. Data is retained; access is blocked.');
    }

    public function activate(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->applyAction($tenant, 'activate', $request, null);

        return back()->with('success', 'Tenant reactivated.');
    }

    public function archive(Request $request, Tenant $tenant): RedirectResponse
    {
        $this->applyAction($tenant, 'archive', $request, null);

        return back()->with('success', 'Tenant archived.');
    }

    protected function applyAction(Tenant $tenant, string $action, Request $request, ?string $reason): void
    {
        $actor = $request->user();

        switch ($action) {
            case 'activate':
                $tenant->forceFill(['status' => TenantStatus::Active, 'suspended_at' => null])->save();
                $this->audit->log('platform.tenant_activated', $tenant, $reason ? ['reason' => $reason] : [], $actor, $tenant->getKey());
                break;

            case 'suspend':
                $tenant->forceFill(['status' => TenantStatus::Suspended, 'suspended_at' => now()])->save();
                $this->audit->log('platform.tenant_suspended', $tenant, ['reason' => $reason], $actor, $tenant->getKey());
                break;

            case 'verify':
                $tenant->forceFill(['verified_at' => now()])->save();
                $this->audit->log('platform.tenant_verified', $tenant, [], $actor, $tenant->getKey());
                break;

            case 'archive':
                $tenant->forceFill(['status' => TenantStatus::Archived, 'suspended_at' => null])->save();
                $this->audit->log('platform.tenant_archived', $tenant, [], $actor, $tenant->getKey());
                break;
        }
    }

    /** @param array<string, mixed> $filters */
    protected function filteredQuery(array $filters): Builder
    {
        return Tenant::query()
            ->when($filters['search'] !== '', fn (Builder $q) => $q->where(function (Builder $qq) use ($filters) {
                $like = '%'.$filters['search'].'%';
                $qq->where('name', 'like', $like)
                    ->orWhere('business_email', 'like', $like)
                    ->orWhere('slug', 'like', $like);
            }))
            ->when($filters['status'] !== '', fn (Builder $q) => $q->where('status', $filters['status']))
            ->when($filters['verification'] === 'verified', fn (Builder $q) => $q->whereNotNull('verified_at'))
            ->when($filters['verification'] === 'pending', fn (Builder $q) => $q->whereNull('verified_at'))
            ->when($filters['subscription_status'] !== '', fn (Builder $q) => $q->whereHas('subscription', fn (Builder $s) => $s->where('status', $filters['subscription_status'])))
            ->when($filters['plan'] !== '', fn (Builder $q) => $q->whereHas('subscription.plan', fn (Builder $p) => $p->where('slug', $filters['plan'])))
            ->when($filters['from'] !== '', fn (Builder $q) => $q->whereDate('created_at', '>=', $filters['from']))
            ->when($filters['to'] !== '', fn (Builder $q) => $q->whereDate('created_at', '<=', $filters['to']));
    }

    /** @return array<string, mixed> */
    protected function filters(Request $request): array
    {
        $sortable = ['name', 'created_at', 'branches_count', 'users_count', 'status'];
        $sort = $request->string('sort')->toString();

        return [
            'search' => $request->string('search')->toString(),
            'status' => $request->string('status')->toString(),
            'subscription_status' => $request->string('subscription_status')->toString(),
            'plan' => $request->string('plan')->toString(),
            'verification' => $request->string('verification')->toString(),
            'from' => $request->string('from')->toString(),
            'to' => $request->string('to')->toString(),
            'sort' => in_array($sort, $sortable, true) ? $sort : 'created_at',
            'direction' => $request->string('direction')->toString() === 'asc' ? 'asc' : 'desc',
        ];
    }

    /** @return array<string, mixed> */
    protected function row(Tenant $tenant): array
    {
        return [
            'id' => $tenant->getKey(),
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'business_email' => $tenant->business_email,
            'status' => $tenant->status->value,
            'status_label' => $tenant->status->label(),
            'verified' => $tenant->isVerified(),
            'plan' => $tenant->subscription?->plan?->name,
            'subscription_status' => $tenant->subscription?->status?->value,
            'branches_count' => $tenant->branches_count,
            'users_count' => $tenant->users_count,
            'created_at' => $tenant->created_at?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    protected function header(Tenant $tenant): array
    {
        $subscription = $tenant->subscription;

        return [
            'id' => $tenant->getKey(),
            'name' => $tenant->name,
            'slug' => $tenant->slug,
            'business_email' => $tenant->business_email,
            'status' => $tenant->status->value,
            'status_label' => $tenant->status->label(),
            'verified' => $tenant->isVerified(),
            'verified_at' => $tenant->verified_at?->toIso8601String(),
            'created_at' => $tenant->created_at?->toIso8601String(),
            'suspended_at' => $tenant->suspended_at?->toIso8601String(),
            'trial_ends_at' => $tenant->trial_ends_at?->toIso8601String(),
            'onboarding_completed' => $tenant->hasCompletedOnboarding(),
            'region' => [
                'country' => $tenant->getSetting('region.country'),
                'currency' => $tenant->getSetting('region.currency'),
                'timezone' => $tenant->getSetting('region.timezone'),
            ],
            'subscription' => $subscription ? [
                'id' => $subscription->getKey(),
                'status' => $subscription->status->value,
                'status_label' => $subscription->status->label(),
                'plan' => $subscription->plan?->name,
                'plan_id' => $subscription->plan_id,
                'billing_cycle' => $subscription->billing_cycle->value,
                'trial_ends_at' => $subscription->trial_ends_at?->toIso8601String(),
                'current_period_start' => $subscription->current_period_start?->toIso8601String(),
                'current_period_end' => $subscription->current_period_end?->toIso8601String(),
                'days_remaining' => $subscription->daysRemaining(),
            ] : null,
            'counts' => [
                'branches' => Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
                'users' => $tenant->users()->count(),
                'orders' => Order::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
            ],
        ];
    }

    /** @return array<string, mixed> */
    protected function overviewTab(Tenant $tenant): array
    {
        return [
            'activity' => AuditLog::query()->where('tenant_id', $tenant->getKey())->latest('id')->limit(10)->get()
                ->map(fn (AuditLog $log) => [
                    'action' => $log->action,
                    'user_id' => $log->user_id,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function subscriptionTab(Tenant $tenant): array
    {
        return [
            'limits' => [
                'branches' => $tenant->planLimit('branches'),
                'users' => $tenant->planLimit('users'),
                'orders_this_month' => $tenant->planLimit('orders_this_month'),
            ],
            'history' => AuditLog::query()->where('tenant_id', $tenant->getKey())
                ->where('action', 'like', 'subscription.%')->latest('id')->limit(20)->get()
                ->map(fn (AuditLog $log) => [
                    'action' => $log->action,
                    'metadata' => $log->metadata,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function billingTab(Tenant $tenant): array
    {
        $invoices = SubscriptionInvoice::withoutGlobalScopes()->where('tenant_id', $tenant->getKey());

        return [
            'outstanding' => round((float) (clone $invoices)->where('status', 'open')->sum('amount'), 2),
            'collected' => round((float) (clone $invoices)->where('status', 'paid')->sum('amount'), 2),
            'billing_contact' => [
                'email' => $tenant->getSetting('billing.email', $tenant->business_email),
                'name' => $tenant->getSetting('billing.name'),
            ],
            'invoices' => $invoices->latest('id')->limit(50)->get()->map(fn (SubscriptionInvoice $invoice) => [
                'id' => $invoice->getKey(),
                'number' => $invoice->number,
                'amount' => (float) $invoice->amount,
                'currency' => $invoice->currency,
                'status' => $invoice->status->value,
                'issued_at' => $invoice->issued_at?->toIso8601String(),
                'paid_at' => $invoice->paid_at?->toIso8601String(),
            ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function usageTab(Tenant $tenant): array
    {
        return [
            'metrics' => $this->usage->metrics($tenant),
            'limits' => [
                'branches' => $tenant->planLimit('branches'),
                'users' => $tenant->planLimit('users'),
                'orders_this_month' => $tenant->planLimit('orders_this_month'),
            ],
            'history' => UsageRecord::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())
                ->latest('recorded_at')->limit(30)->get()
                ->map(fn (UsageRecord $record) => [
                    'metric' => $record->metric,
                    'value' => (float) $record->value,
                    'recorded_at' => $record->recorded_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function securityTab(Tenant $tenant): array
    {
        $users = $tenant->users()->get(['id', 'name', 'email', 'status', 'last_login_at']);

        return [
            'users' => $users->map(fn ($user) => [
                'id' => $user->getKey(),
                'name' => $user->name,
                'email' => $user->email,
                'status' => $user->status,
                'last_login_at' => $user->last_login_at?->toIso8601String(),
            ])->all(),
            'active_sessions' => DB::table('sessions')->whereIn('user_id', $users->pluck('id'))->count(),
            'events' => AuditLog::query()->where('tenant_id', $tenant->getKey())->latest('id')->limit(30)->get()
                ->map(fn (AuditLog $log) => [
                    'action' => $log->action,
                    'user_id' => $log->user_id,
                    'ip' => $log->ip_address,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function backupsTab(Tenant $tenant): array
    {
        return [
            'backups' => Backup::query()->where('tenant_id', $tenant->getKey())->latest('id')->limit(20)->get()
                ->map(fn (Backup $backup) => [
                    'id' => $backup->getKey(),
                    'path' => $backup->path,
                    'size' => $backup->humanSize(),
                    'rows_count' => $backup->rows_count,
                    'verification_result' => $backup->verification_result,
                    'verified_at' => $backup->verified_at?->toIso8601String(),
                    'created_at' => $backup->created_at?->toIso8601String(),
                ])->all(),
            'restores' => BackupRestore::query()->where('tenant_id', $tenant->getKey())->latest('id')->limit(10)->get()
                ->map(fn (BackupRestore $restore) => [
                    'id' => $restore->getKey(),
                    'status' => $restore->status->value,
                    'reason' => $restore->reason,
                    'verification_ok' => $restore->verification['ok'] ?? null,
                    'created_at' => $restore->created_at?->toIso8601String(),
                ])->all(),
        ];
    }

    /** @return array<string, mixed> */
    protected function diagnosticsTab(Tenant $tenant): array
    {
        return [
            'config' => [
                'timezone' => $tenant->getSetting('region.timezone'),
                'currency' => $tenant->getSetting('region.currency'),
                'tax_rate' => $tenant->getSetting('tax.rate'),
                'onboarding_step' => $tenant->onboarding_step,
            ],
            'counts' => [
                'branches' => Branch::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
                'orders' => Order::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->count(),
                'open_invoices' => SubscriptionInvoice::withoutGlobalScopes()->where('tenant_id', $tenant->getKey())->where('status', 'open')->count(),
            ],
            // Honest empty state — log correlation arrives with system operations (Phase 6).
            'errors' => [],
            'queue_failures' => [],
            'correlation_id' => null,
        ];
    }
}
