<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The public contact form asks what the enquiry is about, but the answer was
 * validated and then dropped, so the platform admin could not see it.
 *
 * Additive only: the column is nullable, so every existing lead keeps its row
 * and simply reads as "not specified".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('marketing_leads', function (Blueprint $table) {
            $table->string('inquiry_category', 40)->nullable()->after('restaurant_category');
        });
    }

    public function down(): void
    {
        Schema::table('marketing_leads', function (Blueprint $table) {
            $table->dropColumn('inquiry_category');
        });
    }
};
