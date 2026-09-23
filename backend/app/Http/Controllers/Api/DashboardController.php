<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Dashboard\DashboardService;

class DashboardController extends Controller
{
    public function summary(DashboardService $service)
    {
        $this->authorize('view_pos');
        return $this->success($service->summary());
    }
}
