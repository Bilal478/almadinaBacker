<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SaleResource;
use App\Models\Sale;
use App\Services\Sales\SaleCreditService;
use Illuminate\Http\Request;

/** "Pay later" invoices: who still owes money, and recording it when it comes in. */
class CreditSaleController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manage_receivables');

        $request->validate([
            'status' => ['sometimes', 'in:outstanding,settled,all'],
            'search' => ['sometimes', 'nullable', 'string', 'max:150'],
            'date_from' => ['sometimes', 'nullable', 'date'],
            'date_to' => ['sometimes', 'nullable', 'date'],
        ]);

        $query = Sale::with(['cashier', 'payments.receivedBy', 'items.product'])
            ->where('is_credit', true)
            ->where('status', 'completed');

        match ($request->input('status', 'outstanding')) {
            'outstanding' => $query->where('balance_due', '>', 0),
            'settled' => $query->where('balance_due', '<=', 0),
            default => null,
        };

        if ($request->filled('search')) {
            $term = '%' . $request->search . '%';
            $query->where(fn ($q) => $q->where('customer_name', 'like', $term)
                ->orWhere('customer_phone', 'like', $term)
                ->orWhere('invoice_no', 'like', $term));
        }
        if ($request->filled('date_from')) {
            $query->where('sale_date', '>=', $request->date_from);
        }
        if ($request->filled('date_to')) {
            $query->where('sale_date', '<=', $request->date_to);
        }

        $sales = $query->orderByDesc('invoice_no')->paginate($request->integer('per_page', 500));
        return $this->success(SaleResource::collection($sales));
    }

    public function receivePayment(Request $request, Sale $sale, SaleCreditService $service)
    {
        $this->authorize('manage_receivables');

        $data = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'payment_method' => ['required', 'in:CASH,CARD,BANK_TRANSFER,OTHER'],
            'reference' => ['nullable', 'string', 'max:100'],
            'payment_date' => ['sometimes', 'date', 'before_or_equal:today'],
        ]);

        $sale = $service->receivePayment($sale, $data);
        $message = (float) $sale->balance_due > 0 ? 'Partial payment received' : 'Invoice fully paid';
        return $this->success(new SaleResource($sale), $message);
    }
}
