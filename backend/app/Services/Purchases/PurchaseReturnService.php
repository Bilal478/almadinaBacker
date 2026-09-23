<?php

namespace App\Services\Purchases;

use App\Exceptions\BusinessException;
use App\Models\InventoryBatch;
use App\Models\Purchase;
use App\Models\PurchaseReturn;
use App\Services\Audit\AuditLogger;
use App\Services\Inventory\InventoryService;
use App\Services\Suppliers\SupplierLedgerService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class PurchaseReturnService
{
    public function __construct(
        private InventoryService $inventory,
        private SupplierLedgerService $ledger,
    ) {
    }

    /** Returns goods to the supplier: reduces the named batch, credits the supplier ledger, keeps the original purchase untouched. */
    public function create(Purchase $purchase, array $data): PurchaseReturn
    {
        if (empty($data['items'])) {
            throw new BusinessException('Select at least one item to return.', 'VALIDATION_ERROR');
        }

        return DB::transaction(function () use ($purchase, $data) {
            $purchaseReturn = PurchaseReturn::create([
                'purchase_id' => $purchase->id,
                'supplier_id' => $purchase->supplier_id,
                'return_date' => $data['return_date'] ?? now()->toDateString(),
                'reason' => $data['reason'] ?? null,
                'total_amount' => 0,
                'created_by' => Auth::id(),
            ]);

            $total = 0.0;

            foreach ($data['items'] as $itemData) {
                $batch = InventoryBatch::where('purchase_id', $purchase->id)->findOrFail($itemData['batch_id']);
                $quantity = (float) $itemData['quantity'];
                $lineTotal = round($quantity * (float) $batch->unit_cost, 2);

                $this->inventory->consumeFromBatch($batch, $quantity, 'PURCHASE_RETURN', 'purchase_return', $purchaseReturn->id);

                $purchaseReturn->items()->create([
                    'product_id' => $batch->product_id,
                    'batch_id' => $batch->id,
                    'quantity' => $quantity,
                    'unit_cost' => $batch->unit_cost,
                    'line_total' => $lineTotal,
                ]);

                $total += $lineTotal;
            }

            $purchaseReturn->update(['total_amount' => round($total, 2)]);

            $this->ledger->appendEntry(
                supplier: $purchase->supplier,
                transactionType: 'purchase_return',
                description: "Return against {$purchase->invoice_no}",
                debit: 0,
                credit: $total,
                transactionDate: $purchaseReturn->return_date,
                reference: $purchase->invoice_no,
                referenceType: 'purchase_return',
                referenceId: $purchaseReturn->id,
            );

            AuditLogger::log('created', 'purchase_returns', 'purchase_return', $purchaseReturn->id, null, $purchaseReturn->fresh()->toArray());

            return $purchaseReturn->load('items.product', 'purchase');
        });
    }
}
