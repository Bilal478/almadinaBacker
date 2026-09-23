<?php

namespace Database\Factories;

use App\Models\SupplierType;
use Illuminate\Database\Eloquent\Factories\Factory;

class SupplierFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'phone' => fake()->phoneNumber(),
            'address' => fake()->address(),
            'supplier_type_id' => SupplierType::factory(),
            'opening_balance' => 0,
            'status' => 'active',
        ];
    }
}
