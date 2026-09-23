<?php

namespace App\Services\Sales;

use App\Exceptions\BusinessException;
use App\Models\Product;
use App\Models\ProductPrice;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\Audit\AuditLogger;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class SaleService
{
    public function __construct(private InventoryService $inventory)
    {
    }

    /**
     * Completes a sale. The selling price is always the product's CURRENT price for the
     * requested tier, looked up here — never trusted from the request — so a tampered or
     * buggy client can never record a sale at an arbitrary price. Line discounts are a
     * legitimate cashier input and are trusted. Stock is consumed FIFO under row locks;
     * insufficient stock rejects the whole sale rather than overselling.
     */
    public function create(array $data): Sale
    {
        if (empty($data['items'])) {
            throw new BusinessException('Cart is empty.', 'VALIDATION_ERROR');
        }

        $priceTier = $data['price_tier'] ?? 'customer';
        $saleDate = $data['sale_date'] ?? now()->toDateString();
        $cashierId = $data['cashier_id'] ?? Auth::id();

        return DB::transaction(function () use ($data, $priceTier, $saleDate, $cashierId) {
            $sale = Sale::create([
                'invoice_no' => $this->generateInvoiceNo($saleDate),
                'sale_date' => $saleDate,
                'counter' => $data['counter'] ?? Auth::user()?->counter,
                'cashier_id' => $cashierId,
                'customer_name' => $data['customer_name'] ?? null,
                'price_tier' => $priceTier,
                'subtotal' => 0,
                'discount' => 0,
                'grand_total' => 0,
                'total_cost' => 0,
                'gross_profit' => 0,
                'amount_received' => 0,
                'change_amount' => 0,
                'status' => 'completed',
            ]);

            $subtotal = 0.0;
            $lineDiscountTotal = 0.0;
            $totalCost = 0.0;

            foreach ($data['items'] as $itemData) {
                $product = Product::findOrFail($itemData['product_id']);
                $quantity = (float) $itemData['quantity'];
                $unitPrice = $this->priceAsOf($product, $saleDate, $priceTier);
                $lineDiscount = (float) ($itemData['discount'] ?? 0);

                $consumption = $this->inventory->consumeFifo($product, $quantity, 'sale', $sale->id);

                $lineTotal = round($quantity * $unitPrice - $lineDiscount, 2);
                $lineCost = round($quantity * $consumption['unit_cost'], 2);
                $lineProfit = $lineTotal - $lineCost;

                $saleItem = $sale->items()->create([
                    'product_id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'unit_id' => $product->unit_id,
                    'quantity' => $quantity,
                    'unit_price' => $unitPrice,
                    'unit_cost' => $consumption['unit_cost'],
                    'discount' => $lineDiscount,
                    'line_total' => $lineTotal,
                    'total_cost' => $lineCost,
                    'gross_profit' => $lineProfit,
                ]);

                foreach ($consumption['allocations'] as $allocation) {
                    $saleItem->batchAllocations()->create([
                        'batch_id' => $allocation['batch_id'],
                        'quantity' => $allocation['quantity'],
                        'unit_cost' => $allocation['unit_cost'],
                    ]);
                }

                $subtotal += $quantity * $unitPrice;
                $lineDiscountTotal += $lineDiscount;
                $totalCost += $lineCost;
            }

            $orderDiscount = (float) ($data['discount'] ?? 0);
            $discount = $lineDiscountTotal + $orderDiscount;
            $grandTotal = round($subtotal - $discount, 2);

            $paymentMethod = $data['payment_method'] ?? 'CASH';
            $amountReceived = (float) ($data['amount_received'] ?? $grandTotal);
            if ($paymentMethod === 'CASH' && $amountReceived < $grandTotal) {
                throw new BusinessException('Amount received is less than the grand total.', 'INVALID_PAYMENT');
            }

            $sale->update([
                'subtotal' => round($subtotal, 2),
                'discount' => round($discount, 2),
                'grand_total' => $grandTotal,
                'total_cost' => round($totalCost, 2),
                'gross_profit' => round($grandTotal - $totalCost, 2),
                'amount_received' => $amountReceived,
                'change_amount' => max(0, round($amountReceived - $grandTotal, 2)),
            ]);

            SalePayment::create([
                'sale_id' => $sale->id,
                'payment_method' => $paymentMethod,
                'amount' => $grandTotal,
                'reference' => $data['payment_reference'] ?? null,
                'payment_date' => $sale->sale_date,
            ]);

            AuditLogger::log('created', 'sales', 'sale', $sale->id, null, $sale->fresh()->toArray());

            return $sale->fresh(['items.product', 'items.batchAllocations', 'payments', 'cashier']);
        });
    }

    /** Reverses a completed sale: restocks every line's exact batches, then marks it voided. */
    public function void(Sale $sale): Sale
    {
        if ($sale->status !== 'completed') {
            throw new BusinessException('Only a completed sale can be voided.', 'VALIDATION_ERROR');
        }

        return DB::transaction(function () use ($sale) {
            foreach ($sale->items as $item) {
                $this->inventory->restockFromSaleItem($item, (float) $item->quantity, 'sale', $sale->id);
            }

            $old = $sale->toArray();
            $sale->update(['status' => 'voided']);
            AuditLogger::log('voided', 'sales', 'sale', $sale->id, $old, $sale->fresh()->toArray());

            return $sale->fresh(['items.product', 'payments', 'cashier']);
        });
    }

    /**
     * The price effective on the given date — not just "today's price" — so a backdated or
     * historical sale (seeding, or a future backdated-entry feature) still gets the price
     * that was actually in force on that day, exactly like a live sale would have.
     */
    private function priceAsOf(Product $product, string $date, string $tier): float
    {
        $row = ProductPrice::where('product_id', $product->id)
            ->where('effective_from', '<=', $date)
            ->orderByDesc('effective_from')
            ->orderByDesc('id')
            ->first();

        if (!$row) {
            return $product->priceForTier($tier);
        }

        return $tier === 'retailer' ? (float) $row->retailer_price : (float) $row->customer_price;
    }

    /**
     * lockForUpdate() here takes a range lock on this month's invoice rows, so two concurrent
     * sales (e.g. two counters checking out at once) serialize on number generation instead of
     * both computing the same count and colliding on the unique invoice_no constraint.
     */
    private function generateInvoiceNo(string $saleDate): string
    {
        $prefix = 'INV-' . Carbon::parse($saleDate)->format('Ym');
        $count = Sale::where('invoice_no', 'like', "{$prefix}%")->lockForUpdate()->count() + 1;
        return sprintf('%s-%05d', $prefix, $count);
    }
}
