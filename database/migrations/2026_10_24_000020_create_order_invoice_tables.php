<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Restaurant "order" invoices — the Bill/Invoice workflow that served orders
 * feed into. Separate from the platform `subscription_invoices` domain.
 *
 * An invoice groups one or more served orders (one per table / dining session
 * under consolidated billing), which is what makes combined bills possible.
 * `invoice_orders.order_id` is unique so an order can never be charged twice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('table_id')->nullable()->constrained('tables')->nullOnDelete();
            $table->foreignId('dining_session_id')->nullable()->constrained('dining_sessions')->nullOnDelete();
            $table->foreignId('dining_participant_id')->nullable()->constrained('dining_participants')->nullOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('number');
            $table->string('status', 20)->default('open');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('service_charge', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_total', 15, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->timestamp('issued_at')->nullable();
            $table->timestamp('finalized_at')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('voided_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'number']);
            $table->index(['tenant_id', 'branch_id', 'status']);
            $table->index(['tenant_id', 'dining_session_id']);
            $table->index(['tenant_id', 'table_id']);
        });

        Schema::create('invoice_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->decimal('amount', 15, 2)->default(0);
            $table->timestamp('added_at')->nullable();
            $table->timestamps();

            // An order belongs to exactly one invoice — the duplicate-charge guard.
            $table->unique('order_id');
            $table->unique(['invoice_id', 'order_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_orders');
        Schema::dropIfExists('invoices');
    }
};
