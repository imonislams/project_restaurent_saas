<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->foreignId('subscription_invoice_id')->nullable()->constrained('subscription_invoices')->nullOnDelete();
            $table->string('gateway', 40);
            $table->string('provider_ref')->nullable();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status', 30)->default('pending');
            $table->unsignedInteger('attempt_number')->default(1);
            $table->string('failure_reason')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->string('settlement_status', 30)->default('pending');
            $table->decimal('refunded_amount', 15, 2)->default(0);
            $table->string('idempotency_key')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['tenant_id', 'idempotency_key']);
            $table->index(['tenant_id', 'status']);
            $table->index('provider_ref');
        });

        Schema::create('platform_payment_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_payment_id')->constrained('platform_payments')->cascadeOnDelete();
            $table->string('status', 30);
            $table->string('reference')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('platform_payment_id');
        });

        Schema::create('platform_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('platform_payment_id')->constrained('platform_payments')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->decimal('amount', 15, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('reason');
            $table->string('status', 30)->default('pending');
            $table->string('gateway_ref')->nullable();
            $table->foreignId('initiated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('platform_payment_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('provider', 40);
            $table->string('event_id')->nullable();
            $table->string('event_type')->nullable();
            $table->json('payload');
            $table->boolean('signature_valid')->default(false);
            $table->boolean('processed')->default(false);
            $table->timestamp('processed_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->unique(['provider', 'event_id']);
            $table->index('provider');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('platform_payment_events');
        Schema::dropIfExists('platform_refunds');
        Schema::dropIfExists('platform_payment_attempts');
        Schema::dropIfExists('platform_payments');
    }
};
