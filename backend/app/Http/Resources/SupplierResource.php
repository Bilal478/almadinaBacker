<?php

namespace App\Http\Resources;

use App\Services\Suppliers\SupplierLedgerService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\Supplier */
class SupplierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone' => $this->phone,
            'address' => $this->address,
            'supplier_type_id' => $this->supplier_type_id,
            'supplier_type_name' => $this->whenLoaded('supplierType', fn () => $this->supplierType?->name),
            'opening_balance' => (float) $this->opening_balance,
            'status' => $this->status,
            'outstanding' => app(SupplierLedgerService::class)->outstandingBalance($this->resource),
        ];
    }
}
