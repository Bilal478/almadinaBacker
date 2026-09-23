<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleRequest;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\Sales\SaleService;
use Illuminate\Http\Request;

class SaleController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('view_reports');

        $query = Sale::with(['cashier', 'payments', 'items.product']);
        if ($request->filled('date_from')) {
            $query->where('sale_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('sale_date', '<=', $request->date_to);
        }
        if ($request->filled('seller_id')) {
            $query->where('cashier_id', $request->seller_id);
        }
        if ($request->filled('payment_method')) {
            $query->whereHas('payments', fn ($q) => $q->where('payment_method', $request->payment_method));
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $sales = $query->latest('sale_date')->paginate($request->integer('per_page', 500));
        return $this->success(SaleResource::collection($sales));
    }

    public function show(Sale $sale)
    {
        $this->authorize('view_pos');
        return $this->success(new SaleResource($sale->load(['items.product', 'payments', 'cashier'])));
    }

    public function store(StoreSaleRequest $request, SaleService $service)
    {
        $this->authorize('create_sale');
        $sale = $service->create($request->validated());
        return $this->success(new SaleResource($sale), 'Sale completed', 201);
    }

    public function void(Sale $sale, SaleService $service)
    {
        $this->authorize('void_sale');
        $sale = $service->void($sale);
        return $this->success(new SaleResource($sale), 'Sale voided and stock restored');
    }

    /**
     * Records that this sale's receipt was actually sent to the printer — separate from
     * `status`, which is already 'completed' the instant the sale is saved. Lets staff tell
     * "sold, never printed" (printer jam/out of paper) apart from "printed", and reprint.
     * Idempotent: printing twice keeps the original printed_at, not the latest.
     */
    public function markPrinted(Sale $sale)
    {
        $this->authorize('create_sale');
        if (!$sale->printed_at) {
            $sale->update(['printed_at' => now()]);
        }
        // Without this load, SaleResource's whenLoaded('items', ...) has nothing to report,
        // the frontend takes a missing `items` key as "no items", and overwrites this sale's
        // items in the client-side store with an empty array — wiping them from every screen
        // that reads the store (e.g. a later reprint from the Sales Report), not just here.
        return $this->success(new SaleResource($sale->load(['items.product', 'payments', 'cashier'])), 'Sale marked as printed');
    }
}
