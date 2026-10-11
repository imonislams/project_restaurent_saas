<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->string('currency', 3)->default('USD')->after('description');
            $table->string('visibility', 20)->default('public')->after('is_active');
            $table->unsignedInteger('version')->default(1)->after('visibility');
            $table->timestamp('archived_at')->nullable()->after('version');
        });

        Schema::create('plan_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plan_id')->constrained('plans')->cascadeOnDelete();
            $table->string('currency', 3);
            $table->string('interval', 20);
            $table->decimal('price', 15, 2);
            $table->timestamps();

            $table->unique(['plan_id', 'currency', 'interval']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_prices');

        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['currency', 'visibility', 'version', 'archived_at']);
        });
    }
};
