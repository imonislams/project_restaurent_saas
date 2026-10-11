<?php

namespace App\Domain\Payments\Actions;

use App\Domain\Payments\Enums\PaymentMethodType;
use App\Domain\Tenancy\Models\Tenant;

/**
 * Seeds the default payment methods for a tenant so the POS is usable
 * immediately. Tenants can add, rename or disable methods later.
 */
class ProvisionPaymentDefaults
{
    /** @var list<array{name: string, code: string, type: string, sort: int}> */
    protected const METHODS = [
        ['name' => 'Cash', 'code' => 'cash', 'type' => 'cash', 'sort' => 1],
        ['name' => 'Card', 'code' => 'card', 'type' => 'card', 'sort' => 2],
        ['name' => 'Mobile', 'code' => 'mobile', 'type' => 'mobile', 'sort' => 3],
    ];

    public function forTenant(Tenant $tenant): void
    {
        if ($tenant->paymentMethods()->exists()) {
            return;
        }

        foreach (self::METHODS as $method) {
            $tenant->paymentMethods()->create([
                'name' => $method['name'],
                'code' => $method['code'],
                'type' => PaymentMethodType::from($method['type']),
                'is_active' => true,
                'sort_order' => $method['sort'],
            ]);
        }
    }
}
