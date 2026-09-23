<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class InventoryBatch extends Model
{
    protected $fillable = [
        'product_id', 'purchase_id', 'supplier_id', 'batch_number', 'purchase_date',
        'expiry_date', 'unit_cost', 'original_quantity', 'remaining_quantity', 'status',
    ];

    protected $casts = [
        'purchase_date' => 'date:Y-m-d',
        'expiry_date' => 'date:Y-m-d',
        'unit_cost' => 'decimal:2',
        'original_quantity' => 'decimal:3',
        'remaining_quantity' => 'decimal:3',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function purchase(): BelongsTo
    {
        return $this->belongsTo(Purchase::class);
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
