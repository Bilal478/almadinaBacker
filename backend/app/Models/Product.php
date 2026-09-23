<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name', 'sku', 'barcode', 'qr_code', 'category_id', 'unit_id',
        'current_purchase_cost', 'current_customer_price', 'current_retailer_price',
        'low_stock_alert_qty', 'expiry_controlled', 'status',
    ];

    protected $casts = [
        'current_purchase_cost' => 'decimal:2',
        'current_customer_price' => 'decimal:2',
        'current_retailer_price' => 'decimal:2',
        'expiry_controlled' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function unit(): BelongsTo
    {
        return $this->belongsTo(Unit::class);
    }

    public function prices(): HasMany
    {
        return $this->hasMany(ProductPrice::class)->orderByDesc('effective_from')->orderByDesc('id');
    }

    public function batches(): HasMany
    {
        return $this->hasMany(InventoryBatch::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function currentStock(): float
    {
        return (float) $this->batches()->sum('remaining_quantity');
    }

    public function nearestExpiry(): ?string
    {
        return $this->batches()
            ->where('remaining_quantity', '>', 0)
            ->whereNotNull('expiry_date')
            ->orderBy('expiry_date')
            ->value('expiry_date');
    }

    public function isLowStock(): bool
    {
        return $this->currentStock() <= $this->low_stock_alert_qty;
    }

    public function priceForTier(string $tier): float
    {
        return $tier === 'retailer' ? (float) $this->current_retailer_price : (float) $this->current_customer_price;
    }
}
