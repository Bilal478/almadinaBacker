<?php

namespace App\Services\Dashboard;

use App\Models\Expense;
use App\Models\InventoryBatch;
use App\Models\Product;
use App\Models\Purchase;
use App\Models\Sale;
use App\Services\Suppliers\SupplierLedgerService;
use App\Models\Supplier;

class DashboardService
{
    public function __construct(private SupplierLedgerService $ledger)
    {
    }

    public function summary(): array
    {
        $today = now()->toDateString();

        $todaySales = Sale::where('sale_date', $today)->where('status', 'completed')->get();
        $todayPurchases = (float) Purchase::where('purchase_date', $today)->sum('total_amount');
        $todayExpenses = (float) Expense::where('expense_date', $today)->where('status', 'active')->sum('amount');

        $todayRevenue = (float) $todaySales->sum('grand_total');
        $todayCost = (float) $todaySales->sum('total_cost');
        $todayGrossProfit = $todayRevenue - $todayCost;

        $expiringSoon = InventoryBatch::where('remaining_quantity', '>', 0)
            ->whereNotNull('expiry_date')
            ->whereBetween('expiry_date', [$today, now()->addDays(30)->toDateString()])
            ->count();
        $expired = InventoryBatch::where('remaining_quantity', '>', 0)
            ->whereNotNull('expiry_date')
            ->where('expiry_date', '<', $today)
            ->count();

        $lowStockCount = Product::where('status', 'active')->get()->filter(fn (Product $p) => $p->isLowStock())->count();
        $inventoryValue = (float) InventoryBatch::where('remaining_quantity', '>', 0)
            ->selectRaw('SUM(remaining_quantity * unit_cost) as value')
            ->value('value');

        $supplierOutstanding = Supplier::all()->sum(fn (Supplier $s) => $this->ledger->outstandingBalance($s));

        return [
            'today_sales' => round($todayRevenue, 2),
            'today_sales_count' => $todaySales->count(),
            'today_purchases' => round($todayPurchases, 2),
            'today_expenses' => round($todayExpenses, 2),
            'today_gross_profit' => round($todayGrossProfit, 2),
            'today_net_profit' => round($todayGrossProfit - $todayExpenses, 2),
            'inventory_value' => round($inventoryValue, 2),
            'low_stock_count' => $lowStockCount,
            'expired_stock_count' => $expired,
            'expiring_soon_count' => $expiringSoon,
            'supplier_outstanding' => round($supplierOutstanding, 2),
        ];
    }
}
