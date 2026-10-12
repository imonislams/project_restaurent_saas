<?php

namespace Database\Seeders;

use App\Domain\Subscriptions\Models\Plan;
use Illuminate\Database\Seeder;

class PlanSeeder extends Seeder
{
    public function run(): void
    {
        $platformCurrency = 'USD';
        try {
            $settings = app(\App\Domain\PlatformSettings\PlatformSettings::class);
            $platformCurrency = (string) (
                $settings->get('billing.default_currency')
                ?? $settings->get('general.default_currency')
                ?? config('platform.reporting_currency', 'USD')
            );
        } catch (\Throwable $e) {
            $platformCurrency = config('platform.reporting_currency', 'USD');
        }

        $plans = [
            [
                'name' => 'Starter',
                'slug' => 'starter',
                'description' => 'Single restaurant, core POS and reporting.',
                'currency' => $platformCurrency,
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
                'currency' => $platformCurrency,
                'price_monthly' => 79,
                'price_yearly' => 790,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'qr_dining', 'inventory', 'purchasing', 'waste', 'accounts', 'reports'],
                'limits' => ['branches' => 3, 'users' => 25, 'orders_this_month' => 10000],
                'sort_order' => 2,
            ],
            [
                'name' => 'Business',
                'slug' => 'business',
                'description' => 'Unlimited branches and users, all modules.',
                'currency' => $platformCurrency,
                'price_monthly' => 199,
                'price_yearly' => 1990,
                'trial_days' => 14,
                'features' => ['pos', 'kitchen', 'tables', 'menu', 'qr_dining', 'inventory', 'purchasing', 'waste', 'transfers', 'accounts', 'reports'],
                'limits' => ['branches' => null, 'users' => null, 'orders_this_month' => null],
                'sort_order' => 3,
            ],
        ];

        foreach ($plans as $plan) {
            $model = Plan::withTrashed()->updateOrCreate(
                ['slug' => $plan['slug']],
                $plan + ['is_active' => true, 'visibility' => 'public', 'deleted_at' => null],
            );

            foreach ([
                ['interval' => 'monthly', 'price' => $plan['price_monthly']],
                ['interval' => 'yearly', 'price' => $plan['price_yearly']],
            ] as $row) {
                $model->prices()->updateOrCreate(
                    ['currency' => $plan['currency'], 'interval' => $row['interval']],
                    ['price' => $row['price']],
                );
            }
        }
    }
}
