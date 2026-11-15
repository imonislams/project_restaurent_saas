<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Drops role_user.branch_id, which is written but never read.
 *
 * The column was added as "NULL = tenant-wide role assignment", implying
 * per-branch role scoping. No authorization path ever consults it — branch
 * access is determined by branch_user instead. Leaving it in place is worse
 * than removing it, because a future developer would reasonably build
 * per-branch role checks on a column nothing enforces.
 *
 * Verified before dropping: 0 of 67 rows had a non-null value.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_user', function (Blueprint $table) {
            $table->dropForeign(['branch_id']);
        });

        Schema::table('role_user', function (Blueprint $table) {
            $table->dropColumn('branch_id');
        });
    }

    public function down(): void
    {
        Schema::table('role_user', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->after('role_id')
                ->comment('NULL = tenant-wide role assignment')
                ->constrained('branches')->cascadeOnDelete()->cascadeOnUpdate();
        });
    }
};
