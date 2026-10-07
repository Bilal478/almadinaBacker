<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreExpenseCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function messages(): array
    {
        return ['name.unique' => 'An expense category with this name already exists.'];
    }

    public function rules(): array
    {
        return [
            // Unique so the dropdown never shows two identical names; ignores the category
            // being edited (apiResource names the route param expense_category; null on create).
            'name' => ['required', 'string', 'max:150', Rule::unique('expense_categories', 'name')->ignore($this->route('expense_category'))],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
