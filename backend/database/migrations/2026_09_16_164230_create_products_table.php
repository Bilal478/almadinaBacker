<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku')->unique();
            $table->string('barcode')->unique();
            $table->string('qr_code')->nullable();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('unit_id')->constrained();
            // Denormalized cache of the latest product_prices row, kept in sync by
            // ProductPriceService — read here for speed (POS search must be fast),
            // never trusted as the historical source of truth (that's product_prices).
            $table->decimal('current_purchase_cost', 15, 2)->default(0);
            $table->decimal('current_customer_price', 15, 2)->default(0);
            $table->decimal('current_retailer_price', 15, 2)->default(0);
            $table->integer('low_stock_alert_qty')->default(0);
            $table->boolean('expiry_controlled')->default(true);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();

            $table->index('name');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
