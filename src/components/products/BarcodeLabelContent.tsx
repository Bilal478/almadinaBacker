import { useEffect, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { Product } from '@/types'
import { barcodeFormat } from '@/lib/barcodeFormat'
import { formatCurrency } from '@/lib/format'
import { BARCODE_QUIET_ZONE } from '@/lib/printLabels'

/**
 * On-screen label preview. The printed labels are built separately by printLabels() (in its own
 * iframe) — keep the two looking the same if either changes.
 */
export function BarcodeLabelContent({ product, showPrice = false }: { product: Product; showPrice?: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current || !product.barcode) return
    JsBarcode(svgRef.current, product.barcode, {
      format: barcodeFormat(product.barcode),
      width: 1.6,
      height: 42,
      fontSize: 13,
      margin: 0,
      marginLeft: BARCODE_QUIET_ZONE,
      marginRight: BARCODE_QUIET_ZONE,
      displayValue: true,
      // Same as printLabels: equal-height bars, digits in one line below.
      flat: true,
    })
    // jsbarcode sets fixed width/height attributes (as "174px", "57px" — with a unit suffix)
    // and no viewBox, so the SVG can't be resized by CSS without this — a viewBox is what lets
    // the print/preview width below scale the whole barcode (bars + text) proportionally
    // instead of just cropping it. parseFloat strips the unit; a bare numeric viewBox is
    // required or the browser silently discards it and falls back to a 24x24 default.
    const svg = svgRef.current
    const w = parseFloat(svg.getAttribute('width') ?? '')
    const h = parseFloat(svg.getAttribute('height') ?? '')
    if (w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  }, [product.barcode])

  const price = product.currentPrice?.customerPrice

  return (
    <div className="flex flex-col items-center gap-0.5 text-center">
      <div className="w-full truncate text-[11px] font-semibold leading-tight text-ink">{product.name}</div>
      {product.barcode ? (
        <svg ref={svgRef} className="w-full" style={{ maxWidth: '38mm' }} />
      ) : (
        <div className="py-4 text-[11px] text-ink-faint">No barcode to print yet.</div>
      )}
      {showPrice && price != null && <div className="text-[12px] font-bold leading-tight text-ink">{formatCurrency(price)}</div>}
    </div>
  )
}
