<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Adds the handover / cancel timestamps used by the expanded kitchen ticket
 * status machine (new → preparing → ready → handed_over → served, or
 * cancelled). Purely additive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->timestamp('handed_over_at')->nullable()->after('ready_at');
            $table->timestamp('cancelled_at')->nullable()->after('served_at');
        });
    }

    public function down(): void
    {
        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->dropColumn(['handed_over_at', 'cancelled_at']);
        });
    }
};
