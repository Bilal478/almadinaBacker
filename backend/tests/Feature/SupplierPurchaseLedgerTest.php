<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Models\Unit;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_suppliers', 'manage_purchases', 'manage_supplier_payments', 'manage_products', 'view_supplier_balances']);
});

test('creating a supplier works', function () {
    $this->actingAs($this->manager)
        ->postJson('/api/suppliers', [
            'name' => 'ABC Foods', 'phone' => '0300-1112223', 'supplier_type_id' => \App\Models\SupplierType::factory()->create()->id,
            'opening_balance' => 20000,
        ])
        ->assertCreated()
        ->assertJsonPath('data.name', 'ABC Foods')
        ->assertJsonPath('data.outstanding', 20000);
});

test('a purchase creates a batch, increases inventory, and posts a supplier payable — never trusting a client-sent total', function () {
    $supplier = Supplier::factory()->create(['opening_balance' => 0]);
    $product = Product::factory()->create(['unit_id' => Unit::factory()->create()->id]);

    $response = $this->actingAs($this->manager)->postJson('/api/purchases', [
        'supplier_id' => $supplier->id,
        'purchase_date' => '2026-01-10',
        'paid_amount' => 10000,
        // Client sends a bogus total_amount; the server must ignore it and recompute 100 * 50 = 5000.
        'total_amount' => 999999,
        'items' => [
            ['product_id' => $product->id, 'quantity' => 100, 'purchase_cost' => 50, 'batch_number' => 'B-001'],
        ],
    ])->assertCreated();

    // total is recomputed from line items (100 * 50), ignoring the bogus client total_amount
    expect((float) $response->json('data.total_amount'))->toBe(5000.0);

    $this->assertDatabaseHas('inventory_batches', [
        'product_id' => $product->id, 'batch_number' => 'B-001', 'unit_cost' => 50, 'original_quantity' => 100, 'remaining_quantity' => 100,
    ]);
    expect($product->fresh()->currentStock())->toBe(100.0);
});

test('partial supplier payment reduces the outstanding balance correctly', function () {
    $supplier = Supplier::factory()->create(['opening_balance' => 20000]);
    $product = Product::factory()->create();

    $this->actingAs($this->manager)->postJson('/api/purchases', [
        'supplier_id' => $supplier->id, 'purchase_date' => '2026-01-10', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 100, 'purchase_cost' => 500, 'batch_number' => 'B-001']],
    ])->assertCreated();
    // opening 20000 + purchase 50000 = 70000 outstanding

    $this->actingAs($this->manager)->postJson("/api/suppliers/{$supplier->id}/payments", [
        'amount' => 10000, 'payment_date' => '2026-01-20',
    ])->assertCreated();
    // 70000 - 10000 = 60000

    $ledger = $this->actingAs($this->manager)->getJson("/api/suppliers/{$supplier->id}/ledger")->json('data.data');
    expect((float) end($ledger)['balance'])->toBe(60000.0);

    $this->actingAs($this->manager)->postJson("/api/suppliers/{$supplier->id}/payments", ['amount' => 60000, 'payment_date' => '2026-02-01'])->assertCreated();
    $ledger = $this->actingAs($this->manager)->getJson("/api/suppliers/{$supplier->id}/ledger")->json('data.data');
    expect((float) end($ledger)['balance'])->toBe(0.0);
});
