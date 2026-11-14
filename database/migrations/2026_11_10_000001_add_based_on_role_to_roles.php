<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a tenant-owned customised copy of a system role back to the global
 * role it was derived from. NULL for global roles and ordinary custom roles.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->foreignId('based_on_role_id')
                ->nullable()
                ->after('tenant_id')
                ->comment('Global role this tenant copy was derived from')
                ->constrained('roles')
                ->nullOnDelete();

            $table->index(['tenant_id', 'based_on_role_id']);
        });
    }

    public function down(): void
    {
        Schema::table('roles', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'based_on_role_id']);
            $table->dropConstrainedForeignId('based_on_role_id');
        });
    }
};
