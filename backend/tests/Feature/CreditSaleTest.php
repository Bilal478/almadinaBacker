<?php

use App\Models\Product;
use App\Models\Sale;
use App\Services\Inventory\InventoryService;
use App\Services\Products\ProductPriceService;

beforeEach(function () {
    seedPermissions();
    $this->cashier = userWithPermissions(['view_pos', 'create_sale']);
    $this->manager = userWithPermissions(['view_pos', 'create_sale', 'manage_receivables']);

    $this->product = Product::factory()->create();
    app(ProductPriceService::class)->recordPrice($this->product, 30, 100, 100, '2026-01-01');
    app(InventoryService::class)->receiveBatch($this->product, 10, 30, 'A', '2026-01-01');
});

function creditSale($test, array $overrides = []): Sale
{
    $id = $test->actingAs($test->cashier)->postJson('/api/sales', array_merge([
        'price_tier' => 'customer',
        'payment_method' => 'CREDIT',
        'customer_name' => 'Ali Khan',
        'customer_phone' => '0300-1234567',
        'items' => [['product_id' => $test->product->id, 'quantity' => 2]],
    ], $overrides))->assertCreated()->json('data.id');

    return Sale::findOrFail($id);
}

test('a pay-later sale is saved as unpaid with the full total owed and no payment taken', function () {
    $sale = creditSale($this);

    expect($sale->is_credit)->toBeTrue()
        ->and($sale->payment_status)->toBe('unpaid')
        ->and((float) $sale->balance_due)->toBe(200.0)
        ->and((float) $sale->amount_received)->toBe(0.0)
        ->and($sale->payments()->count())->toBe(0)
        ->and($sale->customer_phone)->toBe('0300-1234567');
});

test('a pay-later sale requires a customer name', function () {
    $this->actingAs($this->cashier)->postJson('/api/sales', [
        'price_tier' => 'customer',
        'payment_method' => 'CREDIT',
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
    ])->assertUnprocessable()->assertJsonValidationErrors('customer_name');
});

test('receiving the full balance marks the invoice paid and records the payment', function () {
    $sale = creditSale($this);

    $this->actingAs($this->manager)->postJson("/api/sales/{$sale->id}/payments", [
        'amount' => 200,
        'payment_method' => 'CASH',
    ])->assertOk()
        ->assertJsonPath('data.payment_status', 'paid')
        ->assertJsonPath('data.balance_due', 0)
        ->assertJsonPath('data.payment_method', 'CREDIT')
        ->assertJsonPath('data.payments.0.amount', 200);

    expect($sale->fresh()->settled_at)->not->toBeNull();
});

test('partial payments reduce the balance and over-collection is rejected', function () {
    $sale = creditSale($this);

    $this->actingAs($this->manager)->postJson("/api/sales/{$sale->id}/payments", ['amount' => 50, 'payment_method' => 'CASH'])
        ->assertOk()->assertJsonPath('data.payment_status', 'partial')->assertJsonPath('data.balance_due', 150);

    $this->actingAs($this->manager)->postJson("/api/sales/{$sale->id}/payments", ['amount' => 151, 'payment_method' => 'CASH'])
        ->assertUnprocessable();

    $this->actingAs($this->manager)->postJson("/api/sales/{$sale->id}/payments", ['amount' => 150, 'payment_method' => 'CARD'])
        ->assertOk()->assertJsonPath('data.payment_status', 'paid');

    $this->actingAs($this->manager)->postJson("/api/sales/{$sale->id}/payments", ['amount' => 1, 'payment_method' => 'CASH'])
        ->assertUnprocessable();
});

test('the outstanding list shows only unpaid credit sales and can be searched by name', function () {
    $owing = creditSale($this);
    $paid = creditSale($this, ['customer_name' => 'Sara']);
    $this->actingAs($this->manager)->postJson("/api/sales/{$paid->id}/payments", ['amount' => 200, 'payment_method' => 'CASH']);
    $this->actingAs($this->cashier)->postJson('/api/sales', [
        'price_tier' => 'customer',
        'payment_method' => 'CASH',
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
    ])->assertCreated();

    $ids = collect($this->actingAs($this->manager)->getJson('/api/credit-sales')->assertOk()->json('data.data'))->pluck('id');
    expect($ids->all())->toBe([$owing->id]);

    $settled = collect($this->actingAs($this->manager)->getJson('/api/credit-sales?status=settled')->json('data.data'))->pluck('id');
    expect($settled->all())->toBe([$paid->id]);

    $found = collect($this->actingAs($this->manager)->getJson('/api/credit-sales?status=all&search=ali')->json('data.data'))->pluck('id');
    expect($found->all())->toBe([$owing->id]);
});

test('the pay-later list and receiving payments need the manage_receivables permission', function () {
    $sale = creditSale($this);

    $this->actingAs($this->cashier)->getJson('/api/credit-sales')->assertForbidden();
    $this->actingAs($this->cashier)->postJson("/api/sales/{$sale->id}/payments", ['amount' => 200, 'payment_method' => 'CASH'])
        ->assertForbidden();
});

test('a return on an unpaid invoice reduces what the customer owes', function () {
    $sale = creditSale($this);
    $itemId = $sale->items()->first()->id;

    $this->actingAs(userWithPermissions(['view_pos', 'create_sale', 'void_sale']))
        ->postJson("/api/sales/{$sale->id}/return", ['items' => [['sale_item_id' => $itemId, 'quantity' => 1]]])
        ->assertSuccessful();

    expect((float) $sale->fresh()->balance_due)->toBe(100.0)
        ->and($sale->fresh()->payment_status)->toBe('unpaid');
});

test('payments cannot be received on a cash sale', function () {
    $id = $this->actingAs($this->cashier)->postJson('/api/sales', [
        'price_tier' => 'customer',
        'payment_method' => 'CASH',
        'items' => [['product_id' => $this->product->id, 'quantity' => 1]],
    ])->json('data.id');

    $this->actingAs($this->manager)->postJson("/api/sales/{$id}/payments", ['amount' => 10, 'payment_method' => 'CASH'])
        ->assertUnprocessable();
});
