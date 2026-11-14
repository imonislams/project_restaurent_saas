<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_visitors', function (Blueprint $table) {
            $table->id();
            // The first-party md_vid cookie value. Not an advertising identifier:
            // it is server-readable and disclosed in the cookie policy.
            $table->uuid('visitor_id')->unique();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->string('first_path', 500)->nullable();
            $table->string('last_path', 500)->nullable();
            $table->string('first_referrer', 500)->nullable();
            $table->string('last_referrer', 500)->nullable();
            $table->string('first_source', 120)->nullable();
            $table->string('first_medium', 120)->nullable();
            $table->string('first_campaign', 120)->nullable();
            $table->string('first_term', 120)->nullable();
            $table->string('first_content', 120)->nullable();
            $table->string('last_source', 120)->nullable();
            $table->string('last_medium', 120)->nullable();
            $table->string('last_campaign', 120)->nullable();
            $table->string('last_term', 120)->nullable();
            $table->string('last_content', 120)->nullable();
            $table->string('channel', 30)->nullable();
            $table->string('device', 20)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->char('country', 2)->nullable();
            // SHA-256 only. A raw IP address is never stored.
            $table->string('ip_hash', 64)->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->boolean('is_bot')->default(false);
            $table->unsignedInteger('pageview_count')->default(0);
            $table->timestamps();

            $table->index('channel');
            $table->index('country');
            $table->index('user_id');
            $table->index('tenant_id');
            $table->index('last_seen_at');
        });

        Schema::create('marketing_events', function (Blueprint $table) {
            $table->id();
            // The dedupe key. Stable across retries, and shared with the browser
            // pixel so Meta can deduplicate browser + server delivery.
            $table->uuid('event_id')->unique();
            $table->string('name', 60);
            $table->string('category', 20)->default('analytics');
            $table->string('source', 20)->default('server');
            $table->uuid('visitor_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('marketing_leads')->nullOnDelete();
            $table->foreignId('campaign_id')->nullable()->constrained('marketing_campaigns')->nullOnDelete();
            $table->foreignId('landing_page_id')->nullable()->constrained('marketing_landing_pages')->nullOnDelete();
            $table->timestamp('occurred_at');
            $table->string('path', 500)->nullable();
            $table->string('url', 500)->nullable();
            $table->string('referrer', 500)->nullable();
            $table->string('utm_source', 120)->nullable();
            $table->string('utm_medium', 120)->nullable();
            $table->string('utm_campaign', 120)->nullable();
            $table->string('utm_term', 120)->nullable();
            $table->string('utm_content', 120)->nullable();
            $table->string('channel', 30)->nullable();
            $table->string('device', 20)->nullable();
            $table->char('country', 2)->nullable();
            $table->decimal('value', 15, 2)->nullable();
            $table->char('currency', 3)->nullable();
            $table->json('properties')->nullable();
            $table->timestamps();

            $table->index(['name', 'occurred_at']);
            $table->index('visitor_id');
            $table->index('tenant_id');
            $table->index('campaign_id');
            $table->index('occurred_at');
        });

        Schema::create('marketing_event_deliveries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('marketing_event_id')->constrained('marketing_events')->cascadeOnDelete();
            $table->string('provider', 40);
            $table->string('external_event_id', 120);
            $table->string('status', 20)->default('pending');
            $table->unsignedInteger('attempts')->default(0);
            $table->unsignedInteger('http_status')->nullable();
            $table->text('response')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamps();

            // The dedupe guarantee: replaying a delivery cannot send twice.
            $table->unique(['provider', 'external_event_id']);
            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_event_deliveries');
        Schema::dropIfExists('marketing_events');
        Schema::dropIfExists('marketing_visitors');
    }
};
