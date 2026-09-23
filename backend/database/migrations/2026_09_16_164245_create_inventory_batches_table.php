<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inventory_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained();
            // Nullable: a product's opening stock (entered directly on the Add Product
            // screen) is a real batch with no purchase/supplier behind it.
            $table->foreignId('purchase_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained()->nullOnDelete();
            $table->string('batch_number');
            $table->date('purchase_date');
            $table->date('expiry_date')->nullable();
            $table->decimal('unit_cost', 15, 2);
            $table->decimal('original_quantity', 15, 3);
            $table->decimal('remaining_quantity', 15, 3);
            $table->enum('status', ['active', 'depleted'])->default('active');
            $table->timestamps();

            $table->index(['product_id', 'purchase_date']);
            $table->index('expiry_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('inventory_batches');
    }
};
