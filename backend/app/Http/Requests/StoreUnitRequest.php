<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUnitRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $unitId = $this->route('unit')?->id;

        return [
            'name' => ['required', 'string', 'max:100'],
            'symbol' => ['required', 'string', 'max:20', 'unique:units,symbol,' . $unitId],
            'decimal_allowed' => ['sometimes', 'boolean'],
        ];
    }
}
