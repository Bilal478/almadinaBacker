<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;

class PermissionController extends Controller
{
    /** Grouped exactly like the frontend's Permission Matrix expects to render them. */
    public function index()
    {
        $permissions = Permission::orderBy('id')->get()->groupBy('group')->map(
            fn ($items) => $items->map(fn (Permission $p) => ['key' => $p->key, 'label' => $p->label])->values()
        );

        return $this->success($permissions);
    }
}
