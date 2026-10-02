<?php

namespace App\Services\Products;

use App\Models\Product;

/**
 * Mints an in-house EAN-13 barcode for a product that has none — e.g. a house-made item with
 * no manufacturer barcode at all. Printed onto a blank sticker and stuck on the product, it
 * then scans exactly like any real barcode everywhere else in the app (POS, receiving, etc).
 *
 * Uses the "20"–"29" prefix range, which GS1 (the body that governs real barcode numbers)
 * permanently reserves for internal/in-store use — no product with a real manufacturer
 * barcode can ever start with "20", so a generated code can never collide with one.
 */
class BarcodeGeneratorService
{
    private const PREFIX = '20';

    public function generate(): string
    {
        $sequence = Product::where('barcode', 'like', self::PREFIX . '%')->count();

        do {
            $sequence++;
            // PREFIX (2 digits) + zero-padded sequence (10 digits) = 12 data digits, plus the
            // check digit below = 13 total (EAN-13's fixed length).
            $body = self::PREFIX . str_pad((string) $sequence, 10, '0', STR_PAD_LEFT);
            $barcode = $body . $this->checkDigit($body);
        } while (Product::where('barcode', $barcode)->exists());

        return $barcode;
    }

    /** Standard EAN-13/UPC mod-10 check digit: odd positions (1st, 3rd, …) weight 1, even weight 3. */
    private function checkDigit(string $twelveDigits): int
    {
        $sum = 0;
        foreach (str_split($twelveDigits) as $i => $digit) {
            $sum += (int) $digit * ($i % 2 === 0 ? 1 : 3);
        }

        return (10 - ($sum % 10)) % 10;
    }
}
