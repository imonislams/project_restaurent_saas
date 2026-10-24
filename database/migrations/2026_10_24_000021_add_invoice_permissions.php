<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Adds the tenant `invoices` permission group used by the order Bill/Invoice
 * workflow.
 *
 * Additive and idempotent: it inserts only the missing permission rows and
 * grants them to the relevant system roles. Slugs are hard-coded (not read from
 * the Permissions registry) so the migration stays stable if the catalog
 * evolves later.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $slugs = ['invoices.view', 'invoices.manage'];

    public function up(): void
    {
        $now = now();

        foreach ($this->slugs as $slug) {
            DB::table('permissions')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => Str::headline($slug),
                    'group' => 'invoices',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $ids = fn (array $slugs) => DB::table('permissions')->whereIn('slug', $slugs)->pluck('id');

        $grants = [
            'tenant_owner' => $this->slugs,
            'tenant_admin' => $this->slugs,
            'branch_manager' => $this->slugs,
            'supervisor' => $this->slugs,
            'accountant' => $this->slugs,
            'cashier' => ['invoices.view'],
            'auditor' => ['invoices.view'],
        ];

        foreach ($grants as $roleSlug => $permissionSlugs) {
            $roleId = DB::table('roles')
                ->whereNull('tenant_id')
                ->where('slug', $roleSlug)
                ->value('id');

            if (! $roleId) {
                continue;
            }

            foreach ($ids($permissionSlugs) as $permissionId) {
                DB::table('permission_role')->insertOrIgnore([
                    'role_id' => $roleId,
                    'permission_id' => $permissionId,
                ]);
            }
        }
    }

    public function down(): void
    {
        $permissionIds = DB::table('permissions')->whereIn('slug', $this->slugs)->pluck('id');

        DB::table('permission_role')->whereIn('permission_id', $permissionIds)->delete();
        DB::table('permissions')->whereIn('slug', $this->slugs)->delete();
    }
};
