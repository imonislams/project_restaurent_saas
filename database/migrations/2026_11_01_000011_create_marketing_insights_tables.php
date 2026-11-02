<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_alert_rules', function (Blueprint $table) {
            $table->id();
            $table->string('key', 60)->unique();
            $table->string('name');
            $table->string('metric', 60);
            $table->string('operator', 4)->default('gt');
            $table->decimal('threshold', 15, 4)->nullable();
            $table->string('window', 20)->default('24h');
            $table->string('channel', 20)->default('database');
            $table->json('recipients')->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->timestamp('last_triggered_at')->nullable();
            $table->unsignedInteger('cooldown_minutes')->default(1440);
            $table->timestamps();
        });

        Schema::create('marketing_insights', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rule_id')->nullable()->constrained('marketing_alert_rules')->nullOnDelete();
            $table->string('severity', 20)->default('info');
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('data')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamp('acknowledged_at')->nullable();
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('generated_at');
            $table->index('severity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_insights');
        Schema::dropIfExists('marketing_alert_rules');
    }
};
