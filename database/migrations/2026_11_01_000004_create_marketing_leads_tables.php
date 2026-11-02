<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_leads', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email', 150);
            $table->string('phone', 40)->nullable();
            $table->string('business_name', 150)->nullable();
            $table->string('restaurant_category', 60)->nullable();
            $table->char('country', 2)->nullable();
            $table->string('city', 80)->nullable();
            $table->string('branches_count', 20)->nullable();
            $table->string('current_software', 120)->nullable();
            $table->string('source', 30)->default('manual');
            $table->string('channel', 30)->nullable();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->foreignId('landing_page_id')->nullable()->constrained('marketing_landing_pages')->nullOnDelete();
            $table->string('utm_source', 120)->nullable();
            $table->string('utm_medium', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->string('utm_term', 120)->nullable();
            $table->string('utm_content', 120)->nullable();
            $table->uuid('visitor_id')->nullable();
            $table->string('status', 30)->default('new');
            $table->unsignedInteger('score')->default(0);
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('assigned_at')->nullable();
            $table->text('notes')->nullable();
            $table->text('message')->nullable();
            $table->timestamp('follow_up_at')->nullable();
            $table->timestamp('last_contacted_at')->nullable();
            $table->boolean('consent_marketing')->default(false);
            $table->timestamp('consent_at')->nullable();
            $table->string('consent_ip_hash', 64)->nullable();
            // Set when the lead becomes a customer — the link to the existing tenant
            // record, so the customer is never duplicated.
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->timestamp('converted_at')->nullable();
            $table->string('lost_reason')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['status', 'follow_up_at']);
            $table->index('assigned_to');
            $table->index('email');
            $table->index('phone');
            $table->index('campaign_id');
            $table->index('created_at');
            $table->index('tenant_id');
        });

        Schema::create('marketing_lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_id')->constrained('marketing_leads')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 30);
            $table->string('title');
            $table->text('body')->nullable();
            $table->json('meta')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index(['lead_id', 'occurred_at']);
            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_lead_activities');
        Schema::dropIfExists('marketing_leads');
    }
};
