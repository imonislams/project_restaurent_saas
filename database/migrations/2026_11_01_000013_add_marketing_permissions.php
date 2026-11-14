<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Adds the granular Marketing & Growth permissions and grants them to the existing
 * platform roles, so installs that are already running receive the new slugs
 * without re-seeding.
 *
 * Additive and idempotent: it inserts only the missing permission rows, grants them
 * to roles that exist, and its down() removes exactly what it created.
 *
 * The slugs are hard-coded (rather than read from the Permissions registry) so this
 * migration stays stable if the catalog evolves later — mirroring
 * 2026_10_24_000001_add_role_management_permissions.php.
 */
return new class extends Migration
{
    /** @var list<string> */
    private array $slugs = [
        'platform.marketing.publish',
        'platform.marketing.leads.assign',
        'platform.marketing.integrations.manage',
        'platform.marketing.consent.manage',
        'platform.marketing.export',
        'platform.marketing.reports.view',
    ];

    public function up(): void
    {
        $now = now();

        foreach ($this->slugs as $slug) {
            DB::table('permissions')->updateOrInsert(
                ['slug' => $slug],
                [
                    'name' => Str::headline($slug),
                    'group' => 'platform',
                    'created_at' => $now,
                    'updated_at' => $now,
                ],
            );
        }

        $permissions = DB::table('permissions')->whereIn('slug', $this->slugs)->pluck('id', 'slug');

        // Least privilege: only the super admin and platform owner receive the
        // integration-credential permission by default.
        $roleGrants = [
            'saas_super_admin' => $this->slugs,
            'platform_owner' => $this->slugs,
            'platform_admin' => [
                'platform.marketing.publish',
                'platform.marketing.leads.assign',
                'platform.marketing.consent.manage',
                'platform.marketing.export',
                'platform.marketing.reports.view',
            ],
            'platform_auditor' => [
                'platform.marketing.export',
                'platform.marketing.reports.view',
            ],
        ];

        $roleIds = DB::table('roles')->whereNull('tenant_id')->pluck('id', 'slug');

        foreach ($roleGrants as $roleSlug => $slugs) {
            $roleId = $roleIds[$roleSlug] ?? null;

            if ($roleId === null) {
                continue;
            }

            foreach ($slugs as $slug) {
                $permissionId = $permissions[$slug] ?? null;

                if ($permissionId === null) {
                    continue;
                }

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
