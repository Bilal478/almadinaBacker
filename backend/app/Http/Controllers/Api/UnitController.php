<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUnitRequest;
use App\Models\Unit;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index()
    {
        return $this->success(Unit::orderBy('name')->get());
    }

    public function store(StoreUnitRequest $request)
    {
        $this->authorize('manage_products');
        $unit = Unit::create($request->validated() + ['status' => 'active']);
        return $this->success($unit, 'Unit created', 201);
    }

    public function update(StoreUnitRequest $request, Unit $unit)
    {
        $this->authorize('manage_products');
        $unit->update($request->validated());
        return $this->success($unit, 'Unit updated');
    }

    public function setStatus(Request $request, Unit $unit)
    {
        $this->authorize('manage_products');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $unit->update(['status' => $request->status]);
        return $this->success($unit, 'Unit status updated');
    }
}
