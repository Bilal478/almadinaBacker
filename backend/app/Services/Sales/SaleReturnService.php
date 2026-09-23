<?php

namespace App\Services\Sales;

use App\Exceptions\BusinessException;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Services\Audit\AuditLogger;
use App\Services\Inventory\InventoryService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Sale returns never touch the original sale's stored totals — that would rewrite history.
 * Instead a return is its own record, and reports subtract returned amounts from period
 * totals when they run (see ReportService), the same way a real accounting ledger works.
 */
class SaleReturnService
{
    public function __construct(private InventoryService $inventory)
    {
    }

    public function create(Sale $sale, array $data): SaleReturn
    {
        if (empty($data['items'])) {
            throw new BusinessException('Select at least one item to return.', 'VALIDATION_ERROR');
        }

        return DB::transaction(function () use ($sale, $data) {
            $restock = $data['restock'] ?? true;

            $saleReturn = SaleReturn::create([
                'sale_id' => $sale->id,
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'reason' => $data['reason'] ?? null,
                'total_refund' => 0,
                'restocked' => $restock,
                'created_by' => Auth::id(),
            ]);

            $totalRefund = 0.0;

            foreach ($data['items'] as $itemData) {
                $saleItem = SaleItem::where('sale_id', $sale->id)->findOrFail($itemData['sale_item_id']);
                $quantity = (float) $itemData['quantity'];

                if ($quantity <= 0 || $quantity > $saleItem->returnableQuantity()) {
                    throw new BusinessException(
                        "Cannot return {$quantity} of \"{$saleItem->name}\" — only {$saleItem->returnableQuantity()} eligible.",
                        'VALIDATION_ERROR',
                    );
                }

                $lineRefund = round($quantity * (float) $saleItem->unit_price, 2);

                $saleReturn->items()->create([
                    'sale_item_id' => $saleItem->id,
                    'quantity' => $quantity,
                    'unit_price' => $saleItem->unit_price,
                    'unit_cost' => $saleItem->unit_cost,
                    'line_refund' => $lineRefund,
                ]);

                $saleItem->increment('returned_quantity', $quantity);

                if ($restock) {
                    $this->inventory->restockFromSaleItem($saleItem, $quantity, 'sale_return', $saleReturn->id);
                }

                $totalRefund += $lineRefund;
            }

            $saleReturn->update(['total_refund' => round($totalRefund, 2)]);

            AuditLogger::log('created', 'sale_returns', 'sale_return', $saleReturn->id, null, $saleReturn->fresh()->toArray());

            return $saleReturn->load('items.saleItem', 'sale');
        });
    }
}
