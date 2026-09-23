<?php

namespace App\Services\Products;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Best-effort external lookup for a scanned barcode this bakery has never seen before — fills
 * in the product name/brand from a public product database so staff don't have to hand-type
 * it from the packaging (and risk spelling it differently each time). Only ever useful for
 * commercially barcoded goods (a bottled drink, a branded snack) — a house-made item like a
 * loaf of bread was never registered with a real barcode authority, so it will never be found
 * here, and that's expected, not a bug: staff still name those once, the normal way.
 *
 * Uses Open Food Facts (https://world.openfoodfacts.org) — free, no API key, no rate-limit
 * paperwork, good coverage for the packaged food/drink items most likely to walk into a bakery
 * mart pre-barcoded. A miss or network failure here must never block adding the product
 * manually, so every failure mode just returns "not found".
 */
class BarcodeLookupService
{
    public function lookup(string $barcode): ?array
    {
        try {
            $response = Http::timeout(4)
                ->get("https://world.openfoodfacts.org/api/v2/product/{$barcode}.json", [
                    'fields' => 'product_name,brands,quantity,image_front_small_url',
                ]);
        } catch (\Throwable $e) {
            Log::info('Barcode lookup failed', ['barcode' => $barcode, 'error' => $e->getMessage()]);
            return null;
        }

        if (!$response->successful()) {
            return null;
        }

        $body = $response->json();
        if (($body['status'] ?? 0) !== 1 || empty($body['product']['product_name'])) {
            return null;
        }

        $product = $body['product'];
        $name = trim($product['product_name']);
        $brand = trim($product['brands'] ?? '');

        return [
            // "Brand Product Name" reads naturally and is what's printed on the packaging —
            // staff can still edit it before saving, this just saves typing it from scratch.
            'suggested_name' => $brand !== '' ? "{$brand} {$name}" : $name,
            'brand' => $brand !== '' ? $brand : null,
            'quantity' => $product['quantity'] ?? null,
            'image_url' => $product['image_front_small_url'] ?? null,
        ];
    }
}
