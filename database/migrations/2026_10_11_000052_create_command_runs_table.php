<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('command_runs', function (Blueprint $table) {
            $table->id();
            $table->string('command');
            $table->string('type', 20)->default('curated');
            $table->integer('exit_code')->nullable();
            $table->text('output')->nullable();
            $table->unsignedInteger('duration_ms')->nullable();
            $table->string('status', 20)->default('completed');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('command_runs');
    }
};
