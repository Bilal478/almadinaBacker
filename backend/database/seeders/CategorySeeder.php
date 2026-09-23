<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        foreach (['Bakery', 'Dairy', 'Snacks', 'Beverages'] as $name) {
            Category::updateOrCreate(['name' => $name], ['status' => 'active']);
        }
    }
}
