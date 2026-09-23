<?php

namespace Database\Seeders;

use App\Models\SupplierType;
use Illuminate\Database\Seeder;

class SupplierTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['name' => 'Flour & Grains', 'description' => 'Wheat flour, maida, oats and grain suppliers'],
            ['name' => 'Dairy', 'description' => 'Milk, cream, butter and cheese suppliers'],
            ['name' => 'Packaging', 'description' => 'Boxes, bags, wrappers and labels'],
            ['name' => 'Sugar & Confectionery', 'description' => 'Sugar, chocolate, syrups and toppings'],
            ['name' => 'Beverages', 'description' => 'Juice and beverage suppliers'],
        ];

        foreach ($types as $type) {
            SupplierType::updateOrCreate(['name' => $type['name']], $type + ['status' => 'active']);
        }
    }
}
