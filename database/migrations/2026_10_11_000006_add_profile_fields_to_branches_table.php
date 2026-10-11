<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->string('address')->nullable()->after('code');
            $table->string('phone')->nullable()->after('address');
            $table->string('timezone')->nullable()->after('phone');
            $table->string('currency', 3)->nullable()->after('timezone');
            $table->json('service_types')->nullable()->after('currency');
            $table->boolean('is_primary')->default(false)->after('is_active');
            $table->json('settings')->nullable()->after('is_primary');
        });
    }

    public function down(): void
    {
        Schema::table('branches', function (Blueprint $table) {
            $table->dropColumn([
                'address', 'phone', 'timezone', 'currency',
                'service_types', 'is_primary', 'settings',
            ]);
        });
    }
};
