<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\BusinessException;
use App\Http\Controllers\Controller;
use App\Http\Requests\StorePriceRequest;
use App\Http\Requests\StoreProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Services\Inventory\InventoryService;
use App\Services\Products\BarcodeLookupService;
use App\Services\Products\ProductPriceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    private const WITH = ['category', 'unit'];

    public function index(Request $request)
    {
        $this->authorize('view_products');

        $query = Product::with(self::WITH);
        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        return $this->success(ProductResource::collection($query->orderBy('name')->paginate($request->integer('per_page', 500))));
    }

    /** Shared by the Products screen search box and the POS counter search — same data, two entry points. */
    public function search(Request $request)
    {
        $this->authorize($request->routeIs('pos.*') ? 'view_pos' : 'view_products');

        $q = trim((string) $request->query('q', ''));
        $products = Product::with(self::WITH)
            ->where('status', 'active')
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($query) use ($q) {
                    $query->where('name', 'like', "%{$q}%")
                        ->orWhere('sku', 'like', "%{$q}%")
                        ->orWhere('barcode', 'like', "%{$q}%");
                });
            })
            ->orderBy('name')
            ->limit(50)
            ->get();

        return $this->success(ProductResource::collection($products));
    }

    public function findByBarcode(Request $request, string $barcode)
    {
        $this->authorize($request->routeIs('pos.*') ? 'view_pos' : 'view_products');
        $product = Product::with(self::WITH)->where('barcode', $barcode)->where('status', 'active')->first();
        if (!$product) {
            throw new BusinessException("No active product with barcode \"{$barcode}\".", 'PRODUCT_NOT_FOUND', 404);
        }
        return $this->success(new ProductResource($product));
    }

    public function findByQr(Request $request, string $qr)
    {
        $this->authorize($request->routeIs('pos.*') ? 'view_pos' : 'view_products');
        $product = Product::with(self::WITH)->where('qr_code', $qr)->where('status', 'active')->first();
        if (!$product) {
            throw new BusinessException("No active product with that QR code.", 'PRODUCT_NOT_FOUND', 404);
        }
        return $this->success(new ProductResource($product));
    }

    /**
     * Best-effort lookup of a barcode this bakery has never seen before, against a public
     * product database — so the "add new product" form can be pre-filled with a real name
     * instead of a blank field. Always succeeds with a 200; `found: false` (not a 404) means
     * "nothing there, type it yourself as usual" — a miss here is a normal, expected outcome
     * for house-made items, not a failure.
     */
    public function lookupBarcode(string $barcode, BarcodeLookupService $lookup)
    {
        $this->authorize('manage_products');
        $result = $lookup->lookup($barcode);

        return $this->success($result ? ['found' => true] + $result : ['found' => false]);
    }

    public function findBySku(string $sku)
    {
        $this->authorize('view_products');
        $product = Product::with(self::WITH)->where('sku', $sku)->first();
        if (!$product) {
            throw new BusinessException("No product with SKU \"{$sku}\".", 'PRODUCT_NOT_FOUND', 404);
        }
        return $this->success(new ProductResource($product));
    }

    public function show(Product $product)
    {
        $this->authorize('view_products');
        return $this->success(new ProductResource($product->load(self::WITH)));
    }

    /**
     * Creates a product, its first (bundled) price record, and — if an opening quantity is
     * given — a real opening-stock batch (no fake purchase/supplier behind it). All three
     * happen together so the product is immediately sellable, not created "empty".
     */
    public function store(StoreProductRequest $request, ProductPriceService $priceService, InventoryService $inventory)
    {
        $this->authorize('manage_products');

        $product = DB::transaction(function () use ($request, $priceService, $inventory) {
            $sku = $request->filled('sku') ? $request->input('sku') : $this->generateSku($request->input('category_id'));

            $product = Product::create($request->only([
                'name', 'barcode', 'qr_code', 'category_id', 'unit_id', 'low_stock_alert_qty',
            ]) + [
                'sku' => $sku,
                'status' => $request->input('status', 'active'),
                // Explicit, not left to the column default — Product::create()'s in-memory
                // instance never sees a DB-level default for a key it wasn't given, so the
                // create response would otherwise show `false` here even though the row
                // that lands in the database is `true`.
                'expiry_controlled' => $request->boolean('expiry_controlled', true),
            ]);

            $priceService->recordPrice(
                $product,
                (float) $request->purchase_cost,
                (float) $request->customer_price,
                (float) $request->retailer_price,
                note: 'Initial pricing',
            );

            $openingQty = (float) $request->input('opening_quantity', 0);
            if ($openingQty > 0) {
                $inventory->receiveBatch(
                    product: $product,
                    quantity: $openingQty,
                    unitCost: (float) $request->purchase_cost,
                    batchNumber: 'OPENING-' . $product->sku,
                    purchaseDate: now()->toDateString(),
                    expiryDate: $request->opening_expiry_date,
                );
            }

            return $product;
        });

        return $this->success(new ProductResource($product->load(self::WITH)), 'Product created', 201);
    }

    /** {CategoryPrefix}-{sequence}, e.g. "BAK-004" — falls back to a generic "PRD" prefix when uncategorized. */
    private function generateSku(?int $categoryId): string
    {
        $prefix = 'PRD';
        $categoryName = $categoryId ? Category::find($categoryId)?->name : null;
        if ($categoryName) {
            $letters = strtoupper(preg_replace('/[^A-Za-z]/', '', $categoryName));
            if ($letters !== '') {
                $prefix = substr($letters, 0, 3);
            }
        }

        $count = Product::where('sku', 'like', "{$prefix}-%")->count();
        do {
            $count++;
            $sku = sprintf('%s-%03d', $prefix, $count);
        } while (Product::where('sku', $sku)->exists());

        return $sku;
    }

    /** Core fields only — pricing changes go through recordPrice() to keep history intact. */
    public function update(StoreProductRequest $request, Product $product)
    {
        $this->authorize('manage_products');
        $product->update($request->only([
            'name', 'sku', 'barcode', 'qr_code', 'category_id', 'unit_id', 'low_stock_alert_qty', 'expiry_controlled', 'status',
        ]));
        return $this->success(new ProductResource($product->load(self::WITH)), 'Product updated');
    }

    public function setStatus(Request $request, Product $product)
    {
        $this->authorize('manage_products');
        $request->validate(['status' => ['required', 'in:active,inactive']]);
        $product->update(['status' => $request->status]);
        return $this->success(new ProductResource($product->load(self::WITH)), 'Product status updated');
    }

    /**
     * Full batch history, not just active stock — the frontend's Batch/Stock History tab
     * is meant to show depleted batches too (e.g. Premium Biscuits' January batch, sold out
     * months ago), which "available stock" alone would hide.
     */
    public function stock(Product $product)
    {
        $this->authorize('view_products');
        return $this->success([
            'product_id' => $product->id,
            'available_stock' => $product->currentStock(),
            'batches' => $product->batches()->with('supplier')->orderBy('purchase_date')->get(),
        ]);
    }

    public function priceHistory(Product $product)
    {
        $this->authorize('manage_products');
        return $this->success($product->prices()->with('createdBy')->get());
    }

    public function addPrice(StorePriceRequest $request, Product $product, ProductPriceService $priceService)
    {
        $this->authorize('manage_products');
        $price = $priceService->recordPrice(
            $product,
            (float) $request->purchase_cost,
            (float) $request->customer_price,
            (float) $request->retailer_price,
            $request->input('effective_from'),
            $request->input('note'),
        );
        return $this->success($price, 'Price recorded — previous prices remain in history', 201);
    }

    public function inventoryHistory(Product $product)
    {
        $this->authorize('manage_inventory');
        return $this->success($product->movements()->latest()->paginate(50));
    }
}
