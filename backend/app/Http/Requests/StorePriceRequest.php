<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePriceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'purchase_cost' => ['required', 'numeric', 'min:0'],
            'customer_price' => ['required', 'numeric', 'min:0'],
            'retailer_price' => ['required', 'numeric', 'min:0'],
            'effective_from' => ['sometimes', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }
}
