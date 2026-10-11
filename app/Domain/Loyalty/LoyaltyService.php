<?php

namespace App\Domain\Loyalty;

use App\Domain\Auditing\AuditLogger;
use App\Domain\Customers\Models\Customer;
use App\Domain\Loyalty\Enums\LoyaltyTransactionType;
use App\Domain\Loyalty\Models\LoyaltyAccount;
use App\Domain\Loyalty\Models\LoyaltyTransaction;
use App\Domain\Orders\Models\Order;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Loyalty points ledger. Points are earned/redeemed as signed, append-only
 * transactions; the account balance is updated in the same transaction.
 */
class LoyaltyService
{
    public function __construct(protected AuditLogger $audit) {}

    public function enabled(Tenant $tenant): bool
    {
        return (bool) $tenant->getSetting('loyalty.enabled', false);
    }

    public function accountFor(Customer $customer): LoyaltyAccount
    {
        return LoyaltyAccount::firstOrCreate(
            ['customer_id' => $customer->getKey()],
            ['tenant_id' => $customer->tenant_id, 'points_balance' => 0],
        );
    }

    public function earn(Customer $customer, int $points, ?Model $source = null, ?string $reason = null, ?User $by = null): LoyaltyTransaction
    {
        return $this->post($customer, LoyaltyTransactionType::Earn, abs($points), $reason ?? 'Points earned', $source, $by);
    }

    public function redeem(Customer $customer, int $points, ?Model $source = null, ?User $by = null): LoyaltyTransaction
    {
        return $this->post($customer, LoyaltyTransactionType::Redeem, -abs($points), 'Points redeemed', $source, $by);
    }

    public function adjust(Customer $customer, int $points, string $reason, ?User $by = null): LoyaltyTransaction
    {
        return $this->post($customer, LoyaltyTransactionType::Adjust, $points, $reason, null, $by);
    }

    /** Award points for a completed order (if loyalty is enabled and a customer is attached). */
    public function earnForOrder(Order $order): ?LoyaltyTransaction
    {
        $tenant = $order->tenant;

        if (! $tenant || ! $this->enabled($tenant) || ! $order->customer_id) {
            return null;
        }

        $rate = (float) ($tenant->getSetting('loyalty.points_per_currency', 1) ?? 1);
        $points = (int) floor((float) $order->total * $rate);

        if ($points <= 0) {
            return null;
        }

        $customer = Customer::query()->find($order->customer_id);

        return $customer ? $this->earn($customer, $points, $order, 'Order '.$order->order_number) : null;
    }

    protected function post(Customer $customer, LoyaltyTransactionType $type, int $points, string $reason, ?Model $source, ?User $by): LoyaltyTransaction
    {
        return DB::transaction(function () use ($customer, $type, $points, $reason, $source, $by) {
            $account = $this->accountFor($customer);

            $newBalance = $account->points_balance + $points;

            if ($newBalance < 0) {
                throw ValidationException::withMessages([
                    'points' => 'Insufficient loyalty points for this customer.',
                ]);
            }

            $account->forceFill(['points_balance' => $newBalance])->save();

            $transaction = LoyaltyTransaction::create([
                'tenant_id' => $customer->tenant_id,
                'loyalty_account_id' => $account->getKey(),
                'type' => $type,
                'points' => $points,
                'reason' => $reason,
                'source_type' => $source?->getMorphClass(),
                'source_id' => $source?->getKey(),
                'created_by' => $by?->getKey(),
            ]);

            $this->audit->log('loyalty.'.$type->value, $transaction, [
                'customer' => $customer->name,
                'points' => $points,
                'balance' => $newBalance,
            ], $by, $customer->tenant_id);

            return $transaction;
        });
    }
}
