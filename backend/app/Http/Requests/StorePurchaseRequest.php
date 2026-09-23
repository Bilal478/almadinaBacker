<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'supplier_id' => ['required', 'exists:suppliers,id'],
            'purchase_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:150'],
            'invoice_no' => ['nullable', 'string', 'max:100', 'unique:purchases,invoice_no'],
            'paid_amount' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'in:CASH,CARD,BANK_TRANSFER,OTHER'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.unit_id' => ['sometimes', 'exists:units,id'],
            'items.*.purchase_cost' => ['required', 'numeric', 'min:0'],
            'items.*.batch_number' => ['nullable', 'string', 'max:100'],
            'items.*.expiry_date' => ['nullable', 'date'],
        ];
    }
}
