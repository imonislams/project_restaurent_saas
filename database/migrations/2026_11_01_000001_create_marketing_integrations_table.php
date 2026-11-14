<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_integrations', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 40);
            $table->string('name', 120)->nullable();
            $table->string('environment', 20)->default('production');
            $table->boolean('is_enabled')->default(false);
            // Credentials are stored with the encrypted:array cast. Only key names
            // are ever exposed to the browser.
            $table->text('credentials')->nullable();
            $table->json('settings')->nullable();
            $table->string('status', 30)->default('not_configured');
            $table->string('health_status', 20)->default('unknown');
            $table->timestamp('last_ok_at')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->timestamp('last_synced_at')->nullable();
            $table->text('last_error')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['provider', 'environment']);
            $table->index('provider');
        });

        Schema::create('marketing_sync_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('integration_id')->constrained('marketing_integrations')->cascadeOnDelete();
            $table->string('direction', 10)->default('pull');
            $table->string('entity', 60);
            $table->string('status', 20)->default('ok');
            $table->unsignedInteger('items_count')->default(0);
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->text('error')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['integration_id', 'entity', 'started_at']);
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_sync_logs');
        Schema::dropIfExists('marketing_integrations');
    }
};
