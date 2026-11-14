<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('objective', 40)->nullable();
            $table->text('description')->nullable();
            $table->string('channel', 30)->default('other');
            $table->foreignId('owner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status', 20)->default('draft');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->decimal('budget', 15, 2)->nullable();
            $table->char('currency', 3)->nullable();
            $table->char('target_country', 2)->nullable();
            $table->string('target_audience')->nullable();
            $table->string('target_restaurant_category', 60)->nullable();
            $table->string('target_business_size', 40)->nullable();
            $table->foreignId('target_plan_id')->nullable()->constrained('plans')->nullOnDelete();
            $table->foreignId('landing_page_id')->nullable()->constrained('marketing_landing_pages')->nullOnDelete();
            $table->string('utm_source', 120)->nullable();
            $table->string('utm_medium', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->string('utm_term', 120)->nullable();
            $table->string('utm_content', 120)->nullable();
            // Cached counters, recomputed from the source tables by the reporting
            // service. Never the source of truth for money.
            $table->unsignedInteger('leads_count')->default(0);
            $table->unsignedInteger('registrations_count')->default(0);
            $table->unsignedInteger('conversions_count')->default(0);
            $table->decimal('attributed_revenue', 15, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'start_date']);
            $table->index('channel');
            $table->index('owner_id');
        });

        // Complete the landing page <-> campaign relationship now that both exist.
        Schema::table('marketing_landing_pages', function (Blueprint $table) {
            $table->foreign('campaign_id')->references('id')->on('marketing_campaigns')->nullOnDelete();
        });

        Schema::create('marketing_campaign_spends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('marketing_campaigns')->cascadeOnDelete();
            $table->date('period_start');
            $table->date('period_end');
            $table->string('channel', 30)->nullable();
            $table->decimal('amount', 15, 2);
            $table->char('currency', 3);
            // manual | google_ads | meta_ads — lets the UI state plainly whether a
            // figure was entered by hand or fetched from an ad platform.
            $table->string('source', 20)->default('manual');
            $table->timestamp('imported_at')->nullable();
            $table->string('notes')->nullable();
            $table->timestamps();

            $table->index(['campaign_id', 'period_start']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_campaign_spends');

        Schema::table('marketing_landing_pages', function (Blueprint $table) {
            $table->dropForeign(['campaign_id']);
        });

        Schema::dropIfExists('marketing_campaigns');
    }
};
