<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('tenant_id')
                ->nullable()
                ->after('id')
                ->constrained('tenants')
                ->cascadeOnUpdate()
                ->nullOnDelete();

            $table->boolean('is_platform_admin')->default(false)->after('tenant_id');
            $table->string('status')->default('active')->after('is_platform_admin');
            $table->timestamp('last_login_at')->nullable()->after('status');
            $table->timestamp('deactivated_at')->nullable()->after('last_login_at');

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'status']);
            $table->dropConstrainedForeignId('tenant_id');
            $table->dropColumn(['is_platform_admin', 'status', 'last_login_at', 'deactivated_at']);
        });
    }
};
