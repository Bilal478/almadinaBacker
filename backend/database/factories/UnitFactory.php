<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Pieces',
            'symbol' => 'pcs-' . fake()->unique()->numberBetween(1, 100000),
            'decimal_allowed' => false,
            'status' => 'active',
        ];
    }
}
