<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tenant-configured payment gateways used to collect *customer* payments
 * (POS online methods and QR ordering). A tenant may enable several at once
 * (e.g. cash + SSLCommerz + bKash); one is the default. Credentials are
 * encrypted at rest via the model cast.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenant_gateways', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('provider', 40);
            $table->string('environment', 20)->default('sandbox');
            $table->boolean('is_enabled')->default(false);
            $table->boolean('is_default')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->json('supported_currencies')->nullable();
            $table->text('credentials')->nullable();
            $table->json('settings')->nullable();
            $table->string('health_status', 20)->nullable();
            $table->timestamp('last_ok_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['tenant_id', 'is_enabled']);
            $table->unique(['tenant_id', 'provider', 'environment']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenant_gateways');
    }
};
