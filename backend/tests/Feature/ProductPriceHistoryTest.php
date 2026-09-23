<?php

use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_products', 'view_products']);
});

test('creating a product with an opening quantity seeds a real batch, not just a price', function () {
    $unit = Unit::factory()->create();
    $category = Category::factory()->create();

    $response = $this->actingAs($this->manager)->postJson('/api/products', [
        'name' => 'Almond Croissant', 'sku' => 'ALM-001', 'barcode' => '9990001112223',
        'category_id' => $category->id, 'unit_id' => $unit->id, 'low_stock_alert_qty' => 10,
        'purchase_cost' => 65, 'customer_price' => 150, 'retailer_price' => 135,
        'opening_quantity' => 30,
    ])->assertCreated();

    $product = Product::find($response->json('data.id'));
    expect($product->currentStock())->toBe(30.0);
    $this->assertDatabaseHas('inventory_batches', ['product_id' => $product->id, 'purchase_id' => null, 'supplier_id' => null]);
});

test('recording a new price never overwrites the previous one — both remain in history', function () {
    $product = Product::factory()->create();

    $this->actingAs($this->manager)->postJson("/api/products/{$product->id}/price-history", [
        'purchase_cost' => 50, 'customer_price' => 55, 'retailer_price' => 52, 'effective_from' => '2026-01-10',
    ])->assertCreated();

    $this->actingAs($this->manager)->postJson("/api/products/{$product->id}/price-history", [
        'purchase_cost' => 55, 'customer_price' => 60, 'retailer_price' => 57, 'effective_from' => '2026-09-05',
    ])->assertCreated();

    $history = $this->actingAs($this->manager)->getJson("/api/products/{$product->id}/price-history")->json('data');
    expect($history)->toHaveCount(2);

    // The product's cached "current price" reflects only the latest row.
    $product->refresh();
    expect((float) $product->current_customer_price)->toBe(60.0);
});

test('a duplicate SKU or barcode is rejected', function () {
    $existing = Product::factory()->create(['sku' => 'DUP-001', 'barcode' => '1112223334445']);

    $this->actingAs($this->manager)->postJson('/api/products', [
        'name' => 'Something Else', 'sku' => 'DUP-001', 'barcode' => '9998887776665',
        'category_id' => $existing->category_id, 'unit_id' => $existing->unit_id,
        'purchase_cost' => 10, 'customer_price' => 20, 'retailer_price' => 18,
    ])->assertStatus(422);
});

test('a cashier without view_purchase_cost never receives purchase cost in the product payload', function () {
    $product = Product::factory()->create(['current_purchase_cost' => 42]);
    $cashier = userWithPermissions(['view_products']);

    $response = $this->actingAs($cashier)->getJson("/api/products/{$product->id}")->assertOk();
    expect($response->json('data'))->not->toHaveKey('current_purchase_cost');
});
