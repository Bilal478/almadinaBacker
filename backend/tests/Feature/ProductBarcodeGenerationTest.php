<?php

use App\Models\Product;
use App\Services\Products\BarcodeGeneratorService;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_products', 'view_products']);
});

test('generating a barcode assigns a 13-digit code starting with the reserved internal-use prefix', function () {
    $product = Product::factory()->create(['barcode' => null]);

    $response = $this->actingAs($this->manager)
        ->postJson("/api/products/{$product->id}/generate-barcode")
        ->assertOk();

    $barcode = $response->json('data.barcode');
    expect($barcode)->toMatch('/^\d{13}$/');
    expect($barcode)->toStartWith('20');
    $this->assertDatabaseHas('products', ['id' => $product->id, 'barcode' => $barcode]);
});

test('generating a barcode is refused when the product already has one', function () {
    $product = Product::factory()->create(['barcode' => '9990001112223']);

    $this->actingAs($this->manager)
        ->postJson("/api/products/{$product->id}/generate-barcode")
        ->assertStatus(409);

    $this->assertDatabaseHas('products', ['id' => $product->id, 'barcode' => '9990001112223']);
});

test('a cashier without manage_products cannot generate a barcode', function () {
    $cashier = userWithPermissions(['view_products']);
    $product = Product::factory()->create(['barcode' => null]);

    $this->actingAs($cashier)
        ->postJson("/api/products/{$product->id}/generate-barcode")
        ->assertForbidden();
});

test('every generated barcode is unique and carries a correct EAN-13 check digit', function () {
    $generator = app(BarcodeGeneratorService::class);

    $codes = [];
    for ($i = 0; $i < 15; $i++) {
        $code = $generator->generate();
        Product::factory()->create(['barcode' => $code]);
        $codes[] = $code;
    }

    expect($codes)->toHaveCount(count(array_unique($codes)));

    foreach ($codes as $code) {
        $digits = str_split($code);
        $check = array_pop($digits);
        $sum = 0;
        foreach ($digits as $i => $d) {
            $sum += (int) $d * ($i % 2 === 0 ? 1 : 3);
        }
        $expectedCheck = (10 - ($sum % 10)) % 10;
        expect((int) $check)->toBe($expectedCheck);
    }
});
