<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manage_users');

        $query = AuditLog::with('user');
        if ($request->filled('module')) {
            $query->where('module', $request->module);
        }
        if ($request->filled('entity_type')) {
            $query->where('entity_type', $request->entity_type);
        }
        if ($request->filled('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        return $this->success($query->latest()->paginate($request->integer('per_page', 50)));
    }
}
