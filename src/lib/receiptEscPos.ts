import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { TableColumn } from '@point-of-sale/receipt-printer-encoder'
import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { formatAmount, formatCurrency, formatDateTime, formatNumber, formatQty } from '@/lib/format'

/**
 * Lines fed after the last printed line before cutting. Thermal printers cut several lines
 * below the print head, so too little feed slices through the footer (the bottom half then
 * shows up at the top of the next receipt).
 */
const FEED_BEFORE_CUT = 6

/**
 * Builds the exact same receipt as ReceiptContent.tsx, but as real ESC/POS text/table commands
 * for direct (QZ Tray) printing instead of an HTML page. The printer draws these with its own
 * built-in font at native resolution — solid black, no antialiasing for it to dither into gray,
 * which is the whole reason this path exists alongside the browser-print fallback.
 *
 * One deliberate simplification versus the HTML version: a per-item discount doesn't get its
 * own annotation line here (that would need the table library's untested cell-spanning edge
 * cases) — the order-level Discount total in the summary block already carries that figure.
 */
export function buildReceiptEscPos(sale: Sale, settings: BusinessSettings | null, columns: number): Uint8Array {
  const storeName = (settings?.storeName || 'Bakery POS').toUpperCase()
  const encoder = new ReceiptPrinterEncoder({ language: 'esc-pos', columns })

  encoder.initialize().align('center').bold(true).line(storeName).bold(false)
  if (settings?.address) encoder.line(settings.address)
  if (settings?.phone) encoder.line(`Call ${settings.phone}`)
  if (settings?.taxId) encoder.line(`Tax ID: ${settings.taxId}`)
  encoder.align('left').rule()

  // Short fixed label column with the value right after it, one line each — keeps the block
  // compact instead of pushing values to the far right edge.
  const infoCols: TableColumn[] = [{ width: 10 }, { width: columns - 10 }]
  encoder.table(infoCols, [
    ['Invoice:', sale.invoiceNo],
    ['Date:', formatDateTime(sale.createdAt)],
    ['Bill To:', sale.customerName || 'Walk-in Customer'],
    ['Cashier:', sale.cashierName],
  ])
  encoder.rule()

  const itemCols = itemColumns(columns)
  encoder.bold(true)
  encoder.table(itemCols, [['Item', 'Qty', 'Price', 'Ext Price']])
  encoder.bold(false)
  encoder.rule()
  // Every item gets the same shape regardless of name length: the name on its own full-width
  // line, its figures on the line below.
  sale.items.forEach((item) => {
    encoder.line(item.name)
    encoder.table(itemCols, [['', formatQty(item.qty), formatAmount(item.unitPrice), formatAmount(item.total)]])
  })
  encoder.rule()

  const totalCols = twoColumns(columns, 0.55)
  // Number of different products on the bill (lines), not the sum of their quantities.
  const totalRows: string[][] = [['Total Items', formatNumber(sale.items.length)], ['Subtotal', formatCurrency(sale.subtotal)]]
  if (sale.discount > 0) totalRows.push(['Discount', `-${formatCurrency(sale.discount)}`])
  totalRows.push(['Tax (0%)', `+ ${formatCurrency(0)}`])
  encoder.table(totalCols, totalRows)
  encoder.rule({ style: 'double' })
  encoder.bold(true)
  encoder.table(totalCols, [['RECEIPT TOTAL', formatCurrency(sale.grandTotal)]])
  encoder.bold(false)
  encoder.rule({ style: 'double' })

  if (settings?.receiptFooter) {
    encoder.newline().align('center').line(settings.receiptFooter)
  }

  encoder.newline(FEED_BEFORE_CUT).cut()

  return encoder.encode()
}

function twoColumns(columns: number, firstShare: number): TableColumn[] {
  const first = Math.floor(columns * firstShare)
  return [{ width: first }, { width: columns - first, align: 'right' }]
}

/** Numeric columns get fixed widths that fit their values (plus a 1-char gap on the left so
 *  adjacent figures never touch); the empty first column under "Item" takes the rest. */
function itemColumns(columns: number): TableColumn[] {
  const qty = columns < 40 ? 4 : 5
  const price = columns < 40 ? 8 : 10
  const amount = columns < 40 ? 9 : 11
  const num = (width: number): TableColumn => ({ width, align: 'right', marginLeft: 1 })
  return [{ width: columns - qty - price - amount - 3 }, num(qty), num(price), num(amount)]
}
