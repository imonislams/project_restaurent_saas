<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rounds group the items added to one order over time. An order stays the
 * single billing unit (one number, one invoice, one settlement); each round is
 * one submission of items, with its own acceptance state and kitchen ticket.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_rounds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->unsignedSmallInteger('round_no');
            $table->string('source', 20)->default('pos');
            $table->foreignId('dining_participant_id')->nullable()->constrained('dining_participants')->nullOnDelete();
            $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 100)->nullable();
            $table->string('status', 20)->default('active');
            $table->string('acceptance_status', 20)->default('auto_accepted');
            $table->timestamp('accepted_at')->nullable();
            $table->foreignId('accepted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('rejected_at')->nullable();
            $table->foreignId('rejected_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('rejected_reason')->nullable();
            $table->timestamp('sent_to_kitchen_at')->nullable();
            $table->foreignId('kitchen_ticket_id')->nullable()->constrained('kitchen_tickets')->nullOnDelete();
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_total', 15, 2)->default(0);
            $table->decimal('tax_total', 15, 2)->default(0);
            $table->decimal('service_charge', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['order_id', 'round_no']);
            $table->unique(['tenant_id', 'idempotency_key']);
            $table->index(['tenant_id', 'order_id', 'status']);
            $table->index(['tenant_id', 'branch_id', 'acceptance_status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_rounds');
    }
};
