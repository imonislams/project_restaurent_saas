<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('coupons', function (Blueprint $table) {
            $table->boolean('auto_apply')->default(false)->after('is_active');
            $table->boolean('first_purchase_only')->default(false)->after('auto_apply');
            $table->decimal('min_amount', 15, 2)->nullable()->after('first_purchase_only');
            $table->unsignedInteger('per_tenant_limit')->nullable()->after('min_amount');
            $table->json('applies_to_plan_ids')->nullable()->after('per_tenant_limit');
        });

        Schema::create('campaigns', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('subject');
            $table->longText('body');
            $table->json('audience')->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('scheduled_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->unsignedInteger('recipients_count')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('announcements', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('body');
            $table->string('level', 20)->default('info');
            $table->json('audience')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('announcements');
        Schema::dropIfExists('campaigns');

        Schema::table('coupons', function (Blueprint $table) {
            $table->dropColumn(['auto_apply', 'first_purchase_only', 'min_amount', 'per_tenant_limit', 'applies_to_plan_ids']);
        });
    }
};
