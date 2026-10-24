<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Which gateway configurations may be used to pay for which plans.
        // An empty mapping for a gateway means "no plan restriction".
        Schema::create('payment_gateway_plan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_gateway_id')->constrained('payment_gateways')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['payment_gateway_id', 'plan_id']);
            $table->index('plan_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_gateway_plan');
    }
};
