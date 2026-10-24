<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Immutable customer/billing details captured when the invoice is issued,
        // so historical invoices keep the details they were billed to.
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->json('billing_snapshot')->nullable()->after('provider_ref');
        });
    }

    public function down(): void
    {
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropColumn('billing_snapshot');
        });
    }
};
