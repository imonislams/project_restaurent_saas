<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->string('onboarding_step')->nullable()->after('onboarding_completed_at');
            $table->timestamp('first_sale_at')->nullable()->after('onboarding_step');
        });
    }

    public function down(): void
    {
        Schema::table('tenants', function (Blueprint $table) {
            $table->dropColumn(['onboarding_step', 'first_sale_at']);
        });
    }
};
