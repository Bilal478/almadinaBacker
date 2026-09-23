<?php

use Illuminate\Support\Facades\Http;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_products']);
});

test('a barcode found in the public database comes back with a suggested name', function () {
    Http::fake([
        'world.openfoodfacts.org/*' => Http::response([
            'status' => 1,
            'product' => ['product_name' => 'Nutella', 'brands' => 'Ferrero', 'quantity' => '400 g'],
        ]),
    ]);

    $this->actingAs($this->manager)->getJson('/api/products/barcode-lookup/3017620422003')
        ->assertOk()
        ->assertJsonPath('data.found', true)
        ->assertJsonPath('data.suggested_name', 'Ferrero Nutella');
});

test('a barcode with no match — the normal case for a house-made product — comes back found:false, not an error', function () {
    Http::fake([
        'world.openfoodfacts.org/*' => Http::response(['status' => 0]),
    ]);

    $this->actingAs($this->manager)->getJson('/api/products/barcode-lookup/9999999999999')
        ->assertOk()
        ->assertJsonPath('data.found', false);
});

test('the external service being unreachable never surfaces as an error — it degrades to found:false', function () {
    Http::fake([
        'world.openfoodfacts.org/*' => fn () => throw new \Illuminate\Http\Client\ConnectionException('timed out'),
    ]);

    $this->actingAs($this->manager)->getJson('/api/products/barcode-lookup/1234567890123')
        ->assertOk()
        ->assertJsonPath('data.found', false);
});

test('a cashier without manage_products cannot use the barcode lookup', function () {
    $cashier = userWithPermissions(['view_pos', 'create_sale']);

    $this->actingAs($cashier)->getJson('/api/products/barcode-lookup/3017620422003')
        ->assertStatus(403);
});
