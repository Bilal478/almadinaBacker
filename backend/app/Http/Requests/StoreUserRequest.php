<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $userId = $this->route('user')?->id;

        return [
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', 'unique:users,username,' . $userId],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:150'],
            'role_id' => ['required', 'exists:roles,id'],
            'counter' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', 'in:active,inactive'],
            'password' => [$this->isMethod('post') ? 'required' : 'sometimes', 'string', 'min:8'],
        ];
    }
}
