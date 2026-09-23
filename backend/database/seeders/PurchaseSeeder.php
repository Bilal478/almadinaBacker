<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Services\Purchases\PurchaseService;
use Illuminate\Database\Seeder;

class PurchaseSeeder extends Seeder
{
    public function run(): void
    {
        if (Purchase::count() > 0) {
            return; // seeded already — PurchaseService generates sequential invoice numbers, not safe to re-run
        }

        $service = app(PurchaseService::class);
        $supplierId = fn (string $name) => Supplier::where('name', $name)->value('id');
        $productId = fn (string $sku) => Product::where('sku', $sku)->value('id');

        $flourMill = $supplierId('Al-Rehman Flour Mills');
        $sugarTrader = $supplierId('Al-Fateh Sugar Traders');
        $dairy = $supplierId('Nestle Milk & Dairy Distributors');
        $beverages = $supplierId('Punjab Fresh Beverages');

        // January purchases
        $service->create([
            'supplier_id' => $flourMill, 'purchase_date' => '2026-01-08', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('BRD-001'), 'quantity' => 200, 'purchase_cost' => 45, 'batch_number' => 'BRD-B1'],
                ['product_id' => $productId('RSK-001'), 'quantity' => 150, 'purchase_cost' => 60, 'batch_number' => 'RSK-B1'],
                ['product_id' => $productId('CRS-001'), 'quantity' => 150, 'purchase_cost' => 55, 'batch_number' => 'CRS-B1'],
                ['product_id' => $productId('DNT-001'), 'quantity' => 150, 'purchase_cost' => 40, 'batch_number' => 'DNT-B1'],
                ['product_id' => $productId('CUP-001'), 'quantity' => 150, 'purchase_cost' => 45, 'batch_number' => 'CUP-B1'],
                ['product_id' => $productId('PST-001'), 'quantity' => 120, 'purchase_cost' => 70, 'batch_number' => 'PST-B1'],
                ['product_id' => $productId('CAK-001'), 'quantity' => 40, 'purchase_cost' => 500, 'batch_number' => 'CAK-B1'],
            ],
        ]);

        $service->create([
            'supplier_id' => $sugarTrader, 'purchase_date' => '2026-01-10', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('BIS-001'), 'quantity' => 100, 'purchase_cost' => 50, 'batch_number' => 'BIS-B1'],
                ['product_id' => $productId('CHC-001'), 'quantity' => 200, 'purchase_cost' => 40, 'batch_number' => 'CHC-B1'],
            ],
        ]);

        $service->create([
            'supplier_id' => $dairy, 'purchase_date' => '2026-01-12', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('MLK-001'), 'quantity' => 300, 'purchase_cost' => 180, 'batch_number' => 'MLK-B1'],
                ['product_id' => $productId('CRM-001'), 'quantity' => 100, 'purchase_cost' => 120, 'batch_number' => 'CRM-B1'],
            ],
        ]);

        $service->create([
            'supplier_id' => $beverages, 'purchase_date' => '2026-01-15', 'paid_amount' => 0,
            'items' => [['product_id' => $productId('JUC-001'), 'quantity' => 200, 'purchase_cost' => 140, 'batch_number' => 'JUC-B1']],
        ]);

        // September purchases (Premium Biscuits cost/price increase lands here)
        $service->create([
            'supplier_id' => $sugarTrader, 'purchase_date' => '2026-09-05', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('BIS-001'), 'quantity' => 100, 'purchase_cost' => 55, 'batch_number' => 'BIS-B2'],
                ['product_id' => $productId('CHC-001'), 'quantity' => 150, 'purchase_cost' => 45, 'batch_number' => 'CHC-B2', 'expiry_date' => '2027-03-01'],
            ],
        ]);

        $service->create([
            'supplier_id' => $flourMill, 'purchase_date' => '2026-09-08', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('BRD-001'), 'quantity' => 250, 'purchase_cost' => 48, 'batch_number' => 'BRD-B2', 'expiry_date' => '2026-10-05'],
                ['product_id' => $productId('RSK-001'), 'quantity' => 150, 'purchase_cost' => 62, 'batch_number' => 'RSK-B2', 'expiry_date' => '2026-11-01'],
                ['product_id' => $productId('CRS-001'), 'quantity' => 150, 'purchase_cost' => 58, 'batch_number' => 'CRS-B2', 'expiry_date' => '2026-09-25'],
                ['product_id' => $productId('DNT-001'), 'quantity' => 150, 'purchase_cost' => 42, 'batch_number' => 'DNT-B2', 'expiry_date' => '2026-09-18'],
                ['product_id' => $productId('CUP-001'), 'quantity' => 150, 'purchase_cost' => 47, 'batch_number' => 'CUP-B2', 'expiry_date' => '2026-09-22'],
                ['product_id' => $productId('PST-001'), 'quantity' => 120, 'purchase_cost' => 74, 'batch_number' => 'PST-B2', 'expiry_date' => '2026-09-20'],
                ['product_id' => $productId('CAK-001'), 'quantity' => 45, 'purchase_cost' => 540, 'batch_number' => 'CAK-B2', 'expiry_date' => '2026-09-19'],
            ],
        ]);

        $service->create([
            'supplier_id' => $dairy, 'purchase_date' => '2026-09-10', 'paid_amount' => 0,
            'items' => [
                ['product_id' => $productId('MLK-001'), 'quantity' => 300, 'purchase_cost' => 190, 'batch_number' => 'MLK-B2', 'expiry_date' => '2026-09-20'],
                ['product_id' => $productId('CRM-001'), 'quantity' => 100, 'purchase_cost' => 125, 'batch_number' => 'CRM-B2', 'expiry_date' => '2026-09-16'],
            ],
        ]);

        $service->create([
            'supplier_id' => $beverages, 'purchase_date' => '2026-09-12', 'paid_amount' => 0,
            'items' => [['product_id' => $productId('JUC-001'), 'quantity' => 200, 'purchase_cost' => 145, 'batch_number' => 'JUC-B2', 'expiry_date' => '2027-01-01']],
        ]);
    }
}
