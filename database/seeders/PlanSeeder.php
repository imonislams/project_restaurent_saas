<?php

namespace Database\Seeders;

use App\Domain\Subscriptions\Enums\PlanRegion;
use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Seeder;

/**
 * Seeds both regional pricing ladders:
 *
 *  - International (USD): starter / growth / business
 *  - Bangladesh   (BDT): starter-bd / growth-bd / business-bd
 *
 * Amounts are seed defaults the platform admin can edit in
 * Platform Configuration → Plans. Existing subscriptions keep their captured
 * terms; re-running the seeder only updates these plan rows.
 */
class PlanSeeder extends Seeder
{
    public function run(): void
    {
        // Shared tier attributes (features + limits) used by both ladders.
        $tiers = [
            'starter' => [
                'name' => 'Starter',
                'description' => 'Single restaurant, core POS and reporting.',
                'features' => ['pos', 'kitchen', 'reports'],
                'limits' => ['branches' => 1, 'users' => 5, 'orders_this_month' => 1000],
                'sort_order' => 1,
            ],
            'growth' => [
                'name' => 'Growth',
                'description' => 'Multi-branch operations with inventory and purchasing.',
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'qr_dining', 'inventory', 'purchasing', 'waste', 'accounts', 'reports'],
                'limits' => ['branches' => 3, 'users' => 25, 'orders_this_month' => 10000],
                'sort_order' => 2,
            ],
            'business' => [
                'name' => 'Business',
                'description' => 'Unlimited branches and users, all modules.',
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'qr_dining', 'inventory', 'purchasing', 'waste', 'transfers', 'accounts', 'reports'],
                'limits' => ['branches' => null, 'users' => null, 'orders_this_month' => null],
                'sort_order' => 3,
            ],
        ];

        $ladders = [
            PlanRegion::International->value => [
                'currency' => 'USD',
                'suffix' => '',
                'featured' => 'growth',
                'prices' => [
                    'starter' => ['monthly' => 29, 'yearly' => 290],
                    'growth' => ['monthly' => 79, 'yearly' => 790],
                    'business' => ['monthly' => 199, 'yearly' => 1990],
                ],
            ],
            PlanRegion::Bangladesh->value => [
                'currency' => 'BDT',
                'suffix' => '-bd',
                'featured' => 'growth',
                'prices' => [
                    'starter' => ['monthly' => 1500, 'yearly' => 15000],
                    'growth' => ['monthly' => 3500, 'yearly' => 35000],
                    'business' => ['monthly' => 7500, 'yearly' => 75000],
                ],
            ],
        ];

        foreach ($ladders as $region => $ladder) {
            foreach ($tiers as $key => $tier) {
                $slug = $key.$ladder['suffix'];
                $price = $ladder['prices'][$key];

                $plan = Plan::withTrashed()->updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => $tier['name'],
                        'description' => $tier['description'],
                        'currency' => $ladder['currency'],
                        'price_monthly' => $price['monthly'],
                        'price_yearly' => $price['yearly'],
                        'trial_days' => 14,
                        'features' => $tier['features'],
                        'limits' => $tier['limits'],
                        'is_active' => true,
                        'visibility' => 'public',
                        'region' => $region,
                        'is_featured' => $key === $ladder['featured'],
                        'sort_order' => $tier['sort_order'],
                        'deleted_at' => null,
                    ],
                );

                // Deterministic seed: this plan is priced only in its region currency.
                $plan->prices()->where('currency', '!=', $ladder['currency'])->delete();

                foreach (['monthly', 'yearly'] as $interval) {
                    $plan->prices()->updateOrCreate(
                        ['currency' => $ladder['currency'], 'interval' => $interval],
                        ['price' => $price[$interval]],
                    );
                }
            }
        }
    }
}
