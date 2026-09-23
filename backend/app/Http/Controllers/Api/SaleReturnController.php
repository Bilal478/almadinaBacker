<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreSaleReturnRequest;
use App\Models\Sale;
use App\Services\Sales\SaleReturnService;

class SaleReturnController extends Controller
{
    public function store(StoreSaleReturnRequest $request, Sale $sale, SaleReturnService $service)
    {
        $this->authorize('void_sale');
        $return = $service->create($sale, $request->validated());
        return $this->success($return, 'Return recorded', 201);
    }
}
