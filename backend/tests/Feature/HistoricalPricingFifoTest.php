<?php

use App\Models\Product;
use App\Services\Products\ProductPriceService;
use App\Services\Purchases\PurchaseService;
use App\Services\Sales\SaleService;

beforeEach(function () {
    seedPermissions();
    $this->cashier = userWithPermissions(['view_pos', 'create_sale', 'void_sale']);
});

/**
 * The mandatory scenario (spec sections 25 & 68): a February sale must permanently keep
 * its January price/cost/profit, even after the product is repurchased at a higher cost
 * and repriced in September. Nothing about a historical sale may ever be recalculated
 * using today's numbers.
 */
test('a sale permanently keeps the price and cost that were in effect on the day it happened', function () {
    $product = Product::factory()->create();
    $priceService = app(ProductPriceService::class);
    $purchases = app(PurchaseService::class);
    $sales = app(SaleService::class);

    // January: batch A (100 @ Rs.50) and the customer price becomes Rs.55.
    $purchases->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id,
        'purchase_date' => '2026-01-05',
        'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'purchase_cost' => 50, 'batch_number' => 'A']],
    ]);
    $priceService->recordPrice($product, 50, 55, 52, '2026-01-05');

    // February: sell 10 units.
    $februarySale = $sales->create([
        'sale_date' => '2026-02-10', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 10]],
    ]);
    $febItem = $februarySale->items->first();
    expect((float) $febItem->unit_price)->toBe(55.0)
        ->and((float) $febItem->unit_cost)->toBe(50.0)
        ->and((float) $febItem->line_total)->toBe(550.0)
        ->and((float) $febItem->total_cost)->toBe(500.0)
        ->and((float) $febItem->gross_profit)->toBe(50.0);

    // Deplete the rest of batch A (90 left) before batch B arrives, so the October sale
    // below is forced to draw from batch B — otherwise FIFO would still serve it from the
    // (older, cheaper) batch A, since batch order is independent of price_history dates.
    $sales->create([
        'sale_date' => '2026-08-01', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 90]],
    ]);

    // September: batch B (100 @ Rs.55) and the customer price becomes Rs.60.
    $purchases->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id,
        'purchase_date' => '2026-09-01',
        'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'purchase_cost' => 55, 'batch_number' => 'B']],
    ]);
    $priceService->recordPrice($product, 55, 60, 57, '2026-09-01');

    // October: sell 10 more units — must use the NEW price/cost.
    $octoberSale = $sales->create([
        'sale_date' => '2026-10-05', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 10]],
    ]);
    $octItem = $octoberSale->items->first();
    expect((float) $octItem->unit_price)->toBe(60.0)
        ->and((float) $octItem->unit_cost)->toBe(55.0)
        ->and((float) $octItem->line_total)->toBe(600.0)
        ->and((float) $octItem->total_cost)->toBe(550.0)
        ->and((float) $octItem->gross_profit)->toBe(50.0);

    // The February sale must be completely unaffected by the September change.
    $febItem->refresh();
    expect((float) $febItem->unit_price)->toBe(55.0)
        ->and((float) $febItem->unit_cost)->toBe(50.0)
        ->and((float) $febItem->gross_profit)->toBe(50.0);

    // FIFO: batch A is fully depleted by now, so October's units correctly come from batch B.
    $allocation = $octItem->batchAllocations->first();
    expect($allocation->batch->batch_number)->toBe('B');
});

test('a sale spanning two batches computes a correctly weighted average cost', function () {
    $product = Product::factory()->create();
    app(ProductPriceService::class)->recordPrice($product, 50, 100, 90, '2026-01-01');
    app(PurchaseService::class)->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 40, 'purchase_cost' => 50, 'batch_number' => 'A']],
    ]);
    app(PurchaseService::class)->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id, 'purchase_date' => '2026-02-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 40, 'purchase_cost' => 55, 'batch_number' => 'B']],
    ]);

    // Sell 50: all 40 from batch A + 10 from batch B => (40*50 + 10*55) / 50 = 51.0
    $sale = app(SaleService::class)->create([
        'sale_date' => '2026-03-01', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 50]],
    ]);

    expect((float) $sale->items->first()->unit_cost)->toBe(51.0)
        ->and($product->fresh()->currentStock())->toBe(30.0); // 80 - 50
});

test('selling more than available stock is rejected, not overselling', function () {
    $product = Product::factory()->create();
    app(PurchaseService::class)->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 5, 'purchase_cost' => 10, 'batch_number' => 'A']],
    ]);

    expect(fn () => app(SaleService::class)->create([
        'sale_date' => '2026-01-02', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 10]],
    ]))->toThrow(\App\Exceptions\BusinessException::class);

    expect($product->fresh()->currentStock())->toBe(5.0); // unchanged — the failed sale did not touch stock
});

test('voiding a sale restocks the exact batches it consumed', function () {
    $product = Product::factory()->create();
    app(ProductPriceService::class)->recordPrice($product, 50, 100, 90, '2026-01-01');
    app(PurchaseService::class)->create([
        'supplier_id' => \App\Models\Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 20, 'purchase_cost' => 50, 'batch_number' => 'A']],
    ]);

    $sale = app(SaleService::class)->create([
        'sale_date' => '2026-01-05', 'cashier_id' => $this->cashier->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 8]],
    ]);
    expect($product->fresh()->currentStock())->toBe(12.0);

    app(SaleService::class)->void($sale->fresh());
    expect($product->fresh()->currentStock())->toBe(20.0);
});
