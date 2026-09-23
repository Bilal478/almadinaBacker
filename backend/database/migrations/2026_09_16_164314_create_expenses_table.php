<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('category_id')->constrained('expense_categories');
            $table->decimal('amount', 15, 2);
            $table->date('expense_date');
            $table->string('description');
            $table->string('reference')->nullable();
            $table->enum('payment_method', ['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER'])->default('CASH');
            $table->enum('status', ['active', 'void'])->default('active');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index('expense_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expenses');
    }
};
