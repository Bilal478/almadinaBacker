<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StockAdjustmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'product_id' => ['required', 'exists:products,id'],
            'batch_id' => ['nullable', 'exists:inventory_batches,id'],
            'quantity' => ['required', 'numeric', 'min:0.001'],
            'movement_type' => ['required', 'in:ADJUSTMENT_IN,ADJUSTMENT_OUT,DAMAGE,EXPIRY'],
            'reason' => ['required', 'string', 'max:255'],
        ];
    }
}
