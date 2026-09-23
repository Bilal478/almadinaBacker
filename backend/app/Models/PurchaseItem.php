<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PurchaseItem extends Model
{
    protected $fillable = [
        'purchase_id', 'product_id', 'quantity', 'unit_id', 'purchase_cost', 'line_total', 'batch_number', 'expiry_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:3',
        'purchase_cost' => 'decimal:2',
        'line_total' => 'decimal:2',
        'expiry_date' => 'date:Y-m-d',
    ];

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }
}
