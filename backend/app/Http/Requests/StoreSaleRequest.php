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
            // A pay-later sale has to say who owes the money.
            'customer_name' => ['nullable', 'required_if:payment_method,CREDIT', 'string', 'max:150'],
            'customer_phone' => ['nullable', 'string', 'max:30'],
            'payment_method' => ['sometimes', 'in:CASH,CARD,BANK_TRANSFER,OTHER,CREDIT'],
            'amount_received' => ['sometimes', 'numeric', 'min:0'],
            'payment_reference' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function messages(): array
    {
        return [
            'customer_name.required_if' => 'Enter the customer name for a pay-later sale.',
        ];
    }
}
