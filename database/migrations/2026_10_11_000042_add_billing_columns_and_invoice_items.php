<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->timestamp('due_date')->nullable()->after('issued_at');
            $table->timestamp('sent_at')->nullable()->after('due_date');
            $table->string('delivery_status', 20)->nullable()->after('sent_at');
            $table->text('notes')->nullable()->after('delivery_status');
        });

        Schema::create('subscription_invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subscription_invoice_id')->constrained('subscription_invoices')->cascadeOnDelete();
            $table->string('description');
            $table->decimal('quantity', 15, 3)->default(1);
            $table->decimal('unit_price', 15, 2)->default(0);
            $table->decimal('amount', 15, 2)->default(0);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index('subscription_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_invoice_items');

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn(['due_date', 'sent_at', 'delivery_status', 'notes']);
        });
    }
};
