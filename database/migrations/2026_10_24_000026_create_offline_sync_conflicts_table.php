<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Operations replayed from an offline device that need a human look: the server
 * priced the order differently, stock was short, the shift was closed, or a table
 * was taken. Recording them keeps the difference visible instead of silently
 * accepting whatever the device computed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offline_sync_conflicts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->string('offline_uuid');
            $table->string('operation_type', 30);
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('order_reference')->nullable();
            $table->string('type', 40);
            $table->string('status', 20)->default('open');
            $table->text('message');
            $table->json('expected')->nullable();
            $table->json('actual')->nullable();
            $table->json('payload')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->text('resolution_note')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index('offline_uuid');
            $table->index(['type', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offline_sync_conflicts');
    }
};
