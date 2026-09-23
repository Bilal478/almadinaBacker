<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StockAdjustmentRequest;
use App\Models\InventoryBatch;
use App\Models\InventoryMovement;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use App\Services\Reports\ReportService;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('manage_inventory');

        $query = InventoryBatch::with(['product', 'supplier']);
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return $this->success($query->orderByDesc('purchase_date')->paginate($request->integer('per_page', 500)));
    }

    public function forProduct(Product $product)
    {
        $this->authorize('manage_inventory');
        return $this->success([
            'product_id' => $product->id,
            'available_stock' => $product->currentStock(),
            'batches' => $product->batches()->orderBy('purchase_date')->get(),
        ]);
    }

    public function movements(Request $request)
    {
        $this->authorize('manage_inventory');

        $query = InventoryMovement::with('product');
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        return $this->success($query->latest()->paginate($request->integer('per_page', 500)));
    }

    public function lowStock(ReportService $reports)
    {
        $this->authorize('manage_inventory');
        return $this->success($reports->lowStockReport()['rows']);
    }

    public function expired(ReportService $reports)
    {
        $this->authorize('manage_inventory');
        $rows = collect($reports->expiringReport(0)['rows'])->filter(fn ($r) => $r['is_expired'])->values();
        return $this->success($rows);
    }

    public function expiring(Request $request, ReportService $reports)
    {
        $this->authorize('manage_inventory');
        return $this->success($reports->expiringReport($request->integer('days', 30))['rows']);
    }

    /** Manual stock correction — the only screen where "manage_inventory" actually does something beyond viewing. */
    public function adjust(StockAdjustmentRequest $request, InventoryService $inventory)
    {
        $this->authorize('manage_inventory');

        $product = Product::findOrFail($request->product_id);
        $batch = $request->batch_id ? InventoryBatch::find($request->batch_id) : null;

        $inventory->adjust($product, $batch, (float) $request->quantity, $request->movement_type, $request->reason);

        return $this->success(['product_id' => $product->id, 'available_stock' => $product->fresh()->currentStock()], 'Stock adjusted');
    }
}
