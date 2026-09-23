<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;

/** @mixin \App\Models\Sale */
class SaleResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $canViewCost = Gate::allows('view_purchase_cost');

        return [
            'id' => $this->id,
            'invoice_no' => $this->invoice_no,
            // sale_date is deliberately date-only (business/accounting date, used for
            // historical price-as-of lookups) — it has no time-of-day component. The
            // receipt needs an actual clock time, which is created_at, not this.
            'sale_date' => $this->sale_date->toDateString(),
            'created_at' => $this->created_at->toIso8601String(),
            'counter' => $this->counter,
            'cashier_id' => $this->cashier_id,
            'cashier_name' => $this->whenLoaded('cashier', fn () => $this->cashier->name),
            'customer_name' => $this->customer_name,
            'price_tier' => $this->price_tier,
            'subtotal' => (float) $this->subtotal,
            'discount' => (float) $this->discount,
            'grand_total' => (float) $this->grand_total,
            'total_cost' => $this->when($canViewCost, (float) $this->total_cost),
            'gross_profit' => $this->when($canViewCost, (float) $this->gross_profit),
            'amount_received' => (float) $this->amount_received,
            'change' => (float) $this->change_amount,
            'status' => $this->status,
            'printed_at' => $this->printed_at?->toIso8601String(),
            'payment_method' => $this->whenLoaded('payments', fn () => $this->payments->first()?->payment_method),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'product_id' => $item->product_id,
                'name' => $item->name,
                'sku' => $item->sku,
                'quantity' => (float) $item->quantity,
                'unit_price' => (float) $item->unit_price,
                'unit_cost' => $canViewCost ? (float) $item->unit_cost : null,
                'discount' => (float) $item->discount,
                'line_total' => (float) $item->line_total,
                'gross_profit' => $canViewCost ? (float) $item->gross_profit : null,
                'returned_quantity' => (float) $item->returned_quantity,
            ])),
        ];
    }
}
