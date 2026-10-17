<?php

namespace App\Services\Sales;

use App\Exceptions\BusinessException;
use App\Models\Sale;
use App\Models\SalePayment;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Collecting money on "pay later" (credit) sales. Each collection is an ordinary
 * sale_payments row dated the day it was received, so a customer can settle in one go or in
 * several instalments, and the full payment history stays on the invoice.
 */
class SaleCreditService
{
    public function receivePayment(Sale $sale, array $data): Sale
    {
        return DB::transaction(function () use ($sale, $data) {
            // Re-read under a row lock so two counters receiving on the same invoice at once
            // can't both pass the balance check and over-collect.
            $sale = Sale::whereKey($sale->id)->lockForUpdate()->firstOrFail();

            if (!$sale->is_credit) {
                throw new BusinessException('This sale was not a pay-later sale.', 'VALIDATION_ERROR');
            }
            if ($sale->status !== 'completed') {
                throw new BusinessException('Payments can only be received on a completed sale.', 'VALIDATION_ERROR');
            }

            $balance = round((float) $sale->balance_due, 2);
            if ($balance <= 0) {
                throw new BusinessException('This invoice is already fully paid.', 'ALREADY_PAID');
            }

            $amount = round((float) ($data['amount'] ?? $balance), 2);
            if ($amount <= 0) {
                throw new BusinessException('Payment amount must be greater than zero.', 'VALIDATION_ERROR');
            }
            if ($amount > $balance) {
                throw new BusinessException("Payment exceeds the balance due ({$balance}).", 'INVALID_PAYMENT');
            }

            $old = $sale->toArray();

            SalePayment::create([
                'sale_id' => $sale->id,
                'payment_method' => $data['payment_method'] ?? 'CASH',
                'amount' => $amount,
                'reference' => $data['reference'] ?? null,
                'payment_date' => $data['payment_date'] ?? now()->toDateString(),
                'created_by' => Auth::id(),
            ]);

            $sale->balance_due = $balance - $amount;
            $sale->syncPaymentStatus();
            $sale->save();

            AuditLogger::log('payment_received', 'sales', 'sale', $sale->id, $old, $sale->fresh()->toArray());

            return $sale->fresh(['items.product', 'payments.receivedBy', 'cashier']);
        });
    }

    /**
     * Goods returned against an invoice that hasn't been fully paid yet come off what the
     * customer owes, rather than being refunded in cash they never paid. Anything beyond the
     * outstanding balance is a genuine refund of money already collected.
     */
    public function applyReturn(Sale $sale, float $returnAmount): void
    {
        $sale = Sale::whereKey($sale->id)->lockForUpdate()->first();
        if (!$sale || !$sale->is_credit || (float) $sale->balance_due <= 0) {
            return;
        }

        $sale->balance_due = (float) $sale->balance_due - min($returnAmount, (float) $sale->balance_due);
        $sale->syncPaymentStatus();
        $sale->save();
    }
}
