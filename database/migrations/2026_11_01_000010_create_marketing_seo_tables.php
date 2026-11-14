<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('marketing_seo_meta', function (Blueprint $table) {
            $table->id();
            $table->string('route_key', 120)->unique();
            $table->string('path', 255)->nullable();
            $table->string('title', 200)->nullable();
            $table->string('description', 320)->nullable();
            $table->string('canonical', 500)->nullable();
            $table->string('og_title', 200)->nullable();
            $table->string('og_description', 320)->nullable();
            $table->string('og_image', 500)->nullable();
            $table->string('og_type', 30)->nullable();
            $table->string('twitter_card', 30)->nullable();
            $table->string('robots', 60)->nullable();
            $table->json('schema')->nullable();
            $table->json('alt_texts')->nullable();
            // A NULL field inherits the global default, so a page can never be left
            // without metadata.
            $table->boolean('is_auto')->default(true);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('is_auto');
        });

        Schema::create('marketing_sitemap_entries', function (Blueprint $table) {
            $table->id();
            $table->string('path', 500)->unique();
            $table->decimal('priority', 2, 1)->nullable();
            $table->string('changefreq', 20)->nullable();
            $table->boolean('is_enabled')->default(true);
            $table->date('lastmod')->nullable();
            $table->string('source', 30)->default('route');
            $table->timestamps();
        });

        Schema::create('marketing_redirects', function (Blueprint $table) {
            $table->id();
            $table->string('from_path', 500)->unique();
            $table->string('to_url', 1000);
            $table->unsignedSmallInteger('status_code')->default(301);
            $table->boolean('is_active')->default(true);
            $table->unsignedBigInteger('hits')->default(0);
            $table->timestamp('last_hit_at')->nullable();
            $table->string('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('marketing_redirects');
        Schema::dropIfExists('marketing_sitemap_entries');
        Schema::dropIfExists('marketing_seo_meta');
    }
};
