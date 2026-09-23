<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSupplierPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            // Only required on the flat POST /supplier-payments route — the nested
            // /suppliers/{supplier}/payments route already has the supplier from the URL.
            'supplier_id' => [$this->route('supplier') ? 'sometimes' : 'required', 'exists:suppliers,id'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_date' => ['required', 'date'],
            'reference' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'payment_method' => ['sometimes', 'in:CASH,CARD,BANK_TRANSFER,OTHER'],
        ];
    }
}
