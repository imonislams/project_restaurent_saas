<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->foreignId('confirmed_by_user_id')->nullable()->after('rejected_reason')
                ->constrained('users')->nullOnDelete();
            $table->foreignId('rejected_by_user_id')->nullable()->after('confirmed_by_user_id')
                ->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropConstrainedForeignId('confirmed_by_user_id');
            $table->dropConstrainedForeignId('rejected_by_user_id');
        });
    }
};
