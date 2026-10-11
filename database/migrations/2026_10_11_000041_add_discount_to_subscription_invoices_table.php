<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->decimal('subtotal', 15, 2)->default(0)->after('amount');
            $table->decimal('discount_amount', 15, 2)->default(0)->after('subtotal');
            $table->string('coupon_code')->nullable()->after('discount_amount');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn(['subtotal', 'discount_amount', 'coupon_code']);
        });
    }
};
