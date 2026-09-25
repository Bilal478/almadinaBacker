<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Not every product a bakery makes has a real printed barcode (house-made items,
     * entered without a scanner) — the unique index already allows multiple NULLs, so this
     * needs no other change to keep barcodes that ARE set unique. */
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('barcode')->nullable(false)->change();
        });
    }
};
