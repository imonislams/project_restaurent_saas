<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_automations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('key', 60)->unique();
            $table->string('description')->nullable();
            $table->string('trigger_type', 40);
            $table->json('trigger_config')->nullable();
            $table->string('status', 20)->default('draft');
            // Seeded presets are marked so the operator knows which are built in.
            $table->boolean('is_system')->default(false);
            $table->timestamp('last_run_at')->nullable();
            $table->unsignedInteger('run_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['trigger_type', 'status']);
        });

        Schema::create('marketing_automation_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('automation_id')->constrained('marketing_automations')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->string('type', 20);
            $table->json('config')->nullable();
            $table->string('template_key', 60)->nullable();
            $table->unsignedInteger('delay_value')->nullable();
            $table->string('delay_unit', 10)->nullable();
            $table->timestamps();

            $table->index(['automation_id', 'sort_order']);
        });

        Schema::create('marketing_automation_enrollments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('automation_id')->constrained('marketing_automations')->cascadeOnDelete();
            $table->string('subject_type', 60);
            $table->unsignedBigInteger('subject_id');
            $table->string('status', 20)->default('active');
            $table->unsignedInteger('current_step')->default(0);
            $table->timestamp('enrolled_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('stopped_at')->nullable();
            $table->string('stop_reason')->nullable();
            $table->timestamp('next_run_at')->nullable();
            $table->timestamps();

            // A subject is enrolled once per workflow.
            $table->unique(['automation_id', 'subject_type', 'subject_id'], 'marketing_automation_enrollment_unique');
            $table->index(['status', 'next_run_at']);
        });

        Schema::create('marketing_automation_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('enrollment_id')->constrained('marketing_automation_enrollments')->cascadeOnDelete();
            $table->foreignId('step_id')->constrained('marketing_automation_steps')->cascadeOnDelete();
            $table->string('status', 20)->default('ok');
            $table->text('message')->nullable();
            $table->timestamp('executed_at')->nullable();
            $table->timestamp('next_run_at')->nullable();
            // Part of the idempotency key: replaying a step is a no-op.
            $table->unsignedInteger('attempts')->default(1);
            $table->timestamp('created_at')->nullable();

            $table->unique(['enrollment_id', 'step_id', 'attempts'], 'marketing_automation_log_idempotency');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_automation_logs');
        Schema::dropIfExists('marketing_automation_enrollments');
        Schema::dropIfExists('marketing_automation_steps');
        Schema::dropIfExists('marketing_automations');
    }
};
