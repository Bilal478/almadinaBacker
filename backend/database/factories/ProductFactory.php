<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    public function definition(): array
    {
        $sku = 'SKU-' . fake()->unique()->numberBetween(10000, 99999);

        return [
            'name' => fake()->unique()->words(2, true),
            'sku' => $sku,
            'barcode' => fake()->unique()->ean13(),
            'category_id' => Category::factory(),
            'unit_id' => Unit::factory(),
            'current_purchase_cost' => 0,
            'current_customer_price' => 0,
            'current_retailer_price' => 0,
            'low_stock_alert_qty' => 10,
            'expiry_controlled' => true,
            'status' => 'active',
        ];
    }
}
