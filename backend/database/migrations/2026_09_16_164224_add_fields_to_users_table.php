<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->unique()->after('name');
            $table->string('phone')->nullable()->after('username');
            $table->foreignId('role_id')->nullable()->after('phone')->constrained()->nullOnDelete();
            $table->enum('status', ['active', 'inactive'])->default('active')->after('role_id');
            $table->string('counter')->nullable()->after('status');
        });

        // Sanctum tokens belong to a user — created by the earlier install:api migration,
        // nothing to add here, just documenting the relationship for readers of this file.
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['role_id']);
            $table->dropColumn(['username', 'phone', 'role_id', 'status', 'counter']);
        });
    }
};
