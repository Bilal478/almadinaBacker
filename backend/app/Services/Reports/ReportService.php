<?php

namespace App\Services\Reports;

use App\Models\Expense;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\SaleReturn;
use App\Models\Supplier;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Every report here works from the same historical snapshots the sale/purchase were
 * recorded with (sale_items.unit_price/unit_cost, batches.unit_cost) — never today's
 * product price — so a price change made this morning cannot silently rewrite last
 * month's profit numbers.
 */
class ReportService
{
    public function salesReport(array $filters): array
    {
        $sales = $this->filteredSales($filters)->get();
        $saleIds = $sales->pluck('id');
        $returns = SaleReturn::whereIn('sale_id', $saleIds)->with('items')->get();

        $grossSales = (float) $sales->sum('subtotal');
        $discount = (float) $sales->sum('discount');
        $returnsTotal = (float) $returns->sum('total_refund');
        // Returned stock goes back to inventory — its cost is no longer "cost of goods SOLD",
        // so COGS (and therefore gross profit) must drop by the cost of the exact units that
        // came back, not just have revenue reduced by their sale price.
        $returnedCost = (float) $returns->flatMap->items->sum(fn ($item) => (float) $item->quantity * (float) $item->unit_cost);
        $cogs = (float) $sales->sum('total_cost') - $returnedCost;
        $netSales = $grossSales - $discount - $returnsTotal;

        return [
            'summary' => [
                'total_invoices' => $sales->count(),
                'total_quantity' => (float) $this->filteredSaleItems($filters)->sum('sale_items.quantity'),
                'gross_sales' => round($grossSales, 2),
                'discount' => round($discount, 2),
                'returns' => round($returnsTotal, 2),
                'net_sales' => round($netSales, 2),
                'cogs' => round($cogs, 2),
                'gross_profit' => round($netSales - $cogs, 2),
            ],
            'rows' => $sales->map(function (Sale $sale) use ($returns) {
                $saleReturned = (float) $returns->where('sale_id', $sale->id)->sum('total_refund');
                return [
                    'id' => $sale->id,
                    'invoice_no' => $sale->invoice_no,
                    'sale_date' => $sale->sale_date->toDateString(),
                    'cashier' => $sale->cashier?->name,
                    'subtotal' => (float) $sale->subtotal,
                    'discount' => (float) $sale->discount,
                    'grand_total' => (float) $sale->grand_total,
                    'returned' => round($saleReturned, 2),
                    'net_total' => round((float) $sale->grand_total - $saleReturned, 2),
                    'payment_method' => $sale->payments->first()?->payment_method,
                    'status' => $sale->status,
                ];
            })->values(),
        ];
    }

    /**
     * Net of returns throughout — sale_items.returned_quantity is a running total kept up to
     * date by SaleReturnService every time a return is recorded, so quantity/revenue/cogs
     * here are computed straight from it rather than joining sale_returns separately.
     */
    public function productSalesReport(array $filters): array
    {
        $rows = $this->filteredSaleItems($filters)
            ->select(
                'products.id as product_id',
                'products.name as product_name',
                'products.sku',
                DB::raw('SUM(sale_items.quantity - sale_items.returned_quantity) as quantity'),
                DB::raw('SUM(sale_items.line_total - (sale_items.returned_quantity * sale_items.unit_price)) as revenue'),
                DB::raw('SUM((sale_items.quantity - sale_items.returned_quantity) * sale_items.unit_cost) as cogs'),
                DB::raw('SUM((sale_items.line_total - (sale_items.returned_quantity * sale_items.unit_price)) - ((sale_items.quantity - sale_items.returned_quantity) * sale_items.unit_cost)) as gross_profit'),
            )
            ->join('products', 'products.id', '=', 'sale_items.product_id')
            ->groupBy('products.id', 'products.name', 'products.sku')
            ->orderByDesc('revenue')
            ->get();

        return ['rows' => $rows];
    }

    /**
     * Net of returns — a raw grouped-SQL join against sale_returns would double-count returns
     * across sale_return_items rows, so (like salesReport/profitReport) this loops the sales
     * in PHP and subtracts each sale's own return total instead.
     */
    public function sellerReport(array $filters): array
    {
        $sales = $this->filteredSales($filters)->get();
        $returns = SaleReturn::whereIn('sale_id', $sales->pluck('id'))->get()->groupBy('sale_id');

        $bySeller = [];
        foreach ($sales as $sale) {
            $sellerId = $sale->cashier_id;
            $bySeller[$sellerId] ??= [
                'seller_id' => $sellerId,
                'seller_name' => $sale->cashier?->name,
                'invoice_count' => 0,
                'gross_sales' => 0.0,
                'discount' => 0.0,
                'net_sales' => 0.0,
            ];
            $returned = (float) ($returns->get($sale->id) ?? collect())->sum('total_refund');

            $bySeller[$sellerId]['invoice_count']++;
            $bySeller[$sellerId]['gross_sales'] += (float) $sale->subtotal;
            $bySeller[$sellerId]['discount'] += (float) $sale->discount;
            $bySeller[$sellerId]['net_sales'] += (float) $sale->grand_total - $returned;
        }

        $rows = collect(array_values($bySeller))
            ->map(fn ($row) => [...$row, 'gross_sales' => round($row['gross_sales'], 2), 'discount' => round($row['discount'], 2), 'net_sales' => round($row['net_sales'], 2)])
            ->sortByDesc('net_sales')
            ->values();

        return ['rows' => $rows];
    }

    public function supplierReport(array $filters): array
    {
        $query = Supplier::query();
        if (!empty($filters['supplier_id'])) {
            $query->where('id', $filters['supplier_id']);
        }

        $suppliers = $query->get();
        $ledgerService = app(\App\Services\Suppliers\SupplierLedgerService::class);

        $rows = $suppliers->map(function (Supplier $supplier) use ($filters, $ledgerService) {
            $purchases = Purchase::where('supplier_id', $supplier->id)
                ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('purchase_date', '>=', $v))
                ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('purchase_date', '<=', $v))
                ->sum('total_amount');
            $payments = $supplier->payments()
                ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('payment_date', '>=', $v))
                ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('payment_date', '<=', $v))
                ->sum('amount');

            return [
                'supplier_id' => $supplier->id,
                'supplier_name' => $supplier->name,
                'purchases' => round((float) $purchases, 2),
                'payments' => round((float) $payments, 2),
                'outstanding' => round($ledgerService->outstandingBalance($supplier), 2),
            ];
        });

        return ['rows' => $rows];
    }

    public function purchaseReport(array $filters): array
    {
        $query = Purchase::query()->with('supplier');
        $this->applyDateRange($query, $filters, 'purchase_date');
        if (!empty($filters['supplier_id'])) {
            $query->where('supplier_id', $filters['supplier_id']);
        }

        $purchases = $query->get();

        return [
            'summary' => [
                'total_purchases' => round((float) $purchases->sum('total_amount'), 2),
                'total_paid' => round((float) $purchases->sum('paid_amount'), 2),
                'total_due' => round((float) $purchases->sum('due_amount'), 2),
            ],
            'rows' => $purchases->map(fn (Purchase $p) => [
                'id' => $p->id,
                'invoice_no' => $p->invoice_no,
                'supplier' => $p->supplier->name,
                'purchase_date' => $p->purchase_date->toDateString(),
                'total_amount' => (float) $p->total_amount,
                'paid_amount' => (float) $p->paid_amount,
                'due_amount' => (float) $p->due_amount,
                'status' => $p->status,
            ])->values(),
        ];
    }

    public function inventoryReport(array $filters): array
    {
        $query = Product::query()->with(['unit', 'category']);
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        $products = $query->get();

        $rows = $products->flatMap(function (Product $product) {
            return $product->batches()->where('remaining_quantity', '>', 0)->get()->map(fn (InventoryBatch $batch) => [
                'product_id' => $product->id,
                'product_name' => $product->name,
                'batch_number' => $batch->batch_number,
                'expiry_date' => $batch->expiry_date?->toDateString(),
                'unit_cost' => (float) $batch->unit_cost,
                'remaining_quantity' => (float) $batch->remaining_quantity,
                'stock_value' => round((float) $batch->remaining_quantity * (float) $batch->unit_cost, 2),
            ]);
        })->values();

        return [
            'summary' => ['total_stock_value' => round((float) $rows->sum('stock_value'), 2)],
            'rows' => $rows,
        ];
    }

    public function expenseReport(array $filters): array
    {
        $query = Expense::query()->with('category')->where('status', 'active');
        $this->applyDateRange($query, $filters, 'expense_date');
        if (!empty($filters['category_id'])) {
            $query->where('category_id', $filters['category_id']);
        }

        $expenses = $query->get();

        return [
            'summary' => ['total_expenses' => round((float) $expenses->sum('amount'), 2)],
            'rows' => $expenses->map(fn (Expense $e) => [
                'id' => $e->id,
                'date' => $e->expense_date->toDateString(),
                'category' => $e->category->name,
                'description' => $e->description,
                'amount' => (float) $e->amount,
            ])->values(),
        ];
    }

    /**
     * Revenue - COGS = Gross Profit; Gross Profit - Expenses = Net Profit, broken down by
     * month — net of returns. sale_return_items.unit_cost is the exact cost of the specific
     * units that came back (copied from the sale item when the return was recorded), so COGS
     * is reduced precisely rather than by a proportional guess.
     */
    public function profitReport(array $filters): array
    {
        $sales = $this->filteredSales($filters)->get();
        $returns = SaleReturn::whereIn('sale_id', $sales->pluck('id'))->with('items')->get()->groupBy('sale_id');
        $expenses = Expense::where('status', 'active')
            ->when($filters['date_from'] ?? null, fn ($q, $v) => $q->where('expense_date', '>=', $v))
            ->when($filters['date_to'] ?? null, fn ($q, $v) => $q->where('expense_date', '<=', $v))
            ->get();

        $byMonth = [];
        foreach ($sales as $sale) {
            $month = $sale->sale_date->format('Y-m');
            $byMonth[$month] ??= ['month' => $month, 'revenue' => 0, 'cogs' => 0, 'expenses' => 0];

            $saleReturns = $returns->get($sale->id) ?? collect();
            $returnedRevenue = (float) $saleReturns->sum('total_refund');
            $returnedCost = (float) $saleReturns->flatMap->items->sum(fn ($item) => (float) $item->quantity * (float) $item->unit_cost);

            $byMonth[$month]['revenue'] += (float) $sale->grand_total - $returnedRevenue;
            $byMonth[$month]['cogs'] += (float) $sale->total_cost - $returnedCost;
        }
        foreach ($expenses as $expense) {
            $month = Carbon::parse($expense->expense_date)->format('Y-m');
            $byMonth[$month] ??= ['month' => $month, 'revenue' => 0, 'cogs' => 0, 'expenses' => 0];
            $byMonth[$month]['expenses'] += (float) $expense->amount;
        }

        ksort($byMonth);
        $rows = array_map(function ($row) {
            $grossProfit = $row['revenue'] - $row['cogs'];
            return [
                ...$row,
                'gross_profit' => round($grossProfit, 2),
                'net_profit' => round($grossProfit - $row['expenses'], 2),
            ];
        }, array_values($byMonth));

        $totalRevenue = array_sum(array_column($rows, 'revenue'));
        $totalCogs = array_sum(array_column($rows, 'cogs'));
        $totalExpenses = array_sum(array_column($rows, 'expenses'));

        return [
            'summary' => [
                'revenue' => round($totalRevenue, 2),
                'cogs' => round($totalCogs, 2),
                'gross_profit' => round($totalRevenue - $totalCogs, 2),
                'expenses' => round($totalExpenses, 2),
                'net_profit' => round($totalRevenue - $totalCogs - $totalExpenses, 2),
            ],
            'rows' => $rows,
        ];
    }

    public function lowStockReport(): array
    {
        $products = Product::with('unit')->where('status', 'active')->get()
            ->filter(fn (Product $p) => $p->isLowStock())
            ->map(fn (Product $p) => [
                'product_id' => $p->id,
                'product_name' => $p->name,
                'current_stock' => $p->currentStock(),
                'alert_quantity' => $p->low_stock_alert_qty,
                'status' => 'LOW_STOCK',
            ])->values();

        return ['rows' => $products];
    }

    public function expiringReport(int $days = 30): array
    {
        $cutoff = now()->addDays($days)->toDateString();
        $batches = InventoryBatch::with('product')
            ->where('remaining_quantity', '>', 0)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<=', $cutoff)
            ->orderBy('expiry_date')
            ->get();

        return ['rows' => $batches->map(fn (InventoryBatch $b) => [
            'product_id' => $b->product_id,
            'product_name' => $b->product->name,
            'batch_number' => $b->batch_number,
            'expiry_date' => $b->expiry_date->toDateString(),
            'remaining_quantity' => (float) $b->remaining_quantity,
            'unit_cost' => (float) $b->unit_cost,
            'is_expired' => $b->expiry_date->isPast(),
        ])->values()];
    }

    private function filteredSales(array $filters)
    {
        $query = Sale::query()->with(['cashier', 'payments'])->where('status', 'completed');
        $this->applyDateRange($query, $filters, 'sale_date');

        if (!empty($filters['seller_id'])) {
            $query->where('cashier_id', $filters['seller_id']);
        }
        if (!empty($filters['payment_method'])) {
            $query->whereHas('payments', fn ($q) => $q->where('payment_method', $filters['payment_method']));
        }
        if (!empty($filters['product_id'])) {
            $query->whereHas('items', fn ($q) => $q->where('product_id', $filters['product_id']));
        }

        return $query;
    }

    private function filteredSaleItems(array $filters)
    {
        $query = SaleItem::query()
            ->join('sales', 'sales.id', '=', 'sale_items.sale_id')
            ->where('sales.status', 'completed');

        if (!empty($filters['date_from'])) {
            $query->where('sales.sale_date', '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where('sales.sale_date', '<=', $filters['date_to']);
        }
        if (!empty($filters['seller_id'])) {
            $query->where('sales.cashier_id', $filters['seller_id']);
        }
        if (!empty($filters['product_id'])) {
            $query->where('sale_items.product_id', $filters['product_id']);
        }

        return $query;
    }

    private function applyDateRange($query, array $filters, string $column): void
    {
        if (!empty($filters['date_from'])) {
            $query->where($column, '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->where($column, '<=', $filters['date_to']);
        }
    }
}
