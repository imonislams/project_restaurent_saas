<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Customer segmentation & marketing fields: a consent flag and free-form tags.
 * RFM metrics are derived from orders, never stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->boolean('is_marketing_opt_in')->default(true)->after('is_active');
            $table->json('tags')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropColumn(['is_marketing_opt_in', 'tags']);
        });
    }
};
