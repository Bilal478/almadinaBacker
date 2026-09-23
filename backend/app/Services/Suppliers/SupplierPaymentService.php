<?php

namespace App\Services\Suppliers;

use App\Models\Supplier;
use App\Models\SupplierPayment;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;

class SupplierPaymentService
{
    public function __construct(private SupplierLedgerService $ledger)
    {
    }

    public function create(Supplier $supplier, array $data): SupplierPayment
    {
        return DB::transaction(function () use ($supplier, $data) {
            $payment = SupplierPayment::create([
                'supplier_id' => $supplier->id,
                'amount' => $data['amount'],
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'reference' => $data['reference'] ?? null,
                'description' => $data['description'] ?? null,
                'payment_method' => $data['payment_method'] ?? 'CASH',
            ]);

            $this->ledger->appendEntry(
                supplier: $supplier,
                transactionType: 'payment',
                description: $data['description'] ?? ('Payment (' . strtolower($payment->payment_method) . ')'),
                debit: 0,
                credit: (float) $payment->amount,
                transactionDate: $payment->payment_date,
                reference: $payment->reference,
                referenceType: null,
                referenceId: null,
            );

            AuditLogger::log('created', 'supplier_payments', 'supplier_payment', $payment->id, null, $payment->fresh()->toArray());

            return $payment;
        });
    }
}
