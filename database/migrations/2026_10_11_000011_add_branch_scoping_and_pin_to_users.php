<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('role_user', function (Blueprint $table) {
            $table->foreignId('branch_id')
                ->nullable()
                ->after('role_id')
                ->comment('NULL = tenant-wide role assignment')
                ->constrained('branches')
                ->cascadeOnUpdate()
                ->cascadeOnDelete();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('manager_pin')->nullable()->after('password');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('manager_pin');
        });

        Schema::table('role_user', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
        });
    }
};
