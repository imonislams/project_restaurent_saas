<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links order lines and kitchen tickets to their round. A kitchen ticket used
 * to be unique per order; it becomes unique per (order, round) so each
 * additional round can be dispatched without re-sending earlier items.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->foreignId('order_round_id')->nullable()->after('order_id')
                ->constrained('order_rounds')->nullOnDelete();
            $table->index(['tenant_id', 'order_round_id']);
        });

        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->foreignId('order_round_id')->nullable()->after('order_id')
                ->constrained('order_rounds')->nullOnDelete();
            $table->unsignedSmallInteger('round_no')->default(1)->after('order_round_id');
            $table->index(['tenant_id', 'order_round_id']);
        });

        // Keep an index on order_id before removing the unique one the foreign
        // key currently relies on.
        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->index('order_id', 'kitchen_tickets_order_id_index');
        });

        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->dropUnique(['order_id']);
        });

        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->unique(['order_id', 'round_no']);
        });
    }

    public function down(): void
    {
        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->dropUnique(['order_id', 'round_no']);
            $table->dropIndex('kitchen_tickets_order_id_index');
        });

        Schema::table('kitchen_tickets', function (Blueprint $table) {
            $table->unique('order_id');
            $table->dropIndex(['tenant_id', 'order_round_id']);
            $table->dropConstrainedForeignId('order_round_id');
            $table->dropColumn('round_no');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'order_round_id']);
            $table->dropConstrainedForeignId('order_round_id');
        });
    }
};
