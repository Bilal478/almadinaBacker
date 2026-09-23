<?php

namespace Database\Seeders;

use App\Models\Unit;
use Illuminate\Database\Seeder;

class UnitSeeder extends Seeder
{
    public function run(): void
    {
        $units = [
            ['name' => 'Pieces', 'symbol' => 'pcs', 'decimal_allowed' => false],
            ['name' => 'Kilogram', 'symbol' => 'kg', 'decimal_allowed' => true],
            ['name' => 'Gram', 'symbol' => 'g', 'decimal_allowed' => true],
            ['name' => 'Litre', 'symbol' => 'ltr', 'decimal_allowed' => true],
            ['name' => 'Millilitre', 'symbol' => 'ml', 'decimal_allowed' => true],
            ['name' => 'Box', 'symbol' => 'box', 'decimal_allowed' => false],
            ['name' => 'Dozen', 'symbol' => 'dozen', 'decimal_allowed' => false],
            ['name' => 'Pack', 'symbol' => 'pack', 'decimal_allowed' => false],
            ['name' => 'Tray', 'symbol' => 'tray', 'decimal_allowed' => false],
        ];

        foreach ($units as $unit) {
            Unit::updateOrCreate(['symbol' => $unit['symbol']], $unit + ['status' => 'active']);
        }
    }
}
