<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSupplierPaymentRequest;
use App\Http\Requests\StoreSupplierRequest;
use App\Http\Resources\SupplierResource;
use App\Models\Supplier;
use App\Models\SupplierLedgerEntry;
use App\Services\Suppliers\SupplierLedgerService;
use App\Services\Suppliers\SupplierPaymentService;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index()
    {
        $this->authorize('manage_suppliers');
        $suppliers = Supplier::with('supplierType')->orderBy('name')->get();
        return $this->success(SupplierResource::collection($suppliers));
    }

    public function show(Supplier $supplier)
    {
        $this->authorize('manage_suppliers');
        return $this->success(new SupplierResource($supplier->load('supplierType')));
    }

    /** Supplier + outstanding + recent purchases + recent payments in one call — avoids the frontend making four round trips for one detail screen. */
    public function summary(Supplier $supplier, SupplierLedgerService $ledger)
    {
        $this->authorize('manage_suppliers');

        return $this->success([
            'supplier' => new SupplierResource($supplier->load('supplierType')),
            'total_purchases' => (float) $supplier->purchases()->sum('total_amount'),
            'total_payments' => (float) $supplier->payments()->sum('amount'),
            'outstanding' => $ledger->outstandingBalance($supplier),
            'recent_purchases' => $supplier->purchases()->latest('purchase_date')->take(5)->get(),
            'recent_payments' => $supplier->payments()->latest('payment_date')->take(5)->get(),
        ]);
    }

    public function store(StoreSupplierRequest $request)
    {
        $this->authorize('manage_suppliers');
        $supplier = Supplier::create($request->validated() + ['status' => 'active']);
        return $this->success(new SupplierResource($supplier->load('supplierType')), 'Supplier created', 201);
    }

    public function update(StoreSupplierRequest $request, Supplier $supplier)
    {
        $this->authorize('manage_suppliers');
        $supplier->update($request->safe()->except('opening_balance'));
        return $this->success(new SupplierResource($supplier->load('supplierType')), 'Supplier updated');
    }

    public function setStatus(Request $request, Supplier $supplier)
    {
        $this->authorize('manage_suppliers');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $supplier->update(['status' => $request->status]);
        return $this->success(new SupplierResource($supplier->load('supplierType')), 'Supplier status updated');
    }

    public function ledger(Request $request, Supplier $supplier)
    {
        $this->authorize('view_supplier_balances');

        $query = SupplierLedgerEntry::where('supplier_id', $supplier->id)->orderBy('transaction_date')->orderBy('id');
        if ($request->filled('from_date')) {
            $query->where('transaction_date', '>=', $request->from_date);
        }
        if ($request->filled('to_date')) {
            $query->where('transaction_date', '<=', $request->to_date);
        }

        return $this->success($query->paginate($request->integer('per_page', 500)));
    }

    public function purchases(Supplier $supplier)
    {
        $this->authorize('manage_purchases');
        return $this->success($supplier->purchases()->latest('purchase_date')->paginate(20));
    }

    public function payments(Supplier $supplier)
    {
        $this->authorize('manage_supplier_payments');
        return $this->success($supplier->payments()->latest('payment_date')->paginate(20));
    }

    public function storePayment(StoreSupplierPaymentRequest $request, SupplierPaymentService $service, ?Supplier $supplier = null)
    {
        $this->authorize('manage_supplier_payments');
        $supplier ??= Supplier::findOrFail($request->supplier_id);
        $payment = $service->create($supplier, $request->validated());
        return $this->success($payment, 'Payment recorded', 201);
    }
}
