<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demo data tracking: a batch records one generation run, and every row the run
 * creates is traced in the ledger so "remove all demo data" deletes exactly what
 * was generated — never a real record.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('demo_data_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->unsignedSmallInteger('days')->default(21);
            $table->string('current_step')->nullable();
            $table->unsignedSmallInteger('steps_total')->default(0);
            $table->unsignedSmallInteger('steps_done')->default(0);
            $table->json('completed_steps')->nullable();
            $table->json('refs')->nullable();
            $table->json('counts')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('removed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });

        Schema::create('demo_data_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('demo_data_batches')->cascadeOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('model_type', 120);
            $table->unsignedBigInteger('model_id');
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'model_type', 'model_id'], 'demo_records_tenant_model_idx');
            $table->index(['batch_id', 'model_type'], 'demo_records_batch_model_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('demo_data_records');
        Schema::dropIfExists('demo_data_batches');
    }
};
