<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Stores the rendered message body so the email operations center can preview
 * what was actually delivered. Additive and nullable — rows logged before this
 * change simply have no body to preview.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->longText('body')->nullable()->after('subject');
            $table->string('content_type', 20)->nullable()->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('email_logs', function (Blueprint $table) {
            $table->dropColumn(['body', 'content_type']);
        });
    }
};
