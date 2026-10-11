<?php

namespace Database\Seeders;

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Single restaurant, core POS and reporting.',
                'price_monthly' => 29,
                'price_yearly' => 290,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'reports'],
                'limits' => ['branches' => 1, 'users' => 5, 'orders_this_month' => 1000],
                'sort_order' => 1,
            ],
            [
                'name' => 'Growth',
                'slug' => 'growth',
                'description' => 'Multi-branch operations with inventory and purchasing.',
                'price_monthly' => 79,
                'price_yearly' => 790,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'inventory', 'purchasing', 'waste', 'accounts', 'reports'],
                'limits' => ['branches' => 3, 'users' => 25, 'orders_this_month' => 10000],
                'sort_order' => 2,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'Unlimited branches and users, all modules.',
                'price_monthly' => 199,
                'price_yearly' => 1990,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'inventory', 'purchasing', 'waste', 'transfers', 'accounts', 'reports'],
                'limits' => ['branches' => null, 'users' => null, 'orders_this_month' => null],
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            Plan::withTrashed()->updateOrCreate(
                ['slug' => $plan['slug']],
                $plan + ['is_active' => true, 'deleted_at' => null],
            );
        }
    }
}
