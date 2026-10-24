<?php

namespace App\Domain\Subscriptions;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Subscriptions\Enums\SubscriptionStatus;
use App\Domain\Subscriptions\Models\Plan;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Plan administration. Plans are versioned — editing a plan bumps its version,
 * and existing subscriptions keep their captured terms.
 */
class PlanService
{
    public function __construct(protected AuditLogger $audit) {}

    /** @param array<string, mixed> $data */
    public function create(array $data, User $actor): Plan
    {
        return DB::transaction(function () use ($data, $actor) {
            $prices = $data['prices'] ?? [];
            $gateways = $data['gateways'] ?? [];
            unset($data['prices'], $data['gateways']);

            $data['version'] = 1;
            $plan = Plan::create($data);

            $this->syncPrices($plan, $prices);
            $plan->gateways()->sync($gateways);

            $this->audit->log('platform.plan_created', $plan, ['name' => $plan->name], $actor);

            return $plan->fresh('prices');
        });
    }

    /** @param array<string, mixed> $data */
    public function update(Plan $plan, array $data, User $actor): Plan
    {
        return DB::transaction(function () use ($plan, $data, $actor) {
            $prices = $data['prices'] ?? null;
            $gateways = $data['gateways'] ?? null;
            unset($data['prices'], $data['gateways']);

            // Any substantive change bumps the version so new terms are explicit.
            $data['version'] = $plan->version + 1;

            $plan->update($data);

            if (is_array($prices)) {
                $this->syncPrices($plan, $prices);
            }

            if (is_array($gateways)) {
                $plan->gateways()->sync($gateways);
            }

            $this->forgetTenantEntitlements($plan);

            $this->audit->log('platform.plan_updated', $plan, ['version' => $plan->version], $actor);

            return $plan->fresh('prices');
        });
    }

    public function archive(Plan $plan, User $actor): Plan
    {
        $plan->forceFill(['archived_at' => now(), 'is_active' => false])->save();

        $this->audit->log('platform.plan_archived', $plan, [], $actor);

        return $plan;
    }

    public function delete(Plan $plan, User $actor): void
    {
        $count = $this->subscriptionCount($plan);

        if ($count > 0) {
            throw ValidationException::withMessages([
                'plan' => "This plan has {$count} subscription(s) and cannot be deleted. Archive it instead.",
            ]);
        }

        $this->audit->log('platform.plan_deleted', $plan, ['name' => $plan->name], $actor);
        $plan->delete();
    }

    public function subscriptionCount(Plan $plan): int
    {
        return DB::table('subscriptions')->where('plan_id', $plan->getKey())->count();
    }

    /**
     * @param  list<array{currency: string, interval: string, price: float|int|string}>  $prices
     */
    public function syncPrices(Plan $plan, array $prices): void
    {
        $normalised = [];

        foreach ($prices as $price) {
            if (! isset($price['currency'], $price['interval'])) {
                continue;
            }

            $providerPrices = collect($price['provider_prices'] ?? [])
                ->map(fn ($value) => array_filter((array) $value, fn ($v) => $v !== null && $v !== ''))
                ->filter()
                ->all();

            $normalised[strtoupper($price['currency']).'|'.$price['interval']] = [
                'currency' => strtoupper($price['currency']),
                'interval' => $price['interval'],
                'price' => $price['price'] ?? 0,
                'provider_prices' => $providerPrices === [] ? null : $providerPrices,
            ];
        }

        // Replace the price set with exactly what was submitted.
        $plan->prices()->whereNotIn('currency', array_column($normalised, 'currency'))->delete();

        foreach ($normalised as $entry) {
            $plan->prices()->updateOrCreate(
                ['currency' => $entry['currency'], 'interval' => $entry['interval']],
                ['price' => $entry['price'], 'provider_prices' => $entry['provider_prices']],
            );
        }
    }

    protected function forgetTenantEntitlements(Plan $plan): void
    {
        DB::table('subscriptions')->where('plan_id', $plan->getKey())->pluck('tenant_id')
            ->each(fn ($tenantId) => Tenant::forgetEntitlementCache((int) $tenantId));
    }

    /** @return list<string> */
    public static function liveStatuses(): array
    {
        return [
            SubscriptionStatus::Trialing->value,
            SubscriptionStatus::Active->value,
            SubscriptionStatus::PastDue->value,
            SubscriptionStatus::GracePeriod->value,
        ];
    }
}
