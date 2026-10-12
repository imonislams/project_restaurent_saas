<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Modifiers / add-ons: reusable option groups linked to products. A group has
 * options with a price delta; orders snapshot the chosen options.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('modifier_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->string('name');
            $table->string('selection_type', 20)->default('single');
            $table->unsignedInteger('min_select')->default(0);
            $table->unsignedInteger('max_select')->default(1);
            $table->boolean('is_required')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'is_active']);
        });

        Schema::create('modifier_options', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('modifier_group_id')->constrained('modifier_groups')->cascadeOnDelete();
            $table->string('name');
            $table->string('sku')->nullable();
            $table->decimal('price_delta', 15, 2)->default(0);
            $table->boolean('is_default')->default(false);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['tenant_id', 'modifier_group_id']);
        });

        Schema::create('modifier_group_product', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('modifier_group_id')->constrained('modifier_groups')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['product_id', 'modifier_group_id']);
        });

        Schema::create('order_item_modifiers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('tenant_id')->constrained('tenants')->cascadeOnDelete();
            $table->foreignId('order_item_id')->constrained('order_items')->cascadeOnDelete();
            $table->foreignId('modifier_option_id')->nullable()->constrained('modifier_options')->nullOnDelete();
            $table->string('group_name');
            $table->string('name');
            $table->decimal('price_delta', 15, 2)->default(0);
            $table->decimal('quantity', 15, 3)->default(1);
            $table->timestamps();

            $table->index(['tenant_id', 'order_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_item_modifiers');
        Schema::dropIfExists('modifier_group_product');
        Schema::dropIfExists('modifier_options');
        Schema::dropIfExists('modifier_groups');
    }
};
