<?php

use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ExpenseCategoryController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\PurchaseReturnController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SaleController;
use App\Http\Controllers\Api\SaleReturnController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SupplierTypeController;
use App\Http\Controllers\Api\UnitController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ---------- Auth (no token required) ----------
Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/change-password', [AuthController::class, 'changePassword']);

    // ---------- Dashboard ----------
    Route::get('/dashboard/summary', [DashboardController::class, 'summary']);

    // ---------- Settings (store identity — printed on every receipt/invoice) ----------
    Route::get('/settings', [SettingsController::class, 'show']);
    Route::put('/settings', [SettingsController::class, 'update']);

    // ---------- Users / Roles / Permissions ----------
    Route::apiResource('users', UserController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/users/{user}/status', [UserController::class, 'setStatus']);

    Route::apiResource('roles', RoleController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/permissions', [PermissionController::class, 'index']);

    // ---------- Supplier Types / Suppliers ----------
    Route::apiResource('supplier-types', SupplierTypeController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/supplier-types/{supplierType}/status', [SupplierTypeController::class, 'setStatus']);

    Route::apiResource('suppliers', SupplierController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/suppliers/{supplier}/status', [SupplierController::class, 'setStatus']);
    Route::get('/suppliers/{supplier}/summary', [SupplierController::class, 'summary']);
    Route::get('/suppliers/{supplier}/ledger', [SupplierController::class, 'ledger']);
    Route::get('/suppliers/{supplier}/purchases', [SupplierController::class, 'purchases']);
    Route::get('/suppliers/{supplier}/payments', [SupplierController::class, 'payments']);
    Route::post('/supplier-payments', [SupplierController::class, 'storePayment']); // kept for the flatter /api/supplier-payments group the spec lists
    Route::post('/suppliers/{supplier}/payments', [SupplierController::class, 'storePayment']);

    // ---------- Units / Categories / Products ----------
    Route::apiResource('units', UnitController::class)->only(['index', 'store', 'update']);
    Route::patch('/units/{unit}/status', [UnitController::class, 'setStatus']);

    Route::apiResource('categories', CategoryController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/categories/{category}/status', [CategoryController::class, 'setStatus']);

    Route::get('/products/search', [ProductController::class, 'search']);
    Route::get('/products/barcode-lookup/{barcode}', [ProductController::class, 'lookupBarcode']);
    Route::get('/products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
    Route::get('/products/qr/{qr}', [ProductController::class, 'findByQr']);
    Route::get('/products/sku/{sku}', [ProductController::class, 'findBySku']);
    Route::apiResource('products', ProductController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/products/{product}/status', [ProductController::class, 'setStatus']);
    Route::get('/products/{product}/stock', [ProductController::class, 'stock']);
    Route::get('/products/{product}/price-history', [ProductController::class, 'priceHistory']);
    Route::post('/products/{product}/price-history', [ProductController::class, 'addPrice']);
    Route::get('/products/{product}/inventory-history', [ProductController::class, 'inventoryHistory']);

    // ---------- POS: same product data, counter-facing entry points ----------
    Route::name('pos.')->prefix('pos')->group(function () {
        Route::get('/products/search', [ProductController::class, 'search'])->name('search');
        Route::get('/products/barcode/{barcode}', [ProductController::class, 'findByBarcode'])->name('barcode');
        Route::get('/products/qr/{qr}', [ProductController::class, 'findByQr'])->name('qr');
    });

    // ---------- Purchasing ----------
    Route::apiResource('purchases', PurchaseController::class)->only(['index', 'show', 'store']);
    Route::post('/purchases/{purchase}/returns', [PurchaseReturnController::class, 'store']);
    Route::post('/purchase-returns', [PurchaseReturnController::class, 'store']); // spec-listed flat alias, same handler

    // ---------- Inventory ----------
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/inventory/movements', [InventoryController::class, 'movements']);
    Route::get('/inventory/low-stock', [InventoryController::class, 'lowStock']);
    Route::get('/inventory/expired', [InventoryController::class, 'expired']);
    Route::get('/inventory/expiring', [InventoryController::class, 'expiring']);
    Route::post('/inventory/adjustment', [InventoryController::class, 'adjust']);
    Route::get('/inventory/{product}', [InventoryController::class, 'forProduct']);

    // ---------- Sales / POS ----------
    Route::apiResource('sales', SaleController::class)->only(['index', 'show', 'store']);
    Route::post('/sales/{sale}/void', [SaleController::class, 'void']);
    Route::post('/sales/{sale}/mark-printed', [SaleController::class, 'markPrinted']);
    Route::post('/sales/{sale}/return', [SaleReturnController::class, 'store']);

    // ---------- Expenses ----------
    Route::apiResource('expense-categories', ExpenseCategoryController::class)->only(['index', 'store']);
    Route::apiResource('expenses', ExpenseController::class)->only(['index', 'show', 'store', 'update']);
    Route::patch('/expenses/{expense}/void', [ExpenseController::class, 'void']);

    // ---------- Reports ----------
    Route::prefix('reports')->group(function () {
        Route::get('/sales', [ReportController::class, 'sales']);
        Route::get('/product-sales', [ReportController::class, 'productSales']);
        Route::get('/sellers', [ReportController::class, 'sellers']);
        Route::get('/suppliers', [ReportController::class, 'suppliers']);
        Route::get('/purchases', [ReportController::class, 'purchases']);
        Route::get('/inventory', [ReportController::class, 'inventory']);
        Route::get('/expenses', [ReportController::class, 'expenses']);
        Route::get('/profit', [ReportController::class, 'profit']);
        Route::get('/low-stock', [ReportController::class, 'lowStock']);
        Route::get('/expiring', [ReportController::class, 'expiring']);
    });

    // ---------- Audit ----------
    Route::get('/audit-logs', [AuditLogController::class, 'index']);
});
