<?php

namespace App\Domain\Demo;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Auditing\AuditLogger;
use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Demo\Purge\DemoPurgePlan;
use App\Domain\Demo\Steps\BackofficeStep;
use App\Domain\Demo\Steps\CustomerStep;
use App\Domain\Demo\Steps\DemoStep;
use App\Domain\Demo\Steps\FinalizeStep;
use App\Domain\Demo\Steps\MenuStep;
use App\Domain\Demo\Steps\SalesDayStep;
use App\Domain\Demo\Steps\StockStep;
use App\Domain\Demo\Steps\TeamStep;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Orders\Models\OrderSequence;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Subscriptions\Models\UsageRecord;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Drives demo generation and removal.
 *
 * Generation runs one step per call so it can be driven from the browser with
 * visible progress (and resumed after a failure); every created row is traced
 * in the ledger, which is what makes removal exact.
 */
class DemoDataService
{
    public const MIN_DAYS = 3;

    public const DEFAULT_DAYS = 3;

    public const MAX_DAYS = 30;

    public function __construct(
        protected DemoRecorder $recorder,
        protected DemoContext $context,
        protected AuditLogger $audit,
    ) {}

    /**
     * Fixed steps in run order. The per-day sales steps are appended from the
     * batch's frozen day plan.
     *
     * @return list<class-string<DemoStep>>
     */
    protected function stepClasses(): array
    {
        return [
            TeamStep::class,
            StockStep::class,
            MenuStep::class,
            CustomerStep::class,
        ];
    }

    /** @return list<DemoStep> */
    public function stepsFor(DemoDataBatch $batch): array
    {
        $steps = [];

        foreach ($this->stepClasses() as $class) {
            $steps[] = app($class);
        }

        // One step per simulated trading day (frozen at start, so a run that
        // crosses midnight keeps a stable list of steps).
        foreach ((array) $batch->ref('day_plan', []) as $date) {
            $steps[] = new SalesDayStep((string) $date);
        }

        $steps[] = app(BackofficeStep::class);
        $steps[] = app(FinalizeStep::class);

        return $steps;
    }

    public function latest(Tenant $tenant, bool $includeRemoved = false): ?DemoDataBatch
    {
        return DemoDataBatch::query()
            ->where('tenant_id', $tenant->getKey())
            ->when(
                ! $includeRemoved,
                fn ($query) => $query->where('status', '!=', DemoDataBatch::STATUS_REMOVED),
            )
            ->latest('id')
            ->first();
    }

    /**
     * Start a run (or return the one already in progress).
     */
    public function start(Tenant $tenant, ?User $actor = null, ?int $days = null): DemoDataBatch
    {
        $days = max(self::MIN_DAYS, min(self::MAX_DAYS, $days ?? self::DEFAULT_DAYS));

        if ($existing = $this->latest($tenant)) {
            // A failed run resumes where it stopped rather than starting a
            // second run over the same tenant.
            return $existing->status === DemoDataBatch::STATUS_FAILED
                ? $this->resume($existing)
                : $existing;
        }

        $primary = $tenant->branches()->orderByDesc('is_primary')->orderBy('id')->first();

        if (! $primary) {
            throw ValidationException::withMessages([
                'demo' => 'Create a branch before setting up demo data.',
            ]);
        }

        // Idempotent provisioning: units, payment methods and the bank account
        // are normally created at registration, but a tenant created by another
        // route (platform admin, import) must also be able to run the demo.
        app(ProvisionInventoryDefaults::class)->forTenant($tenant);
        app(ProvisionPaymentDefaults::class)->forTenant($tenant);
        app(ProvisionAccountingDefaults::class)->forTenant($tenant);

        $batch = DemoDataBatch::create([
            'tenant_id' => $tenant->getKey(),
            'user_id' => $actor?->getKey(),
            'status' => DemoDataBatch::STATUS_PENDING,
            'days' => $days,
            'started_at' => now(),
        ]);

        $batch->mergeRefs([
            'branches' => ['primary' => $primary->getKey()],
            'units' => $tenant->units()->pluck('id', 'code')->all(),
            'day_plan' => $this->dayPlan($tenant, $days),
            'settings_backup' => $this->applyDemoSettings($tenant, DemoProfile::for($tenant)),
        ]);

        // Order numbering is a monotonic counter that removal never resets, so a
        // tenant with real orders must continue above the highest number already
        // in use — otherwise a regenerated demo would collide with them.
        $this->syncOrderSequences($tenant);

        $batch->forceFill(['steps_total' => count($this->stepsFor($batch))])->save();

        $this->audit->log('demo.generation_started', $tenant, [
            'days' => $days,
            'steps' => $batch->steps_total,
        ], $actor, $tenant->getKey());

        return $batch;
    }

    /**
     * Run the next pending step. Returns the refreshed batch — when every step
     * is done the batch is marked completed.
     */
    public function runNextStep(DemoDataBatch $batch): DemoDataBatch
    {
        if (! $batch->isActive()) {
            return $batch;
        }

        $next = null;

        foreach ($this->stepsFor($batch) as $step) {
            if (! $batch->isStepDone($step->key())) {
                $next = $step;

                break;
            }
        }

        if ($next === null) {
            return $this->complete($batch);
        }

        $this->context->begin($batch);
        $batch->forceFill([
            'status' => DemoDataBatch::STATUS_RUNNING,
            'current_step' => $next->key(),
            'error' => null,
        ])->save();

        try {
            $counters = $next->run(new DemoRun($batch));

            $this->recorder->flush();

            $batch->incrementCounts($counters);

            $done = array_values(array_unique([...($batch->completed_steps ?? []), $next->key()]));

            $batch->forceFill([
                'completed_steps' => $done,
                'steps_done' => count($done),
                'current_step' => null,
            ])->save();
        } catch (\Throwable $e) {
            // Keep everything already created; the step is retry-safe, so the
            // owner can resume from where it stopped.
            $this->recorder->flush();

            $batch->forceFill([
                'status' => DemoDataBatch::STATUS_FAILED,
                'current_step' => null,
                'error' => mb_substr($e->getMessage(), 0, 1000),
            ])->save();

            throw $e;
        } finally {
            $this->context->end();
        }

        return $batch->refresh();
    }

    /**
     * Resume a failed run: clear the error and make the batch active again.
     */
    public function resume(DemoDataBatch $batch): DemoDataBatch
    {
        $batch->forceFill([
            'status' => DemoDataBatch::STATUS_PENDING,
            'error' => null,
        ])->save();

        return $batch;
    }

    protected function complete(DemoDataBatch $batch): DemoDataBatch
    {
        $batch->forceFill([
            'status' => DemoDataBatch::STATUS_COMPLETED,
            'current_step' => null,
            'completed_at' => $batch->completed_at ?? now(),
        ])->save();

        $this->audit->log('demo.generation_completed', $batch->tenant, [
            'days' => $batch->days,
            'records' => DemoDataRecord::query()->where('batch_id', $batch->getKey())->count(),
            'counts' => $batch->counts,
        ], null, $batch->tenant_id);

        return $batch;
    }

    /**
     * Everything the UI needs to render demo state.
     *
     * @return array<string, mixed>
     */
    public function state(Tenant $tenant): array
    {
        $batch = $this->latest($tenant, true);
        $profile = DemoProfile::for($tenant);

        if (! $batch) {
            return [
                'status' => 'none',
                'has_data' => false,
                'currency' => $profile->currency(),
                'days' => self::DEFAULT_DAYS,
            ];
        }

        $next = null;

        if ($batch->isActive()) {
            foreach ($this->stepsFor($batch) as $step) {
                if (! $batch->isStepDone($step->key())) {
                    $next = $step;

                    break;
                }
            }
        }

        return [
            'status' => $batch->status,
            'has_data' => $batch->status !== DemoDataBatch::STATUS_REMOVED,
            'batch_id' => $batch->getKey(),
            'days' => $batch->days,
            'steps_total' => $batch->steps_total,
            'steps_done' => $batch->steps_done,
            'percent' => $batch->progressPercent(),
            'next_label' => $next?->label(),
            'counts' => $batch->counts ?? [],
            'error' => $batch->error,
            'records' => $batch->status === DemoDataBatch::STATUS_REMOVED
                ? 0
                : DemoDataRecord::query()->where('batch_id', $batch->getKey())->count(),
            'currency' => $profile->currency(),
            'profile' => $profile->locale(),
            'started_at' => $batch->started_at?->toIso8601String(),
            'completed_at' => $batch->completed_at?->toIso8601String(),
            'removed_at' => $batch->removed_at?->toIso8601String(),
        ];
    }

    /**
     * Remove every row the tenant's demo batches created.
     *
     * Rows are deleted children-first in chunks, and each class's ledger rows
     * are removed in the same transaction — so an interrupted purge can simply
     * be run again without deleting anything twice.
     *
     * @return array{batches: int, records: int}
     */
    public function purge(Tenant $tenant, ?User $actor = null): array
    {
        $batches = DemoDataBatch::query()
            ->where('tenant_id', $tenant->getKey())
            ->where('status', '!=', DemoDataBatch::STATUS_REMOVED)
            ->get();

        if ($batches->isEmpty()) {
            return ['batches' => 0, 'records' => 0];
        }

        $running = $batches->first(fn (DemoDataBatch $batch) => $batch->status === DemoDataBatch::STATUS_RUNNING
            && $batch->updated_at?->gt(now()->subMinutes(30)));

        if ($running) {
            throw ValidationException::withMessages([
                'demo' => 'Demo data is still being generated. Wait for it to finish, then remove it.',
            ]);
        }

        $ledger = DemoDataRecord::query()->where('tenant_id', $tenant->getKey());

        // A batch can exist with nothing generated yet (the owner removed the
        // data before the first step ran). There is nothing to delete, but the
        // run's state must still go — otherwise the workspace keeps claiming a
        // demo build is on its way.
        $deleted = 0;
        $batchIds = $batches->pluck('id')->all();
        $demoUserIds = DemoDataRecord::query()
            ->whereIn('batch_id', $batchIds)
            ->where('model_type', (new User)->getMorphClass())
            ->pluck('model_id')
            ->all();

        foreach (DemoPurgePlan::models() as $model) {
            $type = (new $model)->getMorphClass();

            $ids = DemoDataRecord::query()
                ->whereIn('batch_id', $batchIds)
                ->where('model_type', $type)
                ->pluck('model_id')
                ->map(fn ($id) => (int) $id)
                ->all();

            if ($ids === []) {
                continue;
            }

            foreach (array_chunk($ids, 500) as $chunk) {
                DB::transaction(function () use ($model, $type, $chunk, $batchIds) {
                    $query = $model::query()->withoutGlobalScopes()->whereIn('id', $chunk);

                    DemoPurgePlan::usesSoftDeletes($model)
                        ? $query->forceDelete()
                        : $query->delete();

                    DemoDataRecord::query()
                        ->whereIn('batch_id', $batchIds)
                        ->where('model_type', $type)
                        ->whereIn('model_id', $chunk)
                        ->delete();
                });

                $deleted += count($chunk);
            }
        }

        // Anything left in the ledger is not covered by the plan: drop the rows
        // so a re-generated demo starts from a clean slate.
        (clone $ledger)->delete();

        if ($demoUserIds !== []) {
            DB::table('notifications')
                ->where('notifiable_type', (new User)->getMorphClass())
                ->whereIn('notifiable_id', $demoUserIds)
                ->delete();
        }

        // Notifications raised about demo activity would otherwise survive as
        // links to records that no longer exist. Only touched when there really
        // was demo data, so a pending run never sweeps real notifications.
        $startedAt = $batches->min('started_at');

        if ($deleted > 0 && $startedAt !== null) {
            DB::table('notifications')
                ->where('notifiable_type', (new User)->getMorphClass())
                ->whereIn('notifiable_id', $tenant->users()->pluck('id'))
                ->where('created_at', '>=', $startedAt)
                ->delete();

            // Usage snapshots taken while demo data existed would otherwise
            // report inflated limits forever.
            UsageRecord::query()->withoutGlobalScopes()
                ->where('tenant_id', $tenant->getKey())
                ->where('recorded_at', '>=', $startedAt)
                ->delete();
        }

        foreach ($batches as $batch) {
            $batch->forceFill([
                'status' => DemoDataBatch::STATUS_REMOVED,
                'removed_at' => now(),
                'current_step' => null,
            ])->save();
        }

        $this->restoreDemoSettings($tenant, $batches);

        $this->audit->log('demo.data_purged', $tenant, [
            'batches' => $batches->count(),
            'records' => $deleted,
        ], $actor, $tenant->getKey());

        return ['batches' => $batches->count(), 'records' => $deleted];
    }

    /**
     * Lift the per-branch order counter to at least the highest number already
     * in use. Removal never deletes the counter (numbers must stay monotonic),
     * but a tenant whose counter is missing or behind must still be able to
     * generate without colliding with a real order.
     */
    protected function syncOrderSequences(Tenant $tenant): void
    {
        foreach ($tenant->branches()->get() as $branch) {
            $highest = DB::table('orders')
                ->where('branch_id', $branch->getKey())
                ->pluck('order_number')
                ->map(function ($number) {
                    $number = (string) $number;
                    $position = strrpos($number, '-');
                    $tail = $position === false ? $number : substr($number, $position + 1);

                    return ctype_digit($tail) ? (int) $tail : 0;
                })
                ->max() ?? 0;

            if ($highest < 1) {
                continue;
            }

            $sequence = OrderSequence::query()->withoutGlobalScopes()->firstOrCreate(
                ['tenant_id' => $tenant->getKey(), 'branch_id' => $branch->getKey()],
                ['last_number' => 0],
            );

            if ((int) $sequence->last_number < $highest) {
                $sequence->forceFill(['last_number' => $highest])->save();
            }
        }
    }

    /**
     * Recent runs, newest first — shown on the Demo data tab for transparency
     * about what was generated and when it was removed.
     *
     * @return list<array<string, mixed>>
     */
    public function history(Tenant $tenant, int $limit = 6): array
    {
        return DemoDataBatch::query()
            ->where('tenant_id', $tenant->getKey())
            ->latest('id')
            ->limit($limit)
            ->get()
            ->map(fn (DemoDataBatch $batch) => [
                'id' => $batch->getKey(),
                'status' => $batch->status,
                'days' => $batch->days,
                'steps_done' => $batch->steps_done,
                'steps_total' => $batch->steps_total,
                'counts' => $batch->counts ?? [],
                'error' => $batch->error,
                'started_at' => $batch->started_at?->toIso8601String(),
                'completed_at' => $batch->completed_at?->toIso8601String(),
                'removed_at' => $batch->removed_at?->toIso8601String(),
            ])
            ->all();
    }

    /**
     * Settings the demo needs in order to be meaningful (loyalty accrual, a
     * low-stock threshold, a waste approval threshold). The previous values are
     * kept on the batch so removal can put them back.
     *
     * @return array<string, mixed>
     */
    protected function applyDemoSettings(Tenant $tenant, DemoProfile $profile): array
    {
        $keys = [
            'loyalty.enabled',
            'loyalty.points_per_currency',
            'inventory.low_stock_threshold',
            'waste.approval_threshold',
        ];

        $backup = [];

        foreach ($keys as $key) {
            $backup[$key] = $tenant->getSetting($key);
        }

        $tenant->mergeSettings([
            'loyalty.enabled' => true,
            'loyalty.points_per_currency' => 1,
            'inventory.low_stock_threshold' => $profile->lowStockThreshold(),
            'waste.approval_threshold' => $profile->wasteApprovalThreshold(),
        ]);

        $tenant->save();

        return $backup;
    }

    /**
     * @param  Collection<int, DemoDataBatch>  $batches
     */
    protected function restoreDemoSettings(Tenant $tenant, $batches): void
    {
        $backup = [];

        foreach ($batches as $batch) {
            foreach ((array) $batch->ref('settings_backup', []) as $key => $value) {
                $backup[$key] = $value;
            }
        }

        if ($backup === []) {
            return;
        }

        $tenant->mergeSettings($backup);
        $tenant->save();
    }

    /**
     * The dates to generate, frozen at start so a run that crosses midnight
     * keeps a stable step list.
     *
     * @return list<string>
     */
    protected function dayPlan(Tenant $tenant, int $days): array
    {
        $timezone = $tenant->getSetting('region.timezone') ?? config('app.timezone');
        $today = now($timezone)->startOfDay();

        $plan = [];

        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $plan[] = $today->copy()->subDays($offset)->toDateString();
        }

        return $plan;
    }
}
