<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Append-only price history. Each row is one "price change event" bundling all three
     * prices together (matches how the frontend's Price History screen displays and records
     * a change) rather than one row per individual price field — a change is always an
     * INSERT, never an UPDATE, so a sale's snapshot never drifts when a later price change
     * happens.
     */
    public function up(): void
    {
        Schema::create('product_prices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->date('effective_from');
            $table->decimal('purchase_cost', 15, 2);
            $table->decimal('customer_price', 15, 2);
            $table->decimal('retailer_price', 15, 2);
            $table->string('note')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['product_id', 'effective_from']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_prices');
    }
};
