<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Append-only: a consent change writes a new row, an existing row is never
        // modified. There is deliberately no updated_at.
        Schema::create('marketing_consent_records', function (Blueprint $table) {
            $table->id();
            $table->uuid('visitor_id')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->json('categories');
            $table->string('version', 20)->default('1');
            $table->string('action', 20)->default('granted');
            $table->string('ip_hash', 64)->nullable();
            $table->string('user_agent', 500)->nullable();
            $table->string('source', 30)->default('banner');
            $table->timestamp('created_at')->nullable();

            $table->index(['visitor_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_consent_records');
    }
};
