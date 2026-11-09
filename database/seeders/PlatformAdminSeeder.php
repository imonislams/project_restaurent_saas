<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\RoleName;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Creates (or repairs) the platform administrator.
 *
 * Run: php artisan db:seed --class=PlatformAdminSeeder
 *
 * Credentials come from PLATFORM_ADMIN_EMAIL / PLATFORM_ADMIN_PASSWORD /
 * PLATFORM_ADMIN_NAME. Local and test installs fall back to
 * platform@example.com / password; any other environment must set the
 * password explicitly so a known account is never created in production.
 */
class PlatformAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('PLATFORM_ADMIN_EMAIL', 'platform@example.com');
        $password = env('PLATFORM_ADMIN_PASSWORD');

        if ($password === null || $password === '') {
            if (! app()->environment('local', 'testing')) {
                $this->command?->error('Set PLATFORM_ADMIN_PASSWORD in .env before seeding the platform admin.');

                return;
            }

            $password = 'password';
        }

        $this->call(RolePermissionSeeder::class);

        // Idempotent: found by email, so re-running never duplicates.
        $admin = User::query()->firstOrCreate(
            ['email' => $email],
            [
                'tenant_id' => null,
                'is_platform_admin' => true,
                'status' => 'active',
                'name' => env('PLATFORM_ADMIN_NAME', 'Platform Admin'),
                'password' => $password,
            ],
        );

        $admin->forceFill([
            'is_platform_admin' => true,
            'status' => 'active',
            'email_verified_at' => $admin->email_verified_at ?? now(),
        ])->save();

        if (! $admin->hasRole([RoleName::SaasSuperAdmin])) {
            $admin->assignRole(RoleName::SaasSuperAdmin);
        }

        $this->command?->info("Platform admin ready: {$email}");
    }
}
