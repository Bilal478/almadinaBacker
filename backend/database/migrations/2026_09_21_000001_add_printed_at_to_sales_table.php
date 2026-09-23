<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Tracks whether a sale's receipt was actually printed — a thermal printer can jam,
     * run out of paper, or be off, and the cashier needs to tell "printed" apart from
     * "completed but never printed" so they know which receipts to reprint. */
    public function up(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->timestamp('printed_at')->nullable()->after('status');
        });
    }

    public function down(): void
    {
        Schema::table('sales', function (Blueprint $table) {
            $table->dropColumn('printed_at');
        });
    }
};
