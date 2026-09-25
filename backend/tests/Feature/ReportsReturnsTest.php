<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Purchases\PurchaseService;
use App\Services\Sales\SaleReturnService;
use App\Services\Sales\SaleService;

/**
 * Locks in the fix for: a sale's revenue/profit figures must drop when items from it are
 * returned. Previously salesReport()'s row-level detail, productSalesReport(), sellerReport()
 * and profitReport() all ignored SaleReturn/SaleReturnItem entirely and kept reporting the
 * pre-return numbers — see the ReportService.php changes this test accompanies.
 */
beforeEach(function () {
    seedPermissions();
    $this->admin = userWithPermissions(['view_pos', 'create_sale', 'void_sale', 'view_reports', 'view_purchase_cost']);
});

test('a partial return reduces revenue, cost and profit across every sales-related report', function () {
    $product = Product::factory()->create();

    // Buy 10 @ cost 50.
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id,
        'purchase_date' => '2026-09-01',
        'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 50]],
    ]);

    // Sell 5 @ price 100 (product factory default customer price) — 500 subtotal, 250 cost.
    $priceTier = 'customer';
    app(\App\Services\Products\ProductPriceService::class)->recordPrice($product, 50, 100, 100, '2026-09-01', 'test price');

    $sale = app(SaleService::class)->create([
        'sale_date' => '2026-09-02',
        'cashier_id' => $this->admin->id,
        'price_tier' => $priceTier,
        'items' => [['product_id' => $product->id, 'quantity' => 5]],
    ]);

    expect((float) $sale->grand_total)->toBe(500.0);
    expect((float) $sale->total_cost)->toBe(250.0);

    // Return 2 of the 5 — refund 200 (2 * unit_price 100), cost basis 100 (2 * unit_cost 50).
    app(SaleReturnService::class)->create($sale, [
        'items' => [['sale_item_id' => $sale->items->first()->id, 'quantity' => 2]],
        'restock' => true,
    ]);

    $token = $this->admin;

    $salesReport = $this->actingAs($token)->getJson('/api/reports/sales?date_from=2026-09-01&date_to=2026-09-30')
        ->assertOk()->json('data');
    expect((float) $salesReport['summary']['net_sales'])->toBe(300.0);
    expect((float) $salesReport['summary']['cogs'])->toBe(150.0);
    expect((float) $salesReport['summary']['gross_profit'])->toBe(150.0);
    $row = collect($salesReport['rows'])->firstWhere('id', $sale->id);
    expect((float) $row['returned'])->toBe(200.0);
    expect((float) $row['net_total'])->toBe(300.0);

    $productSales = $this->actingAs($token)->getJson('/api/reports/product-sales?date_from=2026-09-01&date_to=2026-09-30')
        ->assertOk()->json('data.rows');
    $productRow = collect($productSales)->firstWhere('product_id', $product->id);
    expect((float) $productRow['quantity'])->toBe(3.0);
    expect((float) $productRow['revenue'])->toBe(300.0);
    expect((float) $productRow['cogs'])->toBe(150.0);
    expect((float) $productRow['gross_profit'])->toBe(150.0);

    $sellers = $this->actingAs($token)->getJson('/api/reports/sellers?date_from=2026-09-01&date_to=2026-09-30')
        ->assertOk()->json('data.rows');
    $sellerRow = collect($sellers)->firstWhere('seller_id', $this->admin->id);
    expect((float) $sellerRow['net_sales'])->toBe(300.0);

    $profit = $this->actingAs($token)->getJson('/api/reports/profit?date_from=2026-09-01&date_to=2026-09-30')
        ->assertOk()->json('data');
    expect((float) $profit['summary']['revenue'])->toBe(300.0);
    expect((float) $profit['summary']['cogs'])->toBe(150.0);
    expect((float) $profit['summary']['gross_profit'])->toBe(150.0);
});
