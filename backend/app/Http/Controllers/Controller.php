<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

abstract class Controller
{
    use AuthorizesRequests;

    protected function success(mixed $data = null, ?string $message = null, int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json(array_filter([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], fn ($v, $k) => $k !== 'message' || $v !== null, ARRAY_FILTER_USE_BOTH), $status);
    }
}
