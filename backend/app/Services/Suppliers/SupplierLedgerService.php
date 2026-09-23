<?php

namespace App\Services\Suppliers;

use App\Models\Supplier;
use App\Models\SupplierLedgerEntry;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Append-only ledger. Each entry's balance is computed once, from the previous entry's
 * balance (or the supplier's opening balance if this is the first), and stored — never
 * recalculated retroactively, so entries never shift after the fact.
 */
class SupplierLedgerService
{
    public function appendEntry(
        Supplier $supplier,
        string $transactionType,
        string $description,
        float $debit,
        float $credit,
        string $transactionDate,
        ?string $reference = null,
        ?string $referenceType = null,
        ?int $referenceId = null,
    ): SupplierLedgerEntry {
        return DB::transaction(function () use ($supplier, $transactionType, $description, $debit, $credit, $transactionDate, $reference, $referenceType, $referenceId) {
            $lastBalance = SupplierLedgerEntry::where('supplier_id', $supplier->id)
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('balance');

            $openingBalance = $lastBalance !== null ? (float) $lastBalance : (float) $supplier->opening_balance;
            $balance = $openingBalance + $debit - $credit;

            return SupplierLedgerEntry::create([
                'supplier_id' => $supplier->id,
                'transaction_type' => $transactionType,
                'reference' => $reference,
                'description' => $description,
                'debit' => $debit,
                'credit' => $credit,
                'balance' => $balance,
                'reference_type' => $referenceType,
                'reference_id' => $referenceId,
                'transaction_date' => $transactionDate,
                'created_by' => Auth::id(),
            ]);
        });
    }

    public function outstandingBalance(Supplier $supplier): float
    {
        $last = SupplierLedgerEntry::where('supplier_id', $supplier->id)->orderByDesc('id')->value('balance');
        return $last !== null ? (float) $last : (float) $supplier->opening_balance;
    }
}
