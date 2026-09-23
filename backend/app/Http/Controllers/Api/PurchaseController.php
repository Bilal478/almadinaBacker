<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseRequest;
use App\Models\Purchase;
use App\Services\Purchases\PurchaseService;
use Illuminate\Http\Request;

class PurchaseController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manage_purchases');

        // Eager-loads items too (not just the supplier) — this bakery's frontend shows the
        // whole purchase list in one screen with no pagination UI, so the default page size
        // is generous and the "view" detail doesn't need a second round trip.
        $query = Purchase::with(['supplier', 'items.product', 'items.unit']);
        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->supplier_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('date_from')) {
            $query->where('purchase_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('purchase_date', '<=', $request->date_to);
        }

        return $this->success($query->latest('purchase_date')->paginate($request->integer('per_page', 500)));
    }

    public function show(Purchase $purchase)
    {
        $this->authorize('manage_purchases');
        return $this->success($purchase->load('items.product', 'items.unit', 'supplier', 'batches'));
    }

    public function store(StorePurchaseRequest $request, PurchaseService $service)
    {
        $this->authorize('manage_purchases');
        $purchase = $service->create($request->validated());
        return $this->success($purchase, 'Purchase recorded and stock received', 201);
    }
}
