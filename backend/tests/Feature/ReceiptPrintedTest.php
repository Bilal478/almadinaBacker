<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Purchases\PurchaseService;
use App\Services\Sales\SaleService;

beforeEach(function () {
    seedPermissions();
    $this->cashier = userWithPermissions(['view_pos', 'create_sale']);
});

function completedSale(int $cashierId): \App\Models\Sale
{
    $product = Product::factory()->create();
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id,
        'purchase_date' => '2026-09-01',
        'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 50]],
    ]);

    return app(SaleService::class)->create([
        'sale_date' => '2026-09-21',
        'cashier_id' => $cashierId,
        'price_tier' => 'customer',
        'items' => [['product_id' => $product->id, 'quantity' => 1]],
    ]);
}

test('a new sale starts with no printed_at — the receipt has not been printed yet', function () {
    $sale = completedSale($this->cashier->id);

    expect($sale->printed_at)->toBeNull();
});

test('marking a sale as printed records printed_at, and marking it again keeps the original time', function () {
    $sale = completedSale($this->cashier->id);

    $first = $this->actingAs($this->cashier)->postJson("/api/sales/{$sale->id}/mark-printed")
        ->assertOk()
        ->json('data');

    expect($first['printed_at'])->not->toBeNull();

    // Simulate a reprint later — the recorded printed_at should NOT jump forward.
    $originalPrintedAt = $sale->fresh()->printed_at;

    $second = $this->actingAs($this->cashier)->postJson("/api/sales/{$sale->id}/mark-printed")
        ->assertOk()
        ->json('data');

    expect(\Illuminate\Support\Carbon::parse($second['printed_at']))->toEqual($originalPrintedAt);
});

test('marking a sale as printed still returns its line items — the frontend store overwrites its cached sale with this response, so a missing items key here silently erases the products from a later reprint', function () {
    $sale = completedSale($this->cashier->id);

    $data = $this->actingAs($this->cashier)->postJson("/api/sales/{$sale->id}/mark-printed")
        ->assertOk()
        ->json('data');

    expect($data['items'])->not->toBeEmpty();
    expect((float) $data['items'][0]['quantity'])->toBe(1.0);
});

test('a counter role without create_sale cannot mark a sale as printed', function () {
    $sale = completedSale($this->cashier->id);
    $noPermUser = userWithPermissions(['view_pos']);

    $this->actingAs($noPermUser)->postJson("/api/sales/{$sale->id}/mark-printed")
        ->assertStatus(403);
});
