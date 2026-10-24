<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Adds the tenant `roles` permission group used by custom role management.
 *
 * Additive and idempotent: it inserts only the missing permission rows and
 * grants them to the tenant owner/admin system roles. The slugs are hard-coded
 * (rather than read from the Permissions registry) so the migration stays
 * stable if the catalog evolves later.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $slugs = ['roles.view', 'roles.manage'];

    public function up(): void
    {
        $now = now();

        foreach ($this->slugs as $slug) {
            DB::table('permissions')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => Str::headline($slug),
                    'group' => 'roles',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $permissionIds = DB::table('permissions')->whereIn('slug', $this->slugs)->pluck('id');
        $roleIds = DB::table('roles')
            ->whereNull('tenant_id')
            ->whereIn('slug', ['tenant_owner', 'tenant_admin'])
            ->pluck('id');

        foreach ($roleIds as $roleId) {
            foreach ($permissionIds as $permissionId) {
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
