<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_gateways', function (Blueprint $table) {
            $table->id();
            $table->string('provider', 40);
            $table->string('environment', 20)->default('sandbox');
            $table->boolean('is_enabled')->default(false);
            $table->json('supported_currencies')->nullable();
            // Credentials are encrypted at rest via the model's encrypted cast.
            $table->text('credentials')->nullable();
            $table->json('settings')->nullable();
            $table->string('health_status', 20)->nullable();
            $table->timestamp('last_ok_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->unique(['provider', 'environment']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_gateways');
    }
};
