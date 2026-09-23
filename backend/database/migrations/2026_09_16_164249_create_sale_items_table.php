<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * unit_price/unit_cost are permanent snapshots taken at sale time. A later price
     * change (product_prices) or further sales consuming other batches must NEVER alter
     * a row here — that is the whole point of the historical-pricing requirement.
     */
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sale_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->constrained();
            $table->string('name');
            $table->string('sku');
            $table->foreignId('unit_id')->constrained();
            $table->decimal('quantity', 15, 3);
            $table->decimal('unit_price', 15, 2);
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('discount', 15, 2)->default(0);
            $table->decimal('line_total', 15, 2);
            $table->decimal('total_cost', 15, 2);
            $table->decimal('gross_profit', 15, 2);
            // How much of this line has been returned so far (sale_returns can be partial).
            $table->decimal('returned_quantity', 15, 3)->default(0);
            $table->timestamps();

            $table->index('product_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
