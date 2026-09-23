<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin \App\Models\User */
class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'username' => $this->username,
            'phone' => $this->phone,
            'email' => $this->email,
            'counter' => $this->counter,
            'status' => $this->status,
            'role_id' => $this->role_id,
            'role_name' => $this->whenLoaded('role', fn () => $this->role->name),
            'permissions' => $this->whenLoaded('role', fn () => $this->role->permissions->pluck('key')),
        ];
    }
}
