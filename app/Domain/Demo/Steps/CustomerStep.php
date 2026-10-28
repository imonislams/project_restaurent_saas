<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Customers\Models\Customer;
use App\Domain\Demo\DemoRun;

/**
 * The guest book. Regulars are weighted so repeat visits build the RFM
 * segmentation and loyalty balances the reports and customer pages rely on.
 */
class CustomerStep implements DemoStep
{
    protected const CUSTOMER_COUNT = 38;

    public function key(): string
    {
        return 'customers';
    }

    public function label(): string
    {
        return 'Customers & loyalty';
    }

    public function run(DemoRun $run): array
    {
        $tenantId = $run->batch->tenant_id;
        $definitions = $run->profile()->customers(self::CUSTOMER_COUNT, $run->random('customers'));

        $refs = [];

        foreach ($definitions as $definition) {
            $customer = Customer::query()->withoutGlobalScopes()
                ->where('tenant_id', $tenantId)
                ->where('phone', $definition['phone'])
                ->first();

            if (! $customer) {
                $customer = Customer::create([
                    'tenant_id' => $tenantId,
                    'name' => $definition['name'],
                    'phone' => $definition['phone'],
                    'email' => $definition['email'],
                    'notes' => $definition['notes'],
                    'tags' => $definition['tags'],
                    'is_active' => true,
                    'is_marketing_opt_in' => $definition['marketing'],
                ]);
            }

            $refs[] = [
                'id' => $customer->getKey(),
                'name' => $customer->name,
                'weight' => $definition['weight'],
            ];
        }

        $run->putRefs(['customers' => $refs]);

        return ['customers' => count($refs)];
    }
}
