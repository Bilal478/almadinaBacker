<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProductPrice extends Model
{
    protected $fillable = [
        'product_id', 'effective_from', 'purchase_cost', 'customer_price', 'retailer_price', 'note', 'created_by',
    ];

    protected $casts = [
        'effective_from' => 'date:Y-m-d',
        'purchase_cost' => 'decimal:2',
        'customer_price' => 'decimal:2',
        'retailer_price' => 'decimal:2',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
