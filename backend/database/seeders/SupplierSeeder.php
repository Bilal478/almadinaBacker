<?php

namespace Database\Seeders;

use App\Models\Supplier;
use App\Models\SupplierType;
use Illuminate\Database\Seeder;

class SupplierSeeder extends Seeder
{
    public function run(): void
    {
        $typeId = fn (string $name) => SupplierType::where('name', $name)->value('id');

        $suppliers = [
            ['name' => 'Al-Rehman Flour Mills', 'phone' => '0300-1234567', 'address' => 'Industrial Area, Multan Road, Lahore', 'supplier_type_id' => $typeId('Flour & Grains'), 'opening_balance' => 15000, 'status' => 'active'],
            ['name' => 'Nestle Milk & Dairy Distributors', 'phone' => '0321-2345678', 'address' => 'Model Town, Lahore', 'supplier_type_id' => $typeId('Dairy'), 'opening_balance' => 0, 'status' => 'active'],
            ['name' => 'Crescent Packaging Co.', 'phone' => '0333-3456789', 'address' => 'Sundar Industrial Estate, Lahore', 'supplier_type_id' => $typeId('Packaging'), 'opening_balance' => 8000, 'status' => 'active'],
            ['name' => 'Al-Fateh Sugar Traders', 'phone' => '0345-4567890', 'address' => 'Shahalam Market, Lahore', 'supplier_type_id' => $typeId('Sugar & Confectionery'), 'opening_balance' => 0, 'status' => 'active'],
            ['name' => 'Punjab Fresh Beverages', 'phone' => '0301-5678901', 'address' => 'Township, Lahore', 'supplier_type_id' => $typeId('Beverages'), 'opening_balance' => 0, 'status' => 'active'],
            ['name' => 'Zainab Confectionery Supplies', 'phone' => '0312-6789012', 'address' => 'Anarkali Bazaar, Lahore', 'supplier_type_id' => $typeId('Sugar & Confectionery'), 'opening_balance' => 0, 'status' => 'inactive'],
        ];

        foreach ($suppliers as $supplier) {
            Supplier::updateOrCreate(['name' => $supplier['name']], $supplier);
        }
    }
}
