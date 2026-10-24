<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Provider-specific product/price identifiers per plan/currency/interval,
        // e.g. {"paddle": {"product_id": "pro_...", "price_id": "pri_..."}}.
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->json('provider_prices')->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('plan_prices', function (Blueprint $table) {
            $table->dropColumn('provider_prices');
        });
    }
};
