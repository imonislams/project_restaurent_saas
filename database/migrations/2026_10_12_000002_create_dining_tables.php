<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Dining sessions and everything hanging off them: participants (one per
 * device/customer), an append-only event log, bill requests and post-dining
 * feedback. A session is scoped to a table, branch and tenant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dining_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('table_id')->constrained('tables')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('session_token', 64)->unique();
            $table->string('status', 20)->default('open');
            $table->string('billing_mode', 20)->default('consolidated');
            $table->string('guest_label')->nullable();
            $table->timestamp('started_at');
            $table->timestamp('last_activity_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('close_reason')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'table_id', 'status']);
            $table->index(['tenant_id', 'branch_id', 'status']);
        });

        Schema::create('dining_participants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('dining_session_id')->constrained('dining_sessions')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->string('display_name')->nullable();
            $table->string('phone')->nullable();
            $table->string('email')->nullable();
            $table->string('participant_token', 64)->unique();
            $table->boolean('is_lead')->default(false);
            $table->boolean('marketing_consent')->default(false);
            $table->boolean('loyalty_consent')->default(false);
            $table->boolean('is_active')->default(true);
            $table->timestamp('joined_at');
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'dining_session_id']);
            $table->index(['tenant_id', 'phone']);
        });

        Schema::create('dining_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('dining_session_id')->constrained('dining_sessions')->cascadeOnDelete();
            $table->string('type', 40);
            $table->string('actor_type', 20)->default('system');
            $table->unsignedBigInteger('actor_id')->nullable();
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'dining_session_id']);
            $table->index(['tenant_id', 'type']);
        });

        Schema::create('bill_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('dining_session_id')->constrained('dining_sessions')->cascadeOnDelete();
            $table->foreignId('requested_by_participant_id')->nullable()->constrained('dining_participants')->nullOnDelete();
            $table->string('status', 20)->default('pending');
            $table->decimal('payable_total', 15, 2)->nullable();
            $table->timestamp('requested_at');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('handled_at')->nullable();
            $table->timestamp('settled_at')->nullable();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'dining_session_id', 'status']);
        });

        Schema::create('dining_feedback', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('dining_session_id')->unique()->constrained('dining_sessions')->cascadeOnDelete();
            $table->foreignId('customer_id')->nullable()->constrained('customers')->nullOnDelete();
            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();
            $table->boolean('consent_marketing')->default(false);
            $table->timestamp('created_at')->nullable();

            $table->index(['tenant_id', 'rating']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dining_feedback');
        Schema::dropIfExists('bill_requests');
        Schema::dropIfExists('dining_events');
        Schema::dropIfExists('dining_participants');
        Schema::dropIfExists('dining_sessions');
    }
};
