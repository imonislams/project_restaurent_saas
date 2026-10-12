<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Wire QR dining into the existing order lifecycle without forking it: orders
 * gain a source, an optional dining session/participant and a staff
 * acceptance state. `user_id` becomes nullable because a customer-placed QR
 * order has no staff cashier.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('source', 20)->default('pos')->after('order_type');
            $table->foreignId('dining_session_id')->nullable()->after('table_id')->constrained('dining_sessions')->nullOnDelete();
            $table->foreignId('dining_participant_id')->nullable()->after('dining_session_id')->constrained('dining_participants')->nullOnDelete();
            $table->string('acceptance_status', 20)->default('auto_accepted')->after('status');
            $table->timestamp('accepted_at')->nullable()->after('completed_at');
            $table->timestamp('rejected_at')->nullable()->after('accepted_at');
            $table->string('rejected_reason')->nullable()->after('rejected_at');

            $table->index(['tenant_id', 'source']);
            $table->index(['tenant_id', 'dining_session_id']);
        });

        // A QR order is placed by a customer, not a staff user.
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->change();
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->decimal('modifiers_total', 15, 2)->default(0)->after('discount_amount');
        });

        Schema::table('kitchen_ticket_items', function (Blueprint $table) {
            $table->json('modifiers')->nullable()->after('notes');
        });
    }

    public function down(): void
    {
        Schema::table('kitchen_ticket_items', function (Blueprint $table) {
            $table->dropColumn('modifiers');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn('modifiers_total');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['tenant_id', 'source']);
            $table->dropIndex(['tenant_id', 'dining_session_id']);
            $table->dropConstrainedForeignId('dining_participant_id');
            $table->dropConstrainedForeignId('dining_session_id');
            $table->dropColumn(['source', 'acceptance_status', 'accepted_at', 'rejected_at', 'rejected_reason']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable(false)->change();
        });
    }
};
