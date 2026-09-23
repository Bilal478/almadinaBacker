<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

/** @mixin \App\Models\Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'sku' => $this->sku,
            'barcode' => $this->barcode,
            'qr_code' => $this->qr_code,
            'category_id' => $this->category_id,
            'category_name' => $this->whenLoaded('category', fn () => $this->category?->name),
            'unit' => $this->whenLoaded('unit', fn () => ['id' => $this->unit->id, 'name' => $this->unit->name, 'symbol' => $this->unit->symbol]),
            // Counter/cashier users see selling prices only — cost is gated behind view_purchase_cost,
            // enforced here (not just hidden in the UI) so it never leaves the server either.
            'current_purchase_cost' => $this->when(Gate::allows('view_purchase_cost'), (float) $this->current_purchase_cost),
            'current_customer_price' => (float) $this->current_customer_price,
            'current_retailer_price' => (float) $this->current_retailer_price,
            'low_stock_alert_qty' => $this->low_stock_alert_qty,
            'expiry_controlled' => (bool) $this->expiry_controlled,
            'status' => $this->status,
            'available_stock' => $this->currentStock(),
            'nearest_expiry' => $this->nearestExpiry(),
            'is_low_stock' => $this->isLowStock(),
        ];
    }
}
