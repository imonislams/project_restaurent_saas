<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_segments', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('description')->nullable();
            $table->string('type', 20)->default('dynamic');
            $table->json('rules')->nullable();
            $table->unsignedInteger('member_count')->default(0);
            $table->timestamp('last_evaluated_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('type');
        });

        Schema::create('marketing_subscribers', function (Blueprint $table) {
            $table->id();
            $table->string('email', 150)->unique();
            $table->string('name')->nullable();
            $table->foreignId('lead_id')->nullable()->constrained('marketing_leads')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('source', 40)->nullable();
            $table->string('status', 20)->default('subscribed');
            $table->timestamp('consent_at')->nullable();
            $table->string('consent_source', 40)->nullable();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->string('unsubscribe_reason')->nullable();
            $table->string('locale', 5)->default('en');
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index('status');
        });

        Schema::create('marketing_email_suppressions', function (Blueprint $table) {
            $table->id();
            $table->string('email', 150)->unique();
            $table->string('reason', 30)->default('unsubscribe');
            $table->foreignId('added_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('marketing_email_sends', function (Blueprint $table) {
            $table->id();
            $table->foreignId('campaign_id')->constrained('campaigns')->cascadeOnDelete();
            $table->foreignId('lead_id')->nullable()->constrained('marketing_leads')->nullOnDelete();
            $table->foreignId('subscriber_id')->nullable()->constrained('marketing_subscribers')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('email', 150);
            $table->uuid('token')->unique();
            $table->string('status', 20)->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('first_click_at')->nullable();
            $table->timestamp('bounced_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('unsubscribed_at')->nullable();
            $table->unsignedInteger('click_count')->default(0);
            $table->text('error')->nullable();
            $table->timestamps();

            // One send per recipient per campaign.
            $table->unique(['campaign_id', 'email']);
            $table->index('status');
            $table->index('email');
        });

        Schema::create('marketing_email_clicks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('send_id')->constrained('marketing_email_sends')->cascadeOnDelete();
            $table->string('url', 1000);
            $table->string('user_agent', 500)->nullable();
            $table->string('ip_hash', 64)->nullable();
            $table->timestamp('created_at')->nullable();

            $table->index('send_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_email_clicks');
        Schema::dropIfExists('marketing_email_sends');
        Schema::dropIfExists('marketing_email_suppressions');
        Schema::dropIfExists('marketing_subscribers');
        Schema::dropIfExists('marketing_segments');
    }
};
