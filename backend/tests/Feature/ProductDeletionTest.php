<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Purchases\PurchaseService;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_products', 'view_products']);
});

test('a product with no purchases, sales, or stock can be deleted', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->manager)->deleteJson("/api/products/{$product->id}")->assertOk();

    $this->assertDatabaseMissing('products', ['id' => $product->id]);
});

test('a product with stock history cannot be deleted', function () {
    $product = Product::factory()->create();
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 10, 'batch_number' => 'A']],
    ]);

    $this->actingAs($this->manager)->deleteJson("/api/products/{$product->id}")
        ->assertStatus(409);

    $this->assertDatabaseHas('products', ['id' => $product->id]);
});
