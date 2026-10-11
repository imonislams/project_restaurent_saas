<?php

namespace App\Providers;

use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Policies\BranchPolicy;
use App\Domain\Identity\Policies\UserPolicy;
use App\Domain\Inventory\Models\Ingredient;
use App\Domain\Menu\Models\Product;
use App\Domain\Tenancy\Models\Tenant;
use App\Domain\Tenancy\Policies\TenantPolicy;
use App\Domain\Tenancy\TenantContext;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(TenantContext::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        // Stable morph aliases so stored stock records survive class moves.
        Relation::morphMap([
            'product' => Product::class,
            'ingredient' => Ingredient::class,
        ]);

        Gate::policy(Tenant::class, TenantPolicy::class);
        Gate::policy(Branch::class, BranchPolicy::class);
        Gate::policy(User::class, UserPolicy::class);

        Gate::define('platform.access', fn (User $user) => $user->isPlatformAdmin());

        // Permission catalog drives authorization. Tenant users resolve their
        // role permissions; platform admins resolve platform.* only.
        Gate::before(function (User $user, string $ability) {
            return $user->hasPermission($ability) ? true : null;
        });
    }
}
