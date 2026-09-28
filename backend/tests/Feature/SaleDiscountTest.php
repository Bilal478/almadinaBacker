<?php

use App\Models\Product;
use App\Services\Inventory\InventoryService;
use App\Services\Products\ProductPriceService;

beforeEach(function () {
    seedPermissions();
    $this->cashier = userWithPermissions(['view_pos', 'create_sale']);
});

function stockedProduct(): Product
{
    $product = Product::factory()->create();
    app(ProductPriceService::class)->recordPrice($product, 30, 66, 66, '2026-01-01');
    app(InventoryService::class)->receiveBatch($product, 10, 30, 'A', '2026-01-01');
    return $product;
}

// Regression test for a real bug: the POS client was sending BOTH a per-item `discount` and
// a top-level order `discount` that was just the same line discounts summed again — the
// backend legitimately adds line + order discount (to support a genuine future order-wide
// discount on top of line discounts), so sending the same number in both doubled it on every
// discounted sale. The client no longer sends the redundant top-level field; this pins the
// contract so a client-side regression like that gets caught here too.
test('a sale total reflects each line discount exactly once when no separate order discount is sent', function () {
    $product = stockedProduct();

    $response = $this->actingAs($this->cashier)->postJson('/api/sales', [
        'sale_date' => '2026-09-28',
        'price_tier' => 'customer',
        'payment_method' => 'CASH',
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'discount' => 6]],
    ])->assertCreated();

    // 1 * 66 - 6 = 60, not 66 - 12 = 54.
    expect((float) $response->json('data.discount'))->toBe(6.0)
        ->and((float) $response->json('data.grand_total'))->toBe(60.0);
});

test('an explicit order-level discount still adds on top of line discounts, by design', function () {
    $product = stockedProduct();

    $response = $this->actingAs($this->cashier)->postJson('/api/sales', [
        'sale_date' => '2026-09-28',
        'price_tier' => 'customer',
        'payment_method' => 'CASH',
        'discount' => 5,
        'items' => [['product_id' => $product->id, 'quantity' => 1, 'discount' => 6]],
    ])->assertCreated();

    expect((float) $response->json('data.discount'))->toBe(11.0)
        ->and((float) $response->json('data.grand_total'))->toBe(55.0);
});
