<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.product_id' => ['required', 'exists:products,id'],
            'items.*.quantity' => ['required', 'numeric', 'min:0.001'],
            'items.*.discount' => ['sometimes', 'numeric', 'min:0'],
            'price_tier' => ['required', 'in:customer,retailer'],
            'discount' => ['sometimes', 'numeric', 'min:0'],
            'customer_name' => ['nullable', 'string', 'max:150'],
            'payment_method' => ['sometimes', 'in:CASH,CARD,BANK_TRANSFER,OTHER'],
            'amount_received' => ['sometimes', 'numeric', 'min:0'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ];
    }
}
