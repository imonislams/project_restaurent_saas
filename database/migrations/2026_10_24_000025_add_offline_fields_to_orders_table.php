<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Records that an order was taken while a device was offline, and when it was
 * replayed to the server. Order numbering stays server-side (order_sequences),
 * so `offline_reference` holds the provisional reference the receipt showed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('offline_reference')->nullable()->after('order_number');
            $table->timestamp('captured_offline_at')->nullable()->after('placed_at');
            $table->timestamp('synced_at')->nullable()->after('captured_offline_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['offline_reference', 'captured_offline_at', 'synced_at']);
        });
    }
};
