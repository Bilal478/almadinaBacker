import JsBarcode from 'jsbarcode'
import type { Product } from '@/types'
import { barcodeFormat } from '@/lib/barcodeFormat'
import { formatCurrency } from '@/lib/format'

// This bakery's thermal label printer is loaded with 50mm x 30mm stickers — change these if a
// different label size is ever loaded, nothing else depends on the exact size.
export const LABEL_WIDTH_MM = 50
export const LABEL_HEIGHT_MM = 30
/** Blank border inside each sticker — kept inside the label itself rather than as an @page
 *  margin, since a page margin is exactly where the browser draws its date/URL/page-number
 *  header and footer. */
const LABEL_PADDING_MM = 2
/** Extra blank space above the product name — with only the standard padding the name sat
 *  right against the top edge of the sticker. */
const LABEL_TOP_PADDING_MM = 4
/** Max printed barcode width — kept well inside the 50mm sticker because the printer can't
 *  place an image exactly edge to edge (a full-width barcode came out clipped on both sides). */
const BARCODE_MAX_WIDTH_MM = 38
export const BARCODE_QUIET_ZONE = 12

export interface LabelJob {
  product: Product
  copies: number
}

/**
 * Prints barcode labels from a hidden, self-contained iframe instead of the app page. The app
 * page carries the receipt's own @page/print rules, which fought the label size (labels came out
 * receipt-shaped, with the browser's header/footer around them); the iframe's document has
 * nothing but the labels and one exact @page rule. Each copy is its own page, so the label
 * printer feeds one sticker per label, one after another.
 */
export function printLabels(jobs: LabelJob[], showPrice: boolean): void {
  const labels: string[] = []
  for (const { product, copies } of jobs) {
    if (!product.barcode) continue
    const label = renderLabel(product, showPrice)
    for (let i = 0; i < Math.floor(copies); i++) labels.push(label)
  }
  if (labels.length === 0) return

  const iframe = getPrintFrame()
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title>Labels</title><style>${LABEL_CSS}</style></head><body>${labels.join('')}</body></html>`)
  doc.close()

  const win = iframe.contentWindow!
  // Let the iframe lay out (fonts, SVGs) before opening the dialog.
  setTimeout(() => {
    win.focus()
    win.print()
  }, 100)
}

let printFrame: HTMLIFrameElement | null = null

/**
 * One hidden iframe, created once and reused for every label print — deliberately never
 * removed. Chrome can still be spooling the job to the printer after the dialog closes (and
 * after `afterprint` fires); removing the iframe then silently cancels the job, so the preview
 * looks fine but nothing ever reaches the printer.
 */
function getPrintFrame(): HTMLIFrameElement {
  if (printFrame && printFrame.isConnected) return printFrame
  printFrame = document.createElement('iframe')
  printFrame.setAttribute('aria-hidden', 'true')
  printFrame.setAttribute('tabindex', '-1')
  // Off-screen rather than display:none / 0×0 — some Chrome versions skip printing a frame
  // that has no layout box at all.
  Object.assign(printFrame.style, { position: 'fixed', left: '-10000px', top: '0', width: `${LABEL_WIDTH_MM}mm`, height: `${LABEL_HEIGHT_MM}mm`, border: '0' })
  document.body.appendChild(printFrame)
  return printFrame
}

function renderLabel(product: Product, showPrice: boolean): string {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, product.barcode, {
    format: barcodeFormat(product.barcode),
    // Same settings as the on-screen BarcodeLabelContent, so the print matches the preview.
    width: 1.6,
    height: 42,
    fontSize: 13,
    margin: 0,
    // White quiet zone on both sides (in bar units) — scanners need it, and EAN-13 draws its
    // first digit in the left one.
    marginLeft: BARCODE_QUIET_ZONE,
    marginRight: BARCODE_QUIET_ZONE,
    displayValue: true,
    // All bars the same height, all digits in one line below (no taller EAN guard bars, no
    // separate leading digit) — purely visual, scans exactly the same.
    flat: true,
  })
  // jsbarcode sets fixed px width/height and no viewBox — add one so CSS can scale it to the
  // sticker (see BarcodeLabelContent for the same fix on screen).
  const w = parseFloat(svg.getAttribute('width') ?? '')
  const h = parseFloat(svg.getAttribute('height') ?? '')
  if (w && h) svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
  svg.removeAttribute('width')
  svg.removeAttribute('height')

  const price = product.currentPrice?.customerPrice
  return `<div class="label"><div class="name">${escapeHtml(product.name)}</div>${svg.outerHTML}${
    showPrice && price != null ? `<div class="price">${escapeHtml(formatCurrency(price))}</div>` : ''
  }</div>`
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

const LABEL_CSS = `
@page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 0; }
html, body { margin: 0; padding: 0; }
* { color: #000; box-sizing: border-box; }
.label {
  width: ${LABEL_WIDTH_MM}mm;
  /* A hair under the sticker height so rounding never spills onto a second, blank sticker. */
  height: ${LABEL_HEIGHT_MM - 0.3}mm;
  padding: ${LABEL_TOP_PADDING_MM}mm ${LABEL_PADDING_MM}mm ${LABEL_PADDING_MM}mm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  overflow: hidden;
  break-after: page;
  page-break-after: always;
  font-family: "Segoe UI", "Inter", system-ui, -apple-system, Roboto, Arial, sans-serif;
}
.label:last-child { break-after: auto; page-break-after: auto; }
.name { width: 100%; text-align: center; font-size: 11px; font-weight: 600; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.label svg { width: 100%; max-width: ${BARCODE_MAX_WIDTH_MM}mm; max-height: ${LABEL_HEIGHT_MM - LABEL_TOP_PADDING_MM - LABEL_PADDING_MM - 8}mm; }
.price { font-size: 12px; font-weight: 700; line-height: 1.25; }
`
