<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            // Which audience a plan is priced for: global | bd | international.
            $table->string('region', 20)->default('global')->after('visibility');
            $table->boolean('is_featured')->default(false)->after('region');

            $table->index('region');
        });

        // Existing plans are the International ladder (per the pricing decision).
        // Only the newly added columns are touched; existing rows are preserved.
        DB::table('plans')->update(['region' => 'international']);
        DB::table('plans')->where('slug', 'growth')->update(['is_featured' => true]);
    }

    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropIndex(['region']);
            $table->dropColumn(['region', 'is_featured']);
        });
    }
};
