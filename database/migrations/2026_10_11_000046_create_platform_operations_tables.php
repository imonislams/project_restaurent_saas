<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('platform_settings', function (Blueprint $table) {
            $table->id();
            $table->string('group', 40)->default('general');
            $table->string('key')->unique();
            $table->text('value')->nullable();
            $table->string('type', 20)->default('string');
            $table->boolean('is_encrypted')->default(false);
            $table->timestamps();

            $table->index('group');
        });

        Schema::create('email_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('message_id')->nullable();
            $table->string('to_email');
            $table->string('from_email')->nullable();
            $table->string('subject')->nullable();
            $table->string('mailer', 40)->nullable();
            $table->string('status', 20)->default('queued');
            $table->unsignedInteger('attempts')->default(0);
            $table->text('error')->nullable();
            $table->string('retry_class')->nullable();
            $table->json('retry_payload')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamps();

            $table->index('to_email');
            $table->index('status');
            $table->index(['tenant_id', 'status']);
        });

        Schema::create('application_logs', function (Blueprint $table) {
            $table->id();
            $table->string('level', 20);
            $table->text('message');
            $table->json('context')->nullable();
            $table->string('channel', 40)->nullable();
            $table->string('request_id')->nullable();
            $table->foreignId('tenant_id')->nullable();
            $table->foreignId('user_id')->nullable();
            $table->timestamp('logged_at')->nullable();

            $table->index('level');
            $table->index('logged_at');
            $table->index('request_id');
        });

        Schema::create('scheduled_task_runs', function (Blueprint $table) {
            $table->id();
            $table->string('task');
            $table->timestamp('ran_at');
            $table->unsignedInteger('duration_ms')->nullable();
            $table->integer('exit_code')->nullable();
            $table->text('output')->nullable();

            $table->index('task');
            $table->index('ran_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduled_task_runs');
        Schema::dropIfExists('application_logs');
        Schema::dropIfExists('email_logs');
        Schema::dropIfExists('platform_settings');
    }
};
