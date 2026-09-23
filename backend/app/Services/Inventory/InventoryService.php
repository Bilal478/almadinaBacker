<?php

namespace App\Services\Inventory;

use App\Exceptions\BusinessException;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Models\SaleItem;
use Illuminate\Support\Facades\Auth;

/**
 * The single place stock is ever created, consumed, or adjusted. Every change here also
 * writes an inventory_movements row, so "why is stock what it is" is always answerable
 * from the database rather than trusted to have happened correctly.
 */
class InventoryService
{
    public function receiveBatch(
        Product $product,
        float $quantity,
        float $unitCost,
        string $batchNumber,
        string $purchaseDate,
        ?string $expiryDate = null,
        ?int $purchaseId = null,
        ?int $supplierId = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): InventoryBatch {
        $batch = InventoryBatch::create([
            'product_id' => $product->id,
            'purchase_id' => $purchaseId,
            'supplier_id' => $supplierId,
            'batch_number' => $batchNumber,
            'purchase_date' => $purchaseDate,
            'expiry_date' => $expiryDate,
            'unit_cost' => $unitCost,
            'original_quantity' => $quantity,
            'remaining_quantity' => $quantity,
            'status' => 'active',
        ]);

        $this->recordMovement($product->id, $batch->id, 'PURCHASE', $quantity, $unitCost, $referenceType, $referenceId);

        return $batch;
    }

    /**
     * Consumes oldest-batch-first under row locks (safe under concurrent sales — two
     * counters selling the last unit at once cannot both succeed). Throws rather than
     * oversells: negative stock is a hard business-rule violation here, not a fallback case.
     *
     * @return array{unit_cost: float, allocations: array<int, array{batch_id: int, quantity: float, unit_cost: float}>}
     */
    public function consumeFifo(Product $product, float $quantity, string $referenceType, int $referenceId): array
    {
        $batches = InventoryBatch::where('product_id', $product->id)
            ->where('remaining_quantity', '>', 0)
            ->orderBy('purchase_date')
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $available = (float) $batches->sum('remaining_quantity');
        if ($available < $quantity) {
            throw new BusinessException(
                "Insufficient stock for \"{$product->name}\": requested {$quantity}, only {$available} available.",
                'INSUFFICIENT_STOCK',
            );
        }

        $remaining = $quantity;
        $allocations = [];
        $totalCost = 0.0;

        foreach ($batches as $batch) {
            if ($remaining <= 0) {
                break;
            }
            $take = min((float) $batch->remaining_quantity, $remaining);
            if ($take <= 0) {
                continue;
            }

            $batch->decrement('remaining_quantity', $take);
            if ((float) $batch->remaining_quantity <= 0) {
                $batch->update(['status' => 'depleted']);
            }

            $this->recordMovement($product->id, $batch->id, 'SALE', -$take, (float) $batch->unit_cost, $referenceType, $referenceId);

            $allocations[] = ['batch_id' => $batch->id, 'quantity' => $take, 'unit_cost' => (float) $batch->unit_cost];
            $totalCost += $take * (float) $batch->unit_cost;
            $remaining -= $take;
        }

        return [
            'unit_cost' => $quantity > 0 ? $totalCost / $quantity : 0.0,
            'allocations' => $allocations,
        ];
    }

    /** Reverses a sale line: restocks the exact batches it drew from, proportionally if only partially returned. */
    public function restockFromSaleItem(SaleItem $saleItem, float $returnQuantity, string $referenceType, int $referenceId): void
    {
        $allocations = $saleItem->batchAllocations()->get();
        $originalQty = (float) $saleItem->quantity;
        if ($originalQty <= 0 || $allocations->isEmpty()) {
            return;
        }

        $remaining = $returnQuantity;
        foreach ($allocations as $allocation) {
            if ($remaining <= 0) {
                break;
            }
            $share = min((float) $allocation->quantity, ((float) $allocation->quantity / $originalQty) * $returnQuantity, $remaining);
            if ($share <= 0) {
                continue;
            }

            $batch = InventoryBatch::lockForUpdate()->find($allocation->batch_id);
            $batch->increment('remaining_quantity', $share);
            if ((float) $batch->remaining_quantity > 0 && $batch->status === 'depleted') {
                $batch->update(['status' => 'active']);
            }

            $this->recordMovement($saleItem->product_id, $batch->id, 'SALE_RETURN', $share, (float) $allocation->unit_cost, $referenceType, $referenceId);
            $remaining -= $share;
        }
    }

    /** Reduces a specific batch — used by purchase returns, where the batch is known explicitly. */
    public function consumeFromBatch(InventoryBatch $batch, float $quantity, string $movementType, string $referenceType, int $referenceId): void
    {
        $batch = InventoryBatch::lockForUpdate()->find($batch->id);
        if ((float) $batch->remaining_quantity < $quantity) {
            throw new BusinessException(
                "Cannot remove {$quantity} from batch {$batch->batch_number} — only {$batch->remaining_quantity} remaining.",
                'INSUFFICIENT_STOCK',
            );
        }

        $batch->decrement('remaining_quantity', $quantity);
        if ((float) $batch->remaining_quantity <= 0) {
            $batch->update(['status' => 'depleted']);
        }

        $this->recordMovement($batch->product_id, $batch->id, $movementType, -$quantity, (float) $batch->unit_cost, $referenceType, $referenceId);
    }

    /**
     * Manual stock correction (wastage, damage, expiry write-off, recount). Never silent —
     * always logged with a reason and the acting user.
     */
    public function adjust(Product $product, ?InventoryBatch $batch, float $quantity, string $movementType, string $reason): void
    {
        if (in_array($movementType, ['ADJUSTMENT_OUT', 'DAMAGE', 'EXPIRY'], true)) {
            if (!$batch) {
                throw new BusinessException('A batch must be specified to reduce stock.', 'VALIDATION_ERROR');
            }
            $batch = InventoryBatch::lockForUpdate()->find($batch->id);
            if ((float) $batch->remaining_quantity < $quantity) {
                throw new BusinessException("Only {$batch->remaining_quantity} remaining in batch {$batch->batch_number}.", 'INSUFFICIENT_STOCK');
            }
            $batch->decrement('remaining_quantity', $quantity);
            if ((float) $batch->remaining_quantity <= 0) {
                $batch->update(['status' => 'depleted']);
            }
            $this->recordMovement($product->id, $batch->id, $movementType, -$quantity, (float) $batch->unit_cost, null, null, $reason);
            return;
        }

        // ADJUSTMENT_IN: a small "found stock" batch at the product's current cost.
        $newBatch = $this->receiveBatch(
            $product,
            $quantity,
            (float) $product->current_purchase_cost,
            'ADJ-' . now()->format('YmdHis'),
            now()->toDateString(),
        );
        $this->recordMovement($product->id, $newBatch->id, $movementType, $quantity, (float) $newBatch->unit_cost, null, null, $reason);
    }

    private function recordMovement(
        int $productId,
        ?int $batchId,
        string $movementType,
        float $quantity,
        float $unitCost,
        ?string $referenceType,
        ?int $referenceId,
        ?string $reason = null,
    ): void {
        InventoryMovement::create([
            'product_id' => $productId,
            'batch_id' => $batchId,
            'movement_type' => $movementType,
            'quantity' => $quantity,
            'unit_cost' => $unitCost,
            'reference_type' => $referenceType,
            'reference_id' => $referenceId,
            'reason' => $reason,
            'created_by' => Auth::id(),
        ]);
    }
}
