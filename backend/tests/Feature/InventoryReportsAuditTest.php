<?php

use App\Models\Product;
use App\Models\Supplier;
use App\Services\Purchases\PurchaseService;

beforeEach(function () {
    seedPermissions();
    $this->manager = userWithPermissions(['manage_inventory', 'view_reports', 'manage_products', 'manage_users']);
});

test('a product below its alert quantity is flagged low stock', function () {
    $product = Product::factory()->create(['low_stock_alert_qty' => 10]);
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 5, 'purchase_cost' => 10, 'batch_number' => 'A']],
    ]);

    $rows = $this->actingAs($this->manager)->getJson('/api/inventory/low-stock')->assertOk()->json('data');
    expect(collect($rows)->pluck('product_id'))->toContain($product->id);
});

test('a batch expiring within the requested window shows up in the expiring report, not before', function () {
    $product = Product::factory()->create();
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => now()->toDateString(), 'paid_amount' => 0,
        'items' => [[
            'product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 10, 'batch_number' => 'SOON',
            'expiry_date' => now()->addDays(5)->toDateString(),
        ]],
    ]);

    $this->actingAs($this->manager)->getJson('/api/inventory/expiring?days=10')
        ->assertOk()
        ->assertJsonFragment(['batch_number' => 'SOON']);

    $this->actingAs($this->manager)->getJson('/api/inventory/expiring?days=1')
        ->assertOk()
        ->assertJsonMissing(['batch_number' => 'SOON']);
});

test('a manual stock adjustment (damage) reduces stock and is logged with a reason, never silently', function () {
    $product = Product::factory()->create();
    $purchase = app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 20, 'purchase_cost' => 10, 'batch_number' => 'A']],
    ]);
    $batch = $purchase->batches->first();

    $this->actingAs($this->manager)->postJson('/api/inventory/adjustment', [
        'product_id' => $product->id, 'batch_id' => $batch->id, 'quantity' => 3,
        'movement_type' => 'DAMAGE', 'reason' => 'Dropped tray, broke on impact',
    ])->assertOk();

    expect($product->fresh()->currentStock())->toBe(17.0);
    $this->assertDatabaseHas('inventory_movements', [
        'product_id' => $product->id, 'movement_type' => 'DAMAGE', 'quantity' => -3, 'reason' => 'Dropped tray, broke on impact',
    ]);
});

test('a batch expiry date can be corrected after the purchase was recorded', function () {
    $product = Product::factory()->create();
    $purchase = app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [[
            'product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 10, 'batch_number' => 'A',
            'expiry_date' => '2026-06-01',
        ]],
    ]);
    $batch = $purchase->batches->first();

    $this->actingAs($this->manager)->patchJson("/api/inventory/batches/{$batch->id}/expiry", [
        'expiry_date' => '2026-09-01',
    ])->assertOk();

    expect($batch->fresh()->expiry_date->toDateString())->toBe('2026-09-01');
});

test('a batch expiry date can be cleared back to none', function () {
    $product = Product::factory()->create();
    $purchase = app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [[
            'product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 10, 'batch_number' => 'A',
            'expiry_date' => '2026-06-01',
        ]],
    ]);
    $batch = $purchase->batches->first();

    $this->actingAs($this->manager)->patchJson("/api/inventory/batches/{$batch->id}/expiry", [
        'expiry_date' => null,
    ])->assertOk();

    expect($batch->fresh()->expiry_date)->toBeNull();
});

test('sensitive actions are captured in the audit log', function () {
    $product = Product::factory()->create();
    app(PurchaseService::class)->create([
        'supplier_id' => Supplier::factory()->create()->id, 'purchase_date' => '2026-01-01', 'paid_amount' => 0,
        'items' => [['product_id' => $product->id, 'quantity' => 10, 'purchase_cost' => 10, 'batch_number' => 'A']],
    ]);

    $this->assertDatabaseHas('audit_logs', ['module' => 'purchases', 'action' => 'created', 'entity_type' => 'purchase']);

    $this->actingAs($this->manager)->getJson('/api/audit-logs')
        ->assertOk()
        ->assertJsonFragment(['module' => 'purchases']);
});
