<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Public, rotatable QR identity for a table. The token is opaque and high
 * entropy; it identifies the table only (never a session or a customer).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('table_qr_tokens', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->foreignId('table_id')->constrained('tables')->cascadeOnDelete();
            $table->string('token', 64)->unique();
            $table->boolean('is_active')->default(true);
            $table->timestamp('revoked_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('scan_count')->default(0);
            $table->timestamp('last_scanned_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'table_id']);
            $table->index(['tenant_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('table_qr_tokens');
    }
};
