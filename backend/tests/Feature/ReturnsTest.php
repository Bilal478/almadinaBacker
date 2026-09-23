<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Products\ProductPriceService;
use App\Services\Purchases\PurchaseService;
use App\Services\Sales\SaleService;

beforeEach(function () {
    seedPermissions();
    $this->user = userWithPermissions(['view_pos', 'create_sale', 'void_sale', 'manage_purchases', 'view_supplier_balances']);
});

test('a partial sale return restocks only the returned quantity and blocks over-returning', function () {
    $product = Product::factory()->create();
    app(ProductPriceService::class)->recordPrice($product, 50, 100, 90, '2026-01-01');
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 20, 'purchase_cost' => 50, 'batch_number' => 'A']],
    ]);
    $sale = app(SaleService::class)->create([
        'sale_date' => '2026-01-05', 'cashier_id' => $this->user->id, 'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 5]],
    ]);
    expect($product->fresh()->currentStock())->toBe(15.0);

    $response = $this->actingAs($this->user)->postJson("/api/sales/{$sale->id}/return", [
        'items' => [['sale_item_id' => $sale->items->first()->id, 'quantity' => 2]],
        'reason' => 'Customer changed mind',
    ])->assertCreated();

    expect((float) $response->json('data.total_refund'))->toBe(200.0) // 2 * 100
        ->and($product->fresh()->currentStock())->toBe(17.0); // 15 + 2

    // Only 3 of the original 5 remain eligible — trying to return 4 more must fail.
    $this->actingAs($this->user)->postJson("/api/sales/{$sale->id}/return", [
        'items' => [['sale_item_id' => $sale->items->first()->id, 'quantity' => 4]],
    ])->assertStatus(422)->assertJsonPath('code', 'VALIDATION_ERROR');
});

test('a purchase return reduces the named batch and credits the supplier ledger, leaving the original purchase untouched', function () {
    $supplier = Supplier::factory()->create(['opening_balance' => 0]);
    $product = Product::factory()->create();

    $purchase = app(PurchaseService::class)->create([
        'supplier_id' => $supplier->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'purchase_cost' => 50, 'batch_number' => 'A']],
    ]);
    $batch = $purchase->batches->first();

    $response = $this->actingAs($this->user)->postJson("/api/purchases/{$purchase->id}/returns", [
        'reason' => 'Damaged', 'items' => [['batch_id' => $batch->id, 'quantity' => 10]],
    ])->assertCreated();

    expect((float) $response->json('data.total_amount'))->toBe(500.0); // 10 * 50
    expect($batch->fresh()->remaining_quantity)->toEqualWithDelta(90.0, 0.001);

    // Original purchase record is untouched — total/paid/due are exactly as recorded at receiving.
    $purchase->refresh();
    expect((float) $purchase->total_amount)->toBe(5000.0);

    $ledger = $this->actingAs($this->user)->getJson("/api/suppliers/{$supplier->id}/ledger")->json('data.data');
    expect((float) end($ledger)['balance'])->toBe(4500.0); // 5000 purchase - 500 return
});
