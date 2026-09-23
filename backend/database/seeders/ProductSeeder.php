<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Services\Products\ProductPriceService;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        $priceService = app(ProductPriceService::class);
        $catId = fn (string $name) => Category::where('name', $name)->value('id');
        $unitId = fn (string $symbol) => Unit::where('symbol', $symbol)->value('id');

        $products = [
            ['name' => 'Bread Loaf (Large)', 'sku' => 'BRD-001', 'barcode' => '8964000100011', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 20],
            ['name' => 'Premium Biscuits', 'sku' => 'BIS-001', 'barcode' => '8964000100028', 'category' => 'Snacks', 'unit' => 'pcs', 'low_stock_alert_qty' => 30],
            ['name' => 'Fresh Milk 1L', 'sku' => 'MLK-001', 'barcode' => '8964000100035', 'category' => 'Dairy', 'unit' => 'ltr', 'low_stock_alert_qty' => 25],
            ['name' => 'Chocolate Cake (1kg)', 'sku' => 'CAK-001', 'barcode' => '8964000100042', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 5],
            ['name' => 'Rusks (Tea Time Pack)', 'sku' => 'RSK-001', 'barcode' => '8964000100059', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 15],
            ['name' => 'Chocolate Donut', 'sku' => 'DNT-001', 'barcode' => '8964000100066', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 20],
            ['name' => 'Butter Croissant', 'sku' => 'CRS-001', 'barcode' => '8964000100073', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 15],
            ['name' => 'Vanilla Cupcake', 'sku' => 'CUP-001', 'barcode' => '8964000100080', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 20],
            ['name' => 'Fresh Cream 250ml', 'sku' => 'CRM-001', 'barcode' => '8964000100097', 'category' => 'Dairy', 'unit' => 'pcs', 'low_stock_alert_qty' => 10],
            ['name' => 'Chicken Pastry', 'sku' => 'PST-001', 'barcode' => '8964000100103', 'category' => 'Bakery', 'unit' => 'pcs', 'low_stock_alert_qty' => 15],
            ['name' => 'Chocolate Bar 100g', 'sku' => 'CHC-001', 'barcode' => '8964000100110', 'category' => 'Snacks', 'unit' => 'pcs', 'low_stock_alert_qty' => 20],
            ['name' => 'Mango Juice 1L', 'sku' => 'JUC-001', 'barcode' => '8964000100127', 'category' => 'Beverages', 'unit' => 'ltr', 'low_stock_alert_qty' => 20],
            ['name' => 'Plain Tea Biscuits', 'sku' => 'BIS-002', 'barcode' => '8964000100134', 'category' => 'Snacks', 'unit' => 'pcs', 'low_stock_alert_qty' => 20, 'status' => 'inactive'],
        ];

        // [sku => [jan: [cost, customer, retailer], sep: [cost, customer, retailer]]]
        $prices = [
            'BRD-001' => ['jan' => [45, 120, 105], 'sep' => [48, 130, 112]],
            'BIS-001' => ['jan' => [50, 55, 52], 'sep' => [55, 60, 57]], // the flagship demo scenario
            'MLK-001' => ['jan' => [180, 250, 230], 'sep' => [190, 260, 240]],
            'CAK-001' => ['jan' => [500, 850, 750], 'sep' => [540, 900, 800]],
            'RSK-001' => ['jan' => [60, 140, 125], 'sep' => [62, 150, 130]],
            'DNT-001' => ['jan' => [40, 90, 80], 'sep' => [42, 95, 85]],
            'CRS-001' => ['jan' => [55, 110, 98], 'sep' => [58, 120, 105]],
            'CUP-001' => ['jan' => [45, 95, 85], 'sep' => [47, 100, 90]],
            'CRM-001' => ['jan' => [120, 180, 160], 'sep' => [125, 190, 170]],
            'PST-001' => ['jan' => [70, 160, 145], 'sep' => [74, 170, 155]],
            'CHC-001' => ['jan' => [40, 130, 115], 'sep' => [45, 140, 125]],
            'JUC-001' => ['jan' => [140, 200, 180], 'sep' => [145, 210, 190]],
            'BIS-002' => ['jan' => [35, 70, 60], 'sep' => null],
        ];

        foreach ($products as $data) {
            $product = Product::updateOrCreate(['sku' => $data['sku']], [
                'name' => $data['name'],
                'barcode' => $data['barcode'],
                'category_id' => $catId($data['category']),
                'unit_id' => $unitId($data['unit']),
                'low_stock_alert_qty' => $data['low_stock_alert_qty'],
                'expiry_controlled' => true,
                'status' => $data['status'] ?? 'active',
            ]);

            $schedule = $prices[$data['sku']];
            [$cost, $customer, $retailer] = $schedule['jan'];
            $priceService->recordPrice($product, $cost, $customer, $retailer, '2026-01-08', 'Initial pricing');

            if ($schedule['sep']) {
                [$cost, $customer, $retailer] = $schedule['sep'];
                $note = $data['sku'] === 'BIS-001' ? 'Supplier cost increase' : null;
                $priceService->recordPrice($product, $cost, $customer, $retailer, '2026-09-05', $note);
            }
        }
    }
}
