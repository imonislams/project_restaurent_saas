<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_landing_pages', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('title')->nullable();
            $table->json('seo_meta')->nullable();
            // Block schema rendered by the existing public marketing components.
            $table->json('sections')->nullable();
            $table->string('status', 20)->default('draft');
            // The campaigns foreign key is added in the campaigns migration so the
            // two tables can reference each other without a circular create.
            $table->unsignedBigInteger('campaign_id')->nullable();
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('lead_count')->default(0);
            $table->timestamp('published_at')->nullable();
            $table->string('preview_token', 64)->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
            $table->index('campaign_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_landing_pages');
    }
};
