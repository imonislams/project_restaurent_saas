<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('coupon_id')->nullable()->after('plan_id')->constrained('coupons')->nullOnDelete();
            $table->timestamp('grace_ends_at')->nullable()->after('current_period_end');
            $table->boolean('cancel_at_period_end')->default(false)->after('grace_ends_at');
            $table->json('plan_snapshot')->nullable()->after('provider_ref');
            $table->unsignedInteger('plan_version')->nullable()->after('plan_snapshot');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('coupon_id');
            $table->dropColumn(['grace_ends_at', 'cancel_at_period_end', 'plan_snapshot', 'plan_version']);
        });
    }
};
