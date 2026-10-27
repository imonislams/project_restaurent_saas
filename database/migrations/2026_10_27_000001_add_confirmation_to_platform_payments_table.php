<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('platform_payments', function (Blueprint $table) {
            $table->foreignId('confirmed_by')->nullable()->after('paid_at')->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable()->after('confirmed_by');
            $table->text('confirmation_note')->nullable()->after('confirmed_at');
        });
    }

    public function down(): void
    {
        Schema::table('platform_payments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confirmed_by');
            $table->dropColumn(['confirmed_at', 'confirmation_note']);
        });
    }
};
