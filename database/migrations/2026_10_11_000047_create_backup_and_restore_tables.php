<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backups', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 20);
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('path');
            $table->string('disk', 30)->default('local');
            $table->unsignedBigInteger('bytes')->default(0);
            $table->string('checksum', 64)->nullable();
            $table->boolean('encrypted')->default(false);
            $table->string('status', 20)->default('completed');
            $table->unsignedInteger('tables_count')->default(0);
            $table->unsignedInteger('rows_count')->default(0);
            $table->timestamp('verified_at')->nullable();
            $table->string('verification_result', 20)->nullable();
            $table->text('verification_notes')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['scope', 'tenant_id']);
            $table->index('expires_at');
        });

        Schema::create('backup_restores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('backup_id')->constrained('backups')->cascadeOnDelete();
            $table->foreignId('tenant_id')->nullable()->constrained('tenants')->nullOnDelete();
            $table->string('scope', 20)->default('tenant');
            $table->string('reason');
            $table->string('status', 20)->default('pending');
            $table->foreignId('checkpoint_backup_id')->nullable()->constrained('backups')->nullOnDelete();
            $table->foreignId('requested_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('verification')->nullable();
            $table->text('error')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backup_restores');
        Schema::dropIfExists('backups');
    }
};
