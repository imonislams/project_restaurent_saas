<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The plan/interval an invoice bills for. A pending plan change issues an
        // invoice for the *target* plan while the subscription keeps its old one.
        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('subscription_id')->constrained('plans')->nullOnDelete();
            $table->string('billing_cycle', 20)->nullable()->after('plan_id');
        });

        // A requested-but-unpaid plan change. The live plan_id/billing_cycle are
        // only updated once the pending invoice settles.
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->foreignId('pending_plan_id')->nullable()->after('plan_id')->constrained('plans')->nullOnDelete();
            $table->string('pending_billing_cycle', 20)->nullable()->after('pending_plan_id');
            $table->foreignId('pending_invoice_id')->nullable()->after('pending_billing_cycle')->constrained('subscription_invoices')->nullOnDelete();
            $table->timestamp('pending_since')->nullable()->after('pending_invoice_id');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('pending_invoice_id');
            $table->dropConstrainedForeignId('pending_plan_id');
            $table->dropColumn(['pending_billing_cycle', 'pending_since']);
        });

        Schema::table('subscription_invoices', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn('billing_cycle');
        });
    }
};
