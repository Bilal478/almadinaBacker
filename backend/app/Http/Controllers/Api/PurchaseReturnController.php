<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePurchaseReturnRequest;
use App\Models\Purchase;
use App\Services\Purchases\PurchaseReturnService;

class PurchaseReturnController extends Controller
{
    public function store(StorePurchaseReturnRequest $request, Purchase $purchase, PurchaseReturnService $service)
    {
        $this->authorize('manage_purchases');
        $return = $service->create($purchase, $request->validated());
        return $this->success($return, 'Purchase return recorded', 201);
    }
}
