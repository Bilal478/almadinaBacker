<?php

namespace App\Services\Products;

use App\Models\Product;
use App\Models\ProductPrice;
use Illuminate\Support\Facades\Auth;

/**
 * Prices are append-only — this is the ONLY place a product_prices row is ever written,
 * and it is always an INSERT. products.current_* columns are just a denormalized cache of
 * the latest row (kept here in one place) so POS search stays fast; product_prices remains
 * the historical source of truth a sale snapshot is taken from.
 */
class ProductPriceService
{
    public function recordPrice(
        Product $product,
        float $purchaseCost,
        float $customerPrice,
        float $retailerPrice,
        ?string $effectiveFrom = null,
        ?string $note = null,
    ): ProductPrice {
        $price = ProductPrice::create([
            'product_id' => $product->id,
            'effective_from' => $effectiveFrom ?? now()->toDateString(),
            'purchase_cost' => $purchaseCost,
            'customer_price' => $customerPrice,
            'retailer_price' => $retailerPrice,
            'note' => $note,
            'created_by' => Auth::id(),
        ]);

        $product->update([
            'current_purchase_cost' => $purchaseCost,
            'current_customer_price' => $customerPrice,
            'current_retailer_price' => $retailerPrice,
        ]);

        return $price;
    }
}
