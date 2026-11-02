<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_attributions', function (Blueprint $table) {
            $table->id();
            $table->uuid('visitor_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->foreignId('landing_page_id')->nullable()->constrained('marketing_landing_pages')->nullOnDelete();
            $table->string('model', 20)->default('first_touch');
            $table->string('channel', 30)->nullable();
            $table->string('source', 120)->nullable();
            $table->string('medium', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->timestamp('touchpoint_at')->nullable();
            $table->unsignedInteger('window_days')->default(30);
            $table->decimal('value', 15, 2)->nullable();
            $table->char('currency', 3)->nullable();
            $table->timestamp('converted_at')->nullable();
            $table->timestamps();

            // One attribution per model per customer — a conversion can never be
            // counted twice.
            $table->unique(['tenant_id', 'model']);
            $table->index(['model', 'channel']);
            $table->index('campaign_id');
            $table->index('converted_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_attributions');
    }
};
