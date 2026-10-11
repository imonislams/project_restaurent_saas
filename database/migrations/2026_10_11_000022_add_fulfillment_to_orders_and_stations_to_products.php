<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('table_id')->nullable()->after('register_id')
                ->constrained('tables')->nullOnDelete();
            $table->unsignedInteger('covers')->nullable()->after('customer_name');
            $table->string('fulfillment_status', 20)->default('new')->after('status');
            $table->index(['tenant_id', 'fulfillment_status']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('kitchen_station_id')->nullable()->after('category_id')
                ->constrained('kitchen_stations')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'fulfillment_status']);
            $table->dropConstrainedForeignId('table_id');
            $table->dropColumn(['covers', 'fulfillment_status']);
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropConstrainedForeignId('kitchen_station_id');
        });
    }
};
