<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Allow multiple gateway configurations (several named accounts).
        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->dropUnique('payment_gateways_provider_environment_unique');
        });

        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->string('name')->nullable()->after('id');
            $table->boolean('is_default')->default(false)->after('is_enabled');
            $table->unsignedInteger('sort_order')->default(0)->after('is_default');
        });
    }

    public function down(): void
    {
        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->dropColumn(['name', 'is_default', 'sort_order']);
        });

        Schema::table('payment_gateways', function (Blueprint $table) {
            $table->unique(['provider', 'environment']);
        });
    }
};
