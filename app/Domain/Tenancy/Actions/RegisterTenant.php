<?php

namespace App\Domain\Tenancy\Actions;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Identity\Enums\RoleName;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Payments\Actions\ProvisionPaymentDefaults;
use App\Domain\Subscriptions\SubscriptionService;
use App\Domain\Tenancy\Enums\TenantStatus;
use App\Domain\Tenancy\Models\Tenant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Provisions a new tenant and its owner account in a single transaction.
 */
class RegisterTenant
{
    public const TRIAL_DAYS = 14;

    /**
     * @param  array{name: string, email?: ?string, phone?: ?string, password: string, restaurant_name: string}  $data
     */
    public function execute(array $data): User
    {
        return DB::transaction(function () use ($data) {
            $tenant = Tenant::create([
                'name' => $data['restaurant_name'],
                'slug' => $this->uniqueSlug($data['restaurant_name']),
                'business_email' => $data['email'] ?? null,
                'status' => TenantStatus::Active,
                'trial_ends_at' => now()->addDays(self::TRIAL_DAYS),
            ]);

            app(ProvisionInventoryDefaults::class)->forTenant($tenant);
            app(ProvisionPaymentDefaults::class)->forTenant($tenant);
            app(ProvisionAccountingDefaults::class)->forTenant($tenant);
            app(SubscriptionService::class)->startTrial($tenant);

            $user = User::create([
                'tenant_id' => $tenant->getKey(),
                'name' => $data['name'],
                'email' => $data['email'] ?? null,
                'phone' => $data['phone'] ?? null,
                'password' => $data['password'],
                'status' => 'active',
            ]);

            $user->assignRole(RoleName::TenantOwner);

            return $user;
        });
    }

    protected function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'restaurant';
        $slug = $base;
        $suffix = 1;

        while (Tenant::withTrashed()->where('slug', $slug)->exists()) {
            $slug = $base.'-'.(++$suffix);
        }

        return $slug;
    }
}
