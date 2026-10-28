<?php

namespace App\Domain\Demo;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Accounting\Models\FinancialAccount;
use App\Domain\Branches\Models\Branch;
use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\Data\DemoRandom;
use App\Domain\Demo\Models\DemoDataBatch;
use App\Domain\Demo\Models\DemoDataRecord;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Inventory\Enums\StockMovementReason;
use App\Domain\Inventory\Models\StockLocation;
use App\Domain\Inventory\Models\StockMovement;
use App\Domain\Payments\Models\PaymentMethod;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * Per-step context handed to every demo step.
 *
 * A step runs in its own request, so nothing may be carried in memory between
 * steps: ids of already-created records live in the batch's `refs`, and the
 * ledger answers "everything this batch has created so far".
 */
final class DemoRun
{
    protected ?Tenant $tenant = null;

    protected ?DemoProfile $profile = null;

    /** @var array<string, User> */
    protected array $staff = [];

    /** @var array<string, PaymentMethod> */
    protected array $paymentMethods = [];

    public function __construct(public readonly DemoDataBatch $batch) {}

    public function tenant(): Tenant
    {
        if ($this->tenant !== null) {
            return $this->tenant;
        }

        // Reuse the instance held by the request/command context when it is the
        // same tenant: services read settings (tax rate, confirmation mode) from
        // that instance, so a second copy would go stale as soon as a step
        // changes a setting.
        $context = app(TenantContext::class);
        $existing = $context->has() ? $context->tenant() : null;

        if ($existing !== null && $existing->getKey() === $this->batch->tenant_id) {
            return $this->tenant = $existing;
        }

        $this->tenant = Tenant::query()->findOrFail($this->batch->tenant_id);
        $context->set($this->tenant);

        return $this->tenant;
    }

    public function profile(): DemoProfile
    {
        return $this->profile ??= DemoProfile::for($this->tenant());
    }

    /** Deterministic randomness, stable across retries of the same step. */
    public function random(string $salt): DemoRandom
    {
        return new DemoRandom((int) crc32($this->batch->getKey().'|'.$salt));
    }

    public function ref(string $key, mixed $default = null): mixed
    {
        return data_get($this->batch->refs, $key, $default);
    }

    /** @param array<string, mixed> $values */
    public function putRefs(array $values): void
    {
        $this->batch->mergeRefs($values);
        $this->batch->save();
    }

    /**
     * Ids of everything this batch created of a model type — read from the
     * ledger, so it also sees rows created by the domain services.
     *
     * @param  class-string<Model>  $model
     * @return list<int>
     */
    public function createdIds(string $model, ?int $batchId = null): array
    {
        app(DemoRecorder::class)->flush();

        return DemoDataRecord::query()
            ->where('batch_id', $batchId ?? $this->batch->getKey())
            ->where('model_type', (new $model)->getMorphClass())
            ->pluck('model_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /**
     * @param  class-string<Model>  $model
     * @return Collection<int, Model>
     */
    public function created(string $model): Collection
    {
        $ids = $this->createdIds($model);

        if ($ids === []) {
            return new Collection;
        }

        return $model::query()->withoutGlobalScopes()->whereIn('id', $ids)->get();
    }

    public function branch(string $key = 'primary'): Branch
    {
        return Branch::query()->withoutGlobalScopes()->findOrFail((int) $this->ref('branches.'.$key));
    }

    public function user(string $key): User
    {
        return $this->staff[$key] ??= User::query()->findOrFail((int) $this->ref('staff.'.$key));
    }

    public function paymentMethod(string $code): PaymentMethod
    {
        return $this->paymentMethods[$code] ??= PaymentMethod::query()
            ->withoutGlobalScopes()
            ->where('tenant_id', $this->batch->tenant_id)
            ->where('code', $code)
            ->firstOrFail();
    }

    /** The branch's default stock location (provisioned on demand). */
    public function location(Branch $branch): StockLocation
    {
        return app(ProvisionInventoryDefaults::class)->defaultLocationFor($branch);
    }

    /** The branch's cash account (provisioned on demand). */
    public function cashAccount(Branch $branch): FinancialAccount
    {
        return app(ProvisionAccountingDefaults::class)->cashAccountFor($branch);
    }

    /** Record a model the automatic tenant-scoped hook cannot see (users, roles). */
    public function remember(Model $model): void
    {
        app(DemoRecorder::class)->remember($model);
    }

    /**
     * Whether opening stock is already recorded for an item — re-running a
     * failed step must never double the pantry.
     */
    public function hasOpeningStock(Model $stockable): bool
    {
        return StockMovement::query()->withoutGlobalScopes()
            ->where('stockable_type', $stockable->getMorphClass())
            ->where('stockable_id', $stockable->getKey())
            ->where('reason', StockMovementReason::Opening->value)
            ->exists();
    }

    public function uniqueSlug(string $model, string $name): string
    {
        $usesTrashed = in_array(SoftDeletes::class, class_uses_recursive($model), true);
        $base = Str::slug($name) ?: 'item';
        $slug = $base;
        $suffix = 1;

        while ($this->rowExists($model, 'slug', $slug, $usesTrashed)) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }

    public function uniqueSku(string $model, string $sku): string
    {
        $usesTrashed = in_array(SoftDeletes::class, class_uses_recursive($model), true);
        $candidate = $sku;
        $suffix = 1;

        while ($this->rowExists($model, 'sku', $candidate, $usesTrashed)) {
            $candidate = $sku.'-'.(++$suffix);
        }

        return $candidate;
    }

    /** @param  class-string<Model>  $model */
    protected function rowExists(string $model, string $column, string $value, bool $usesTrashed): bool
    {
        $query = $model::query()->withoutGlobalScopes()
            ->where('tenant_id', $this->batch->tenant_id)
            ->where($column, $value);

        if ($usesTrashed) {
            $query->withTrashed();
        }

        return $query->exists();
    }
}
