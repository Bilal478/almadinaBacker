import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { TableColumn } from '@point-of-sale/receipt-printer-encoder'
import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { formatAmount, formatCurrency, formatDateTime, formatQty } from '@/lib/format'

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
  encoder.align('left').newline()

  const labelCols = twoColumns(columns, 0.35)
  encoder.table(labelCols, [
    ['Invoice', sale.invoiceNo],
    ['Date', formatDateTime(sale.createdAt)],
  ])
  encoder.newline()
  encoder.table(labelCols, [
    ['Bill To', sale.customerName || 'Walk-in Customer'],
    ['Cashier', sale.cashierName],
  ])
  encoder.newline()

  const itemCols = itemColumns(columns)
  encoder.table(itemCols, [
    ['Item', 'Qty', 'Price', 'Ext Price'],
    { rule: true },
    ...sale.items.map((item) => [item.name, formatQty(item.qty), formatAmount(item.unitPrice), formatAmount(item.total)]),
  ])
  encoder.newline()

  const totalCols = twoColumns(columns, 0.6)
  const totalRows: (string[] | { rule: true })[] = [['Subtotal', formatCurrency(sale.subtotal)]]
  if (sale.discount > 0) totalRows.push(['Discount', `-${formatCurrency(sale.discount)}`])
  totalRows.push(['Tax (0%)', `+ ${formatCurrency(0)}`])
  encoder.table(totalCols, totalRows)
  encoder.bold(true)
  encoder.table(totalCols, [['RECEIPT TOTAL', formatCurrency(sale.grandTotal)]])
  encoder.bold(false)

  if (settings?.receiptFooter) {
    encoder.newline().align('center').line(settings.receiptFooter)
  }

  encoder.newline(3).cut()

  return encoder.encode()
}

function twoColumns(columns: number, firstShare: number): TableColumn[] {
  const first = Math.floor(columns * firstShare)
  return [{ width: first }, { width: columns - first, align: 'right' }]
}

function itemColumns(columns: number): TableColumn[] {
  const item = Math.floor(columns * 0.38)
  const qty = Math.floor(columns * 0.14)
  const price = Math.floor(columns * 0.22)
  return [{ width: item }, { width: qty, align: 'right' }, { width: price, align: 'right' }, { width: columns - item - qty - price, align: 'right' }]
}
