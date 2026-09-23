<?php

namespace App\Services\Purchases;

use App\Exceptions\BusinessException;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\Audit\AuditLogger;
use App\Services\Inventory\InventoryService;
use App\Services\Suppliers\SupplierLedgerService;
use Illuminate\Support\Facades\DB;

class PurchaseService
{
    public function __construct(
        private InventoryService $inventory,
        private SupplierLedgerService $ledger,
    ) {
    }

    /**
     * Records a purchase (invoice) and immediately receives it into stock — one real batch
     * per line. This bakery buys day-to-day from local suppliers, so "record purchase" and
     * "receive stock" are intentionally one step here, not a separate PO-then-receive flow.
     *
     * Totals are always recalculated from the line items — a client-supplied grand total
     * is never trusted.
     */
    public function create(array $data): Purchase
    {
        if (empty($data['items'])) {
            throw new BusinessException('Add at least one product line.', 'VALIDATION_ERROR');
        }

        return DB::transaction(function () use ($data) {
            $supplier = Supplier::findOrFail($data['supplier_id']);

            $totalAmount = 0.0;
            foreach ($data['items'] as $item) {
                $totalAmount += round((float) $item['quantity'] * (float) $item['purchase_cost'], 2);
            }

            $paidAmount = (float) ($data['paid_amount'] ?? 0);
            $dueAmount = max(0, $totalAmount - $paidAmount);
            $status = $paidAmount >= $totalAmount ? 'paid' : ($paidAmount > 0 ? 'partial' : 'pending');
            $invoiceNo = $data['invoice_no'] ?? $this->generateInvoiceNo();

            $purchase = Purchase::create([
                'invoice_no' => $invoiceNo,
                'supplier_id' => $supplier->id,
                'purchase_date' => $data['purchase_date'],
                'reference' => $data['reference'] ?? null,
                'total_amount' => $totalAmount,
                'paid_amount' => $paidAmount,
                'due_amount' => $dueAmount,
                'status' => $status,
            ]);

            foreach ($data['items'] as $index => $item) {
                $product = Product::findOrFail($item['product_id']);
                $lineTotal = round((float) $item['quantity'] * (float) $item['purchase_cost'], 2);
                $batchNumber = $item['batch_number'] ?? ($invoiceNo . '-' . ($index + 1));

                $purchase->items()->create([
                    'product_id' => $product->id,
                    'quantity' => $item['quantity'],
                    'unit_id' => $item['unit_id'] ?? $product->unit_id,
                    'purchase_cost' => $item['purchase_cost'],
                    'line_total' => $lineTotal,
                    'batch_number' => $batchNumber,
                    'expiry_date' => $item['expiry_date'] ?? null,
                ]);

                $this->inventory->receiveBatch(
                    product: $product,
                    quantity: (float) $item['quantity'],
                    unitCost: (float) $item['purchase_cost'],
                    batchNumber: $batchNumber,
                    purchaseDate: $data['purchase_date'],
                    expiryDate: $item['expiry_date'] ?? null,
                    purchaseId: $purchase->id,
                    supplierId: $supplier->id,
                    referenceType: 'purchase',
                    referenceId: $purchase->id,
                );
            }

            $this->ledger->appendEntry(
                supplier: $supplier,
                transactionType: 'purchase',
                description: 'Purchase — ' . count($data['items']) . ' item(s)',
                debit: $totalAmount,
                credit: 0,
                transactionDate: $data['purchase_date'],
                reference: $invoiceNo,
                referenceType: 'purchase',
                referenceId: $purchase->id,
            );

            if ($paidAmount > 0) {
                SupplierPayment::create([
                    'supplier_id' => $supplier->id,
                    'amount' => $paidAmount,
                    'payment_date' => $data['purchase_date'],
                    'reference' => $invoiceNo,
                    'description' => "Payment at time of purchase {$invoiceNo}",
                    'payment_method' => $data['payment_method'] ?? 'CASH',
                ]);

                $this->ledger->appendEntry(
                    supplier: $supplier,
                    transactionType: 'payment',
                    description: "Paid at time of purchase {$invoiceNo}",
                    debit: 0,
                    credit: $paidAmount,
                    transactionDate: $data['purchase_date'],
                    reference: $invoiceNo,
                    referenceType: 'purchase',
                    referenceId: $purchase->id,
                );
            }

            AuditLogger::log('created', 'purchases', 'purchase', $purchase->id, null, $purchase->fresh()->toArray());

            return $purchase->load('items.product', 'supplier');
        });
    }

    /** Same range-lock approach as SaleService::generateInvoiceNo — see that method's note. */
    private function generateInvoiceNo(): string
    {
        $prefix = 'PO-' . now()->year;
        $count = Purchase::where('invoice_no', 'like', "{$prefix}%")->lockForUpdate()->count() + 1;
        return sprintf('%s-%05d', $prefix, $count);
    }
}
