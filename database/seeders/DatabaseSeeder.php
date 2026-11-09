<?php

namespace Database\Seeders;

use App\Domain\Tenancy\Actions\RegisterTenant;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolePermissionSeeder::class);
        $this->call(PlanSeeder::class);
        $this->call(EmailTemplateSeeder::class);

        // Production installs create their own administrator with
        // `php artisan app:install` — never a known account.
        if (! app()->environment('local', 'testing')) {
            return;
        }

        $this->call(PlatformAdminSeeder::class);

        // The demo tenant is created once only.
        if (app()->environment('local') && ! User::query()->where('email', 'owner@example.com')->exists()) {
            app(RegisterTenant::class)->execute([
                'name' => 'Demo Owner',
                'email' => 'owner@example.com',
                'password' => 'password',
                'restaurant_name' => 'Demo Restaurant',
            ]);
        }
    }
}
