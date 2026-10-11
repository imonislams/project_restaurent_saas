<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('delivery_zones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('name');
            $table->decimal('fee', 15, 2)->default(0);
            $table->decimal('min_order', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('delivery_zone_id')->nullable()->after('table_id')
                ->constrained('delivery_zones')->nullOnDelete();
            $table->decimal('delivery_fee', 15, 2)->default(0)->after('service_charge');
            $table->string('delivery_address')->nullable()->after('covers');
            $table->string('driver_name')->nullable()->after('delivery_address');
            $table->string('driver_phone')->nullable()->after('driver_name');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('delivery_zone_id');
            $table->dropColumn(['delivery_fee', 'delivery_address', 'driver_name', 'driver_phone']);
        });

        Schema::dropIfExists('delivery_zones');
    }
};
