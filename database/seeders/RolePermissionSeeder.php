<?php

namespace Database\Seeders;

use App\Domain\Identity\Enums\RoleName;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Identity\Permissions;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedPermissions();

        foreach ($this->roleMap() as $roleName => $slugs) {
            $role = Role::updateOrCreate(
                ['tenant_id' => null, 'slug' => $roleName],
                [
                    'name' => RoleName::from($roleName)->label(),
                    'description' => null,
                    'is_system' => true,
                ],
            );

            $role->permissions()->sync(
                Permission::whereIn('slug', $slugs)->pluck('id')->all()
            );
        }
    }

    protected function seedPermissions(): void
    {
        foreach (Permissions::map() as $group => $actions) {
            foreach ($actions as $action) {
                $slug = $group.'.'.$action;

                Permission::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'name' => Str::headline($slug),
                        'group' => $group,
                    ],
                );
            }
        }
    }

    /**
     * @return array<string, list<string>>
     */
    protected function roleMap(): array
    {
        $all = Permissions::tenant();
        $platform = Permissions::platform();

        $views = fn (string $group) => array_values(array_filter(
            $all,
            fn (string $slug) => str_starts_with($slug, $group.'.') && str_ends_with($slug, '.view')
        ));

        return [
            RoleName::SaasSuperAdmin->value => $platform,

            RoleName::TenantOwner->value => $all,
            RoleName::TenantAdmin->value => $all,

            RoleName::BranchManager->value => [
                'dashboard.view', 'pos.use',
                'orders.view', 'orders.create', 'orders.update', 'orders.void',
                'tables.view', 'tables.manage', 'kitchen.view',
                'menu.view', 'inventory.view', 'purchasing.view',
                'waste.view', 'waste.create',
                'customers.view', 'customers.manage',
                'cash.view', 'cash.manage', 'expenses.view', 'expenses.manage',
                'reports.view', 'staff.view', 'branches.view', 'settings.view',
            ],

            RoleName::Supervisor->value => [
                'dashboard.view', 'pos.use',
                'orders.view', 'orders.create', 'orders.update', 'orders.void', 'orders.refund',
                'tables.view', 'tables.manage', 'kitchen.view', 'kitchen.manage',
                'menu.view', 'inventory.view', 'waste.view', 'waste.create',
                'customers.view', 'cash.view', 'reports.view',
            ],

            RoleName::Cashier->value => [
                'dashboard.view', 'pos.use',
                'orders.view', 'orders.create', 'orders.update',
                'tables.view', 'kitchen.view', 'customers.view',
            ],

            RoleName::KitchenStaff->value => [
                'dashboard.view', 'kitchen.view', 'kitchen.manage', 'orders.view',
            ],

            RoleName::InventoryManager->value => [
                'dashboard.view', 'menu.view',
                'inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.approve',
                'purchasing.view', 'purchasing.manage', 'purchasing.approve',
                'waste.view', 'waste.create', 'waste.approve', 'reports.view',
            ],

            RoleName::Accountant->value => [
                'dashboard.view', 'expenses.view', 'expenses.manage', 'expenses.approve',
                'accounts.view', 'cash.view', 'reports.view', 'reports.export',
                'inventory.view', 'purchasing.view',
            ],

            RoleName::Auditor->value => array_merge(
                $views('dashboard'), $views('orders'), $views('tables'), $views('kitchen'),
                $views('menu'), $views('inventory'), $views('purchasing'), $views('waste'),
                $views('customers'), $views('cash'), $views('accounts'), $views('expenses'),
                $views('reports'), $views('staff'), $views('branches'), $views('settings'),
                $views('subscription'),
            ),
        ];
    }
}
