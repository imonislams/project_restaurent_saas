<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\RoleName;
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

        $platformAdmin = User::factory()->platformAdmin()->create([
            'name' => 'Platform Admin',
            'email' => 'platform@example.com',
        ]);
        $platformAdmin->assignRole(RoleName::SaasSuperAdmin);

        if (app()->environment('local')) {
            app(RegisterTenant::class)->execute([
                'name' => 'Demo Owner',
                'email' => 'owner@example.com',
                'password' => 'password',
                'restaurant_name' => 'Demo Restaurant',
            ]);
        }
    }
}
