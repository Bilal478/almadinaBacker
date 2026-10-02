<?php

namespace App\Http\Controllers;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Resources\Json\ResourceCollection;

abstract class Controller
{
    use AuthorizesRequests;

    protected function success(mixed $data = null, ?string $message = null, int $status = 200): \Illuminate\Http\JsonResponse
    {
        return response()->json(array_filter([
            'success' => true,
            'message' => $message,
            'data' => $this->serializePaginated($data),
        ], fn ($v, $k) => $k !== 'message' || $v !== null, ARRAY_FILTER_USE_BOTH), $status);
    }

    /**
     * A paginator (or a Resource::collection(...) wrapping one) only gets its
     * {data, current_page, last_page, total, ...} envelope from Laravel's own
     * PaginatedResourceResponse — which only ever runs when the paginator/collection is
     * returned directly as the whole HTTP response. Every endpoint here instead nests its
     * payload inside this success() envelope, so that automatic behavior never fires: plain
     * json_encode() on a ResourceCollection just serializes the current page's rows with the
     * pagination metadata silently dropped. The frontend's getAll() helper relies on that
     * metadata to know a second page exists at all — without it, any list past its `per_page`
     * default (e.g. 500 products) is invisible beyond the first page, with no error to say so.
     */
    private function serializePaginated(mixed $data): mixed
    {
        $paginator = match (true) {
            $data instanceof LengthAwarePaginator => $data,
            $data instanceof ResourceCollection && $data->resource instanceof LengthAwarePaginator => $data->resource,
            default => null,
        };

        if (!$paginator) {
            return $data;
        }

        return [
            'data' => $data instanceof ResourceCollection ? $data->jsonSerialize() : $paginator->items(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
        ];
    }
}
