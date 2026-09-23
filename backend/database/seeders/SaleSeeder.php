<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use App\Services\Sales\SaleService;
use Illuminate\Database\Seeder;

class SaleSeeder extends Seeder
{
    /**
     * Every line below is dated in the past — SaleService looks up the price that was
     * actually effective on that date (see SaleService::priceAsOf), so sales before
     * 2026-09-05 correctly get Premium Biscuits at Rs.55/Rs.52, and sales from that date
     * onward get Rs.60/Rs.57 — even though every row is inserted "now", in one batch.
     */
    public function run(): void
    {
        if (Sale::count() > 0) {
            return;
        }

        $service = app(SaleService::class);
        $pid = fn (string $sku) => Product::where('sku', $sku)->value('id');
        $hamza = User::where('username', 'hamza.counter')->value('id');
        $sana = User::where('username', 'sana.counter')->value('id');
        $ayesha = User::where('username', 'ayesha.manager')->value('id');

        $sales = [
            ['date' => '2026-01-11', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BRD-001', 'qty' => 3], ['sku' => 'BIS-001', 'qty' => 5], ['sku' => 'MLK-001', 'qty' => 2],
            ]],
            ['date' => '2026-01-14', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'CAK-001', 'qty' => 1], ['sku' => 'DNT-001', 'qty' => 6],
            ]],
            ['date' => '2026-01-18', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'retailer', 'customer' => 'Shahid General Store', 'method' => 'BANK_TRANSFER', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 20], ['sku' => 'CHC-001', 'qty' => 25],
            ]],
            ['date' => '2026-01-22', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'RSK-001', 'qty' => 4], ['sku' => 'JUC-001', 'qty' => 3],
            ]],
            ['date' => '2026-02-03', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'CRS-001', 'qty' => 8], ['sku' => 'CUP-001', 'qty' => 6],
            ]],
            ['date' => '2026-02-09', 'cashier' => $ayesha, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 4, 'discount' => 20],
            ]],
            ['date' => '2026-02-17', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'PST-001', 'qty' => 5], ['sku' => 'CRM-001', 'qty' => 2],
            ]],
            ['date' => '2026-02-25', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BRD-001', 'qty' => 4],
            ]],
            ['date' => '2026-03-04', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'MLK-001', 'qty' => 3], ['sku' => 'BIS-001', 'qty' => 6],
            ]],
            ['date' => '2026-03-12', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'CAK-001', 'qty' => 2],
            ]],
            ['date' => '2026-03-20', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'retailer', 'customer' => 'Corner Mart', 'method' => 'BANK_TRANSFER', 'items' => [
                ['sku' => 'CHC-001', 'qty' => 30], ['sku' => 'JUC-001', 'qty' => 15],
            ]],
            ['date' => '2026-04-02', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'DNT-001', 'qty' => 5], ['sku' => 'RSK-001', 'qty' => 3],
            ]],
            ['date' => '2026-04-11', 'cashier' => $ayesha, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 8],
            ]],
            ['date' => '2026-04-19', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'CRS-001', 'qty' => 4], ['sku' => 'PST-001', 'qty' => 4],
            ]],
            ['date' => '2026-05-05', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'MLK-001', 'qty' => 4],
            ]],
            ['date' => '2026-05-14', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'OTHER', 'items' => [
                ['sku' => 'CUP-001', 'qty' => 10], ['sku' => 'BIS-001', 'qty' => 3],
            ]],
            ['date' => '2026-05-23', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'CAK-001', 'qty' => 1],
            ]],
            ['date' => '2026-06-06', 'cashier' => $ayesha, 'counter' => 'Counter 1', 'tier' => 'retailer', 'customer' => 'Al-Madina Store', 'method' => 'BANK_TRANSFER', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 15], ['sku' => 'BRD-001', 'qty' => 20],
            ]],
            ['date' => '2026-06-15', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'DNT-001', 'qty' => 8], ['sku' => 'JUC-001', 'qty' => 2],
            ]],
            ['date' => '2026-06-24', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'PST-001', 'qty' => 6],
            ]],
            ['date' => '2026-07-03', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'MLK-001', 'qty' => 5], ['sku' => 'CRM-001', 'qty' => 3],
            ]],
            ['date' => '2026-07-12', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 7],
            ]],
            ['date' => '2026-07-21', 'cashier' => $ayesha, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'CHC-001', 'qty' => 5], ['sku' => 'CUP-001', 'qty' => 4],
            ]],
            ['date' => '2026-08-02', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BRD-001', 'qty' => 6],
            ]],
            ['date' => '2026-08-11', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 9], ['sku' => 'RSK-001', 'qty' => 2],
            ]],
            ['date' => '2026-08-20', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'CAK-001', 'qty' => 2],
            ]],
            ['date' => '2026-08-29', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'CRS-001', 'qty' => 5], ['sku' => 'DNT-001', 'qty' => 4],
            ]],
            // September sales — after the 2026-09-05 price change, Premium Biscuits sells at the new price.
            ['date' => '2026-09-06', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 6],
            ]],
            ['date' => '2026-09-08', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'MLK-001', 'qty' => 2], ['sku' => 'BRD-001', 'qty' => 3],
            ]],
            ['date' => '2026-09-10', 'cashier' => $ayesha, 'counter' => 'Counter 1', 'tier' => 'retailer', 'customer' => 'Shahid General Store', 'method' => 'BANK_TRANSFER', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 25],
            ]],
            ['date' => '2026-09-12', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'PST-001', 'qty' => 3], ['sku' => 'CUP-001', 'qty' => 5],
            ]],
            ['date' => '2026-09-13', 'cashier' => $hamza, 'counter' => 'Counter 1', 'tier' => 'customer', 'method' => 'CASH', 'items' => [
                ['sku' => 'BIS-001', 'qty' => 4],
            ]],
            ['date' => '2026-09-14', 'cashier' => $sana, 'counter' => 'Counter 2', 'tier' => 'customer', 'method' => 'CARD', 'items' => [
                ['sku' => 'CHC-001', 'qty' => 3], ['sku' => 'JUC-001', 'qty' => 2],
            ]],
        ];

        foreach ($sales as $sale) {
            $service->create([
                'sale_date' => $sale['date'],
                'cashier_id' => $sale['cashier'],
                'counter' => $sale['counter'],
                'price_tier' => $sale['tier'],
                'customer_name' => $sale['customer'] ?? null,
                'payment_method' => $sale['method'],
                'items' => array_map(fn ($item) => [
                    'product_id' => $pid($item['sku']),
                    'quantity' => $item['qty'],
                    'discount' => $item['discount'] ?? 0,
                ], $sale['items']),
            ]);
        }
    }
}
