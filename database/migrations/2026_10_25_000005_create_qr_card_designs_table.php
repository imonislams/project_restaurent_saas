<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Named QR card designs printed for the tables. A design with a null branch_id
 * is the tenant-wide default, used by any branch that has no active design of
 * its own. The canvas is an editor document (elements positioned in millimetres)
 * so the printed card stays faithful to the on-screen design.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('qr_card_designs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained('branches')->cascadeOnDelete();
            $table->string('name');
            $table->json('canvas');
            $table->boolean('is_active')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['tenant_id', 'branch_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('qr_card_designs');
    }
};
