<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends the existing tenant-blast `campaigns` table into a full marketing email
 * campaign, and links coupons to a marketing campaign so promotional offers can be
 * associated with the campaign that drove them.
 *
 * Additive only: every column is nullable or defaulted, and no existing row is
 * rewritten. Coupon validation and redemption stay untouched in CouponService.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('campaigns', function (Blueprint $table) {
            $table->string('channel', 30)->default('email')->after('body');
            $table->string('template_key', 60)->nullable()->after('channel');
            $table->foreignId('segment_id')->nullable()->after('template_key')
                ->constrained('marketing_segments')->nullOnDelete();
            $table->string('from_name')->nullable()->after('segment_id');
            $table->string('from_email', 150)->nullable()->after('from_name');
            $table->string('reply_to', 150)->nullable()->after('from_email');
            $table->foreignId('marketing_campaign_id')->nullable()->after('reply_to')
                ->constrained('marketing_campaigns')->nullOnDelete();
            $table->json('utm')->nullable()->after('marketing_campaign_id');
            $table->boolean('track_opens')->default(true)->after('utm');
            $table->boolean('track_clicks')->default(true)->after('track_opens');
            $table->string('scheduled_timezone', 64)->nullable()->after('scheduled_at');
            $table->unsignedInteger('total_recipients')->default(0)->after('recipients_count');
            $table->unsignedInteger('sent_count')->default(0)->after('total_recipients');
            $table->unsignedInteger('failed_count')->default(0)->after('sent_count');
            $table->unsignedInteger('open_count')->default(0)->after('failed_count');
            $table->unsignedInteger('click_count')->default(0)->after('open_count');
            $table->unsignedInteger('bounce_count')->default(0)->after('click_count');
            $table->unsignedInteger('unsubscribe_count')->default(0)->after('bounce_count');
        });

        Schema::table('coupons', function (Blueprint $table) {
            $table->foreignId('marketing_campaign_id')->nullable()->after('applies_to_plan_ids')
                ->constrained('marketing_campaigns')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->dropConstrainedForeignId('marketing_campaign_id');
        });

        Schema::table('campaigns', function (Blueprint $table) {
            $table->dropConstrainedForeignId('segment_id');
            $table->dropConstrainedForeignId('marketing_campaign_id');

            $table->dropColumn([
                'channel', 'template_key', 'from_name', 'from_email', 'reply_to',
                'utm', 'track_opens', 'track_clicks', 'scheduled_timezone',
                'total_recipients', 'sent_count', 'failed_count',
                'open_count', 'click_count', 'bounce_count', 'unsubscribe_count',
            ]);
        });
    }
};
