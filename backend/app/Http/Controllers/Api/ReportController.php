<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Reports\ReportService;
use Illuminate\Http\Request;

class ReportController extends Controller
{
    public function __construct(private ReportService $reports)
    {
    }

    private function filters(Request $request): array
    {
        return $request->only(['date_from', 'date_to', 'supplier_id', 'product_id', 'category_id', 'seller_id', 'payment_method', 'status']);
    }

    public function sales(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->salesReport($this->filters($request)));
    }

    public function productSales(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->productSalesReport($this->filters($request)));
    }

    public function sellers(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->sellerReport($this->filters($request)));
    }

    public function suppliers(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->supplierReport($this->filters($request)));
    }

    public function purchases(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->purchaseReport($this->filters($request)));
    }

    public function inventory(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->inventoryReport($this->filters($request)));
    }

    public function expenses(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->expenseReport($this->filters($request)));
    }

    public function profit(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->profitReport($this->filters($request)));
    }

    public function lowStock()
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->lowStockReport());
    }

    public function expiring(Request $request)
    {
        $this->authorize('view_reports');
        return $this->success($this->reports->expiringReport($request->integer('days', 30)));
    }
}
