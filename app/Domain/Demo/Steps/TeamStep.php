<?php

namespace App\Domain\Demo\Steps;

use App\Domain\Accounting\Actions\ProvisionAccountingDefaults;
use App\Domain\Branches\Enums\ServiceType;
use App\Domain\Branches\Models\Branch;
use App\Domain\Branches\Models\BusinessHour;
use App\Domain\CashManagement\Models\Register;
use App\Domain\Demo\Data\DemoProfile;
use App\Domain\Demo\Data\DemoRandom;
use App\Domain\Demo\DemoRun;
use App\Domain\Identity\ManagerPinService;
use App\Domain\Identity\Models\Permission;
use App\Domain\Identity\Models\Role;
use App\Domain\Inventory\Actions\ProvisionInventoryDefaults;
use App\Domain\Kitchen\Models\KitchenStation;
use App\Domain\Tables\Models\DiningArea;
use App\Domain\Tables\Models\Table;
use App\Domain\Tables\Models\TableQrToken;
use App\Models\User;
use Illuminate\Support\Str;

/**
 * The people and the place: tenant-defined roles, the demo team with real role
 * assignments, a second branch, tills, kitchen stations, the floor plan and its
 * QR codes.
 */
class TeamStep implements DemoStep
{
    public function key(): string
    {
        return 'team';
    }

    public function label(): string
    {
        return 'Team, roles & floor plan';
    }

    public function run(DemoRun $run): array
    {
        $profile = $run->profile();
        $random = $run->random('team');
        $primary = $run->branch('primary');

        $roles = $this->customRoles($run, $profile);
        $annex = $this->annexBranch($run, $profile, $primary);
        $branches = ['primary' => $primary, 'annex' => $annex];

        $stations = $this->kitchenStations($run, $profile, $branches);
        $areas = $this->diningAreas($run, $profile, $branches);
        $tables = $this->tables($run, $branches, $areas);
        $this->qrTokens($run, $random, $tables, $branches);
        $registers = $this->registers($run, $branches);
        $staffIds = $this->staff($run, $profile, $random, $roles, $branches);
        $this->assignTableStaff($run, $tables, $staffIds);

        $run->putRefs([
            'branches.annex' => $annex->getKey(),
            'registers' => $registers,
            'stations' => $stations,
            'areas' => $areas,
            'tables' => $tables,
            'staff' => $staffIds,
            'roles' => array_map(fn (Role $role) => $role->getKey(), $roles),
        ]);

        return [
            'staff' => count($staffIds),
            'roles' => count($roles),
            'branches' => 1,
            'tables' => count($tables['primary']) + count($tables['annex']),
            'stations' => count($stations['primary']) + count($stations['annex']),
        ];
    }

    /**
     * Tenant-defined roles (editable next to the protected built-in ones).
     *
     * @return array<string, Role>
     */
    protected function customRoles(DemoRun $run, DemoProfile $profile): array
    {
        $tenantId = $run->batch->tenant_id;
        $roles = [];

        foreach ($profile->customRoles() as $slug => $definition) {
            $role = Role::query()->firstOrCreate(
                ['tenant_id' => $tenantId, 'slug' => $slug],
                [
                    'name' => $definition['name'],
                    'description' => $definition['description'],
                    'is_system' => false,
                ],
            );

            $role->permissions()->sync(
                Permission::query()->whereIn('slug', $definition['permissions'])->pluck('id')->all()
            );

            $run->remember($role);
            $roles[$slug] = $role;
        }

        return $roles;
    }

    protected function annexBranch(DemoRun $run, DemoProfile $profile, Branch $primary): Branch
    {
        $tenantId = $run->batch->tenant_id;
        $names = $profile->names();
        $random = $run->random('annex-branch');

        $annex = Branch::query()->withoutGlobalScopes()->firstOrCreate(
            ['tenant_id' => $tenantId, 'code' => 'BR-02'],
            [
                'name' => $profile->annexBranchName(),
                'address' => $names->address($random),
                'phone' => $names->phone($random),
                'timezone' => $primary->timezone,
                'currency' => $primary->currency,
                'service_types' => $primary->serviceTypes() ?: ServiceType::values(),
                'is_active' => true,
                'is_primary' => false,
            ],
        );

        // Same opening hours as the branch the owner configured.
        $hours = $primary->businessHours()->get();

        foreach (range(0, 6) as $day) {
            $source = $hours->firstWhere('day_of_week', $day);

            BusinessHour::query()->withoutGlobalScopes()->firstOrCreate(
                ['branch_id' => $annex->getKey(), 'day_of_week' => $day],
                [
                    'tenant_id' => $tenantId,
                    'is_closed' => $source?->is_closed ?? false,
                    'opens_at' => $source?->opens_at ?? '09:00:00',
                    'closes_at' => $source?->closes_at ?? '23:00:00',
                ],
            );
        }

        app(ProvisionInventoryDefaults::class)->defaultLocationFor($annex);
        app(ProvisionAccountingDefaults::class)->cashAccountFor($annex);

        return $annex;
    }

    /**
     * @param  array<string, Branch>  $branches
     * @return array<string, array<string, int>> branch key => station key => id
     */
    protected function kitchenStations(DemoRun $run, DemoProfile $profile, array $branches): array
    {
        $tenantId = $run->batch->tenant_id;
        $result = [];

        foreach ($branches as $branchKey => $branch) {
            $sort = 0;

            foreach ($profile->stations() as $station) {
                $model = KitchenStation::query()->withoutGlobalScopes()->firstOrCreate(
                    ['branch_id' => $branch->getKey(), 'name' => $station['name']],
                    [
                        'tenant_id' => $tenantId,
                        'sort_order' => $sort++,
                        'is_active' => true,
                    ],
                );

                $result[$branchKey][$station['key']] = $model->getKey();
            }
        }

        return $result;
    }

    /**
     * @param  array<string, Branch>  $branches
     * @return array<string, array<string, int>> branch key => area name => id
     */
    protected function diningAreas(DemoRun $run, DemoProfile $profile, array $branches): array
    {
        $tenantId = $run->batch->tenant_id;
        $names = $profile->diningAreas();
        $result = [];

        foreach ($branches as $branchKey => $branch) {
            // The secondary branch is smaller: two areas instead of three.
            $areaNames = $branchKey === 'primary' ? $names : array_slice($names, 0, 2);

            foreach ($areaNames as $index => $name) {
                $area = DiningArea::query()->withoutGlobalScopes()->firstOrCreate(
                    ['branch_id' => $branch->getKey(), 'name' => $name],
                    [
                        'tenant_id' => $tenantId,
                        'sort_order' => $index,
                        'is_active' => true,
                    ],
                );

                $result[$branchKey][$name] = $area->getKey();
            }
        }

        return $result;
    }

    /**
     * Floor plan: table sizes are mixed so the POS table picker shows a
     * realistic room rather than a uniform grid.
     *
     * @param  array<string, Branch>  $branches
     * @param  array<string, array<string, int>>  $areas
     * @return array<string, list<array<string, mixed>>>
     */
    protected function tables(DemoRun $run, array $branches, array $areas): array
    {
        $tenantId = $run->batch->tenant_id;
        $areaNames = $run->profile()->diningAreas();

        $plan = [
            'primary' => [
                ['area' => $areaNames[0], 'prefix' => 'T', 'seats' => [2, 2, 4, 4, 6]],
                ['area' => $areaNames[1], 'prefix' => 'R', 'seats' => [2, 4]],
                ['area' => $areaNames[2], 'prefix' => 'C', 'seats' => [6]],
            ],
            'annex' => [
                ['area' => $areaNames[0], 'prefix' => 'A', 'seats' => [2, 4, 4]],
            ],
        ];

        $result = [];

        foreach ($plan as $branchKey => $groups) {
            $branch = $branches[$branchKey];
            $sort = 0;

            foreach ($groups as $group) {
                $areaId = $areas[$branchKey][$group['area']] ?? null;

                foreach ($group['seats'] as $index => $seats) {
                    $name = $group['prefix'].($index + 1);

                    $table = Table::query()->withoutGlobalScopes()->firstOrCreate(
                        ['branch_id' => $branch->getKey(), 'name' => $name],
                        [
                            'tenant_id' => $tenantId,
                            'dining_area_id' => $areaId,
                            'seats' => $seats,
                            'status' => 'available',
                            'sort_order' => $sort++,
                            'is_active' => true,
                        ],
                    );

                    $result[$branchKey][] = [
                        'id' => $table->getKey(),
                        'name' => $name,
                        'seats' => (int) $table->seats,
                        'area' => $group['area'],
                    ];
                }
            }
        }

        return $result;
    }

    /**
     * A rotatable QR identity per table, so the QR dining module has scannable
     * codes the moment the owner opens it.
     *
     * @param  array<string, list<array<string, mixed>>>  $tables
     * @param  array<string, Branch>  $branches
     */
    protected function qrTokens(DemoRun $run, DemoRandom $random, array $tables, array $branches): void
    {
        $tenantId = $run->batch->tenant_id;

        foreach ($tables as $branchKey => $rows) {
            $branchId = $branches[$branchKey]->getKey();

            foreach ($rows as $row) {
                TableQrToken::query()->withoutGlobalScopes()->firstOrCreate(
                    ['table_id' => $row['id'], 'revoked_at' => null],
                    [
                        'tenant_id' => $tenantId,
                        'branch_id' => $branchId,
                        'token' => Str::random(64),
                        'is_active' => true,
                        'scan_count' => $random->int(0, 45),
                        'last_scanned_at' => now()->subDays($random->int(0, 13)),
                    ],
                );
            }
        }
    }

    /**
     * @param  array<string, Branch>  $branches
     * @return array<string, list<int>> branch key => register ids
     */
    protected function registers(DemoRun $run, array $branches): array
    {
        $tenantId = $run->batch->tenant_id;
        $result = [];

        foreach ($branches as $branchKey => $branch) {
            $names = $branchKey === 'primary' ? ['Till 1', 'Till 2'] : ['Till 1'];

            foreach ($names as $name) {
                $register = Register::query()->withoutGlobalScopes()->firstOrCreate(
                    ['branch_id' => $branch->getKey(), 'name' => $name],
                    ['tenant_id' => $tenantId, 'is_active' => true],
                );

                $result[$branchKey][] = $register->getKey();
            }
        }

        return $result;
    }

    /**
     * The demo team. Everyone gets a real role and branch access; senior staff
     * also hold a manager PIN so approvals can be demonstrated.
     *
     * @param  array<string, Role>  $roles
     * @param  array<string, Branch>  $branches
     * @return array<string, int> staff key => user id
     */
    protected function staff(DemoRun $run, DemoProfile $profile, DemoRandom $random, array $roles, array $branches): array
    {
        $tenantId = $run->batch->tenant_id;
        $names = $profile->names();
        $domain = $profile->emailDomain();
        $pins = app(ManagerPinService::class);
        $ids = [];
        $index = 0;

        foreach ($profile->staff() as $definition) {
            $index++;

            $name = $names->person($random);
            $email = $names->email($name, $index, $domain);

            $user = User::query()->where('email', $email)->first();

            if (! $user) {
                $user = new User([
                    'tenant_id' => $tenantId,
                    'status' => 'active',
                    'name' => $name,
                    'email' => $email,
                    'password' => Str::random(40),
                ]);

                $user->forceFill([
                    'email_verified_at' => now(),
                    'created_at' => now()->subDays(60 + $index),
                ])->save();
            }

            $user->assignRole($definition['role']);

            // A Role model is passed rather than a slug: slugs are only unique
            // per tenant, so resolving one could land on another tenant's role.
            if (isset($definition['custom_role'], $roles[$definition['custom_role']])) {
                $user->assignRole($roles[$definition['custom_role']]);
            }

            $branch = $branches[$definition['branch']] ?? $branches['primary'];
            $user->syncBranchAccess([$branch->getKey()]);

            if (isset($definition['pin']) && ! $user->hasManagerPin()) {
                $pins->set($user, $definition['pin']);
            }

            $run->remember($user);
            $ids[$definition['key']] = $user->getKey();
        }

        return $ids;
    }

    /**
     * @param  array<string, list<array<string, mixed>>>  $tables
     * @param  array<string, int>  $staffIds
     */
    protected function assignTableStaff(DemoRun $run, array $tables, array $staffIds): void
    {
        $tenantId = $run->batch->tenant_id;

        $byBranch = [
            'primary' => array_values(array_filter([
                $staffIds['waiter1'] ?? null,
                $staffIds['supervisor'] ?? null,
            ])),
            'annex' => array_values(array_filter([
                $staffIds['waiter2'] ?? null,
            ])),
        ];

        foreach ($tables as $branchKey => $rows) {
            $staff = $byBranch[$branchKey] ?? [];

            if ($staff === []) {
                continue;
            }

            foreach ($rows as $row) {
                Table::query()->withoutGlobalScopes()->find($row['id'])
                    ?->staff()
                    ->syncWithPivotValues($staff, ['tenant_id' => $tenantId]);
            }
        }
    }
}
