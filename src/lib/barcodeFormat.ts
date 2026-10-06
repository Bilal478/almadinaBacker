/**
 * Picks the JsBarcode symbology for a stored barcode. In-house codes (BarcodeGeneratorService)
 * are always EAN-13, but manufacturer barcodes entered by hand can be EAN-8 or UPC-A too — and
 * JsBarcode throws on a value that doesn't fit the format it's told to draw. Anything that isn't
 * a valid EAN/UPC (wrong length, bad check digit, letters) falls back to Code 128, which every
 * scanner reads and which accepts any text.
 */
export function barcodeFormat(code: string): 'EAN13' | 'EAN8' | 'UPC' | 'CODE128' {
  if (/^\d+$/.test(code) && hasValidCheckDigit(code)) {
    if (code.length === 13) return 'EAN13'
    if (code.length === 8) return 'EAN8'
    if (code.length === 12) return 'UPC'
  }
  return 'CODE128'
}

/** GS1 mod-10: weights 3,1,3,1… applied from the digit just left of the check digit. */
function hasValidCheckDigit(code: string): boolean {
  const digits = code.split('').map(Number)
  const check = digits.pop()!
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0)
  return (10 - (sum % 10)) % 10 === check
}
