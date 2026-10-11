<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_items', function (Blueprint $table) {
            $table->index(['tenant_id', 'product_id'], 'order_items_tenant_product_index');
        });

        Schema::table('stock_balances', function (Blueprint $table) {
            $table->index(['tenant_id', 'quantity'], 'stock_balances_tenant_quantity_index');
        });

        Schema::table('payments', function (Blueprint $table) {
            $table->index(['tenant_id', 'payment_method_id'], 'payments_tenant_method_index');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index(['tenant_id', 'status', 'placed_at'], 'orders_tenant_status_placed_index');
        });
    }

    public function down(): void
    {
        Schema::table('order_items', fn (Blueprint $table) => $table->dropIndex('order_items_tenant_product_index'));
        Schema::table('stock_balances', fn (Blueprint $table) => $table->dropIndex('stock_balances_tenant_quantity_index'));
        Schema::table('payments', fn (Blueprint $table) => $table->dropIndex('payments_tenant_method_index'));
        Schema::table('orders', fn (Blueprint $table) => $table->dropIndex('orders_tenant_status_placed_index'));
    }
};
