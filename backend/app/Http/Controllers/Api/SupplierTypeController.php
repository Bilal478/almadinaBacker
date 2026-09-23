<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierTypeRequest;
use App\Models\SupplierType;
use Illuminate\Http\Request;

class SupplierTypeController extends Controller
{
    public function index()
    {
        return $this->success(SupplierType::orderBy('name')->get());
    }

    public function show(SupplierType $supplierType)
    {
        return $this->success($supplierType);
    }

    public function store(StoreSupplierTypeRequest $request)
    {
        $this->authorize('manage_suppliers');
        $type = SupplierType::create($request->validated() + ['status' => 'active']);
        return $this->success($type, 'Supplier type created', 201);
    }

    public function update(StoreSupplierTypeRequest $request, SupplierType $supplierType)
    {
        $this->authorize('manage_suppliers');
        $supplierType->update($request->validated());
        return $this->success($supplierType, 'Supplier type updated');
    }

    public function setStatus(Request $request, SupplierType $supplierType)
    {
        $this->authorize('manage_suppliers');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $supplierType->update(['status' => $request->status]);
        return $this->success($supplierType, 'Supplier type status updated');
    }
}
