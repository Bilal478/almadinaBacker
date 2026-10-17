<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Sale extends Model
{
    protected $fillable = [
        'invoice_no', 'sale_date', 'counter', 'cashier_id', 'customer_name', 'customer_phone', 'price_tier',
        'subtotal', 'discount', 'grand_total', 'total_cost', 'gross_profit',
        'amount_received', 'change_amount', 'status', 'printed_at',
        'is_credit', 'payment_status', 'balance_due', 'settled_at',
    ];

    protected $casts = [
        'sale_date' => 'date:Y-m-d',
        'subtotal' => 'decimal:2',
        'discount' => 'decimal:2',
        'grand_total' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'gross_profit' => 'decimal:2',
        'amount_received' => 'decimal:2',
        'change_amount' => 'decimal:2',
        'printed_at' => 'datetime',
        'is_credit' => 'boolean',
        'balance_due' => 'decimal:2',
        'settled_at' => 'datetime',
    ];

    public function cashier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cashier_id');
    }

    public function items(): HasMany
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(SalePayment::class);
    }

    public function returns(): HasMany
    {
        return $this->hasMany(SaleReturn::class);
    }

    /** Recomputes payment_status / settled_at from balance_due — call after changing the balance. */
    public function syncPaymentStatus(): void
    {
        $balance = round((float) $this->balance_due, 2);
        $this->balance_due = max(0, $balance);
        if ($balance <= 0) {
            $this->payment_status = 'paid';
            $this->settled_at ??= now();
        } else {
            $this->payment_status = $this->payments()->exists() ? 'partial' : 'unpaid';
            $this->settled_at = null;
        }
    }
}
