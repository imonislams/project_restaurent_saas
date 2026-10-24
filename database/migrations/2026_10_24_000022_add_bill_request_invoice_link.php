<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Links a customer bill request to the invoice it refers to (when one already
 * exists), so staff can open the existing bill instead of creating a duplicate.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bill_requests', function (Blueprint $table) {
            $table->foreignId('invoice_id')->nullable()->after('dining_session_id')
                ->constrained('invoices')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('bill_requests', function (Blueprint $table) {
            $table->dropConstrainedForeignId('invoice_id');
        });
    }
};
