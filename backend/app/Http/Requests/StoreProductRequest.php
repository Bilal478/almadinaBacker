<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** An empty string from the form means "no barcode" — normalize it to null so it's
     *  treated as absent (skips the unique check, matches how the DB column now allows
     *  many NULLs) instead of colliding with every other barcode-less product. */
    protected function prepareForValidation(): void
    {
        if ($this->input('barcode') === '') {
            $this->merge(['barcode' => null]);
        }
    }

    public function rules(): array
    {
        $productId = $this->route('product')?->id;

        return [
            'name' => ['required', 'string', 'max:150'],
            // Left blank on creation, the controller assigns one automatically.
            'sku' => ['sometimes', 'string', 'max:100', 'unique:products,sku,' . $productId],
            // Not every product has a real printed barcode — a house-made item entered
            // without a scanner simply won't be scannable, which is expected, not an error.
            'barcode' => ['nullable', 'string', 'max:100', 'unique:products,barcode,' . $productId],
            'qr_code' => ['nullable', 'string', 'max:100'],
            'category_id' => ['nullable', 'exists:categories,id'],
            'unit_id' => ['required', 'exists:units,id'],
            'low_stock_alert_qty' => ['sometimes', 'integer', 'min:0'],
            'expiry_controlled' => ['sometimes', 'boolean'],
            'status' => ['sometimes', 'in:active,inactive'],
            // Only required when creating — pricing after that goes through the price-history endpoint.
            'purchase_cost' => [$this->isMethod('post') ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'customer_price' => [$this->isMethod('post') ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'retailer_price' => [$this->isMethod('post') ? 'required' : 'sometimes', 'numeric', 'min:0'],
            'opening_quantity' => ['sometimes', 'numeric', 'min:0'],
            'opening_expiry_date' => ['nullable', 'date'],
        ];
    }
}
