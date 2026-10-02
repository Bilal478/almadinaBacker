import ReceiptPrinterEncoder from '@point-of-sale/receipt-printer-encoder'
import type { TableColumn } from '@point-of-sale/receipt-printer-encoder'
import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { formatAmount, formatCurrency, formatDateTime, formatQty } from '@/lib/format'

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

  // 58mm paper is too narrow for four columns without shredding names, so it drops Price there.
  const showPrice = columns >= 40
  const itemCols = itemColumns(columns, showPrice)
  const row = (name: string, qty: string, price: string, amount: string) => (showPrice ? [name, qty, price, amount] : [name, qty, amount])
  encoder.bold(true)
  encoder.table(itemCols, [row('Item', 'Qty', 'Price', 'Ext Price')])
  encoder.bold(false)
  encoder.rule()
  // Every item gets the same shape: name + figures on the first line, and any overflow of a long
  // name continues underneath, indented, inside the Item column only. The indent is what marks
  // it as a continuation rather than the next product.
  const nameWidth = itemCols[0].width as number
  encoder.table(
    itemCols,
    sale.items.flatMap((item) => {
      const [first, ...rest] = wrapName(item.name, nameWidth)
      return [
        row(first, formatQty(item.qty), formatAmount(item.unitPrice), formatAmount(item.total)),
        ...rest.map((line) => row(line, '', '', '')),
      ]
    }),
  )
  encoder.rule()

  const totalCols = twoColumns(columns, 0.55)
  const totalRows: string[][] = [['Subtotal', formatCurrency(sale.subtotal)]]
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
 *  adjacent figures never touch); the item name takes the rest, so names wrap less often. */
function itemColumns(columns: number, showPrice: boolean): TableColumn[] {
  const qty = 3
  const price = 8
  const amount = 9
  const num = (width: number): TableColumn => ({ width, align: 'right', marginLeft: 1 })
  if (!showPrice) return [{ width: columns - qty - amount - 2 }, num(qty), num(amount)]
  return [{ width: columns - qty - price - amount - 3 }, num(qty), num(price), num(amount)]
}

const CONTINUATION_INDENT = '  '

/** Word-wraps a product name into the Item column: the first line uses the full width, later
 *  lines are indented. A single word too long for a line is hard-split. */
function wrapName(name: string, width: number): string[] {
  const lines: string[] = []
  let current = ''
  const limit = () => (lines.length === 0 ? width : width - CONTINUATION_INDENT.length)
  const push = () => {
    lines.push(lines.length === 0 ? current : CONTINUATION_INDENT + current)
    current = ''
  }
  for (let word of keepSizesTogether(name.trim().split(/\s+/))) {
    while (word.length > 0) {
      const room = limit() - (current ? current.length + 1 : 0)
      if (word.length <= room) {
        current = current ? `${current} ${word}` : word
        word = ''
      } else if (current) {
        push()
      } else {
        current = word.slice(0, room)
        word = word.slice(room)
        push()
      }
    }
  }
  if (current || lines.length === 0) push()
  return lines.map((line) => line.replace(/ /g, ' '))
}

/** Glues a number to the unit after it ("1 kg", "250 ml") with a non-breaking space so a
 *  wrap never leaves the unit dangling alone on the next line. */
function keepSizesTogether(words: string[]): string[] {
  const out: string[] = []
  for (const word of words) {
    const prev = out[out.length - 1]
    if (prev && /^\d+([.,]\d+)?$/.test(prev) && /^[a-z]{1,3}\.?$/i.test(word)) out[out.length - 1] = `${prev} ${word}`
    else out.push(word)
  }
  return out
}
