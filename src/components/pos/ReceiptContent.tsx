import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { formatAmount, formatCurrency, formatDateTime, formatQuantity } from '@/lib/format'

/**
 * The actual receipt body — rendered twice by ReceiptModal: once inside the on-screen preview
 * modal, and once (identical) in a print-only portal so `window.print()` never has to fight
 * the modal's own chrome, backdrop or scroll clipping.
 *
 * Layout follows a standard itemized-invoice format (Item / Qty / Price / Ext Price columns,
 * a Bill To line) rather than the earlier two-line-per-item style — requested to match a
 * reference receipt. Still sized for an 80mm thermal roll.
 */
export function ReceiptContent({ sale, settings }: { sale: Sale; settings: BusinessSettings | null }) {
  const storeName = settings?.storeName || 'Bakery POS'

  return (
    <div className="mx-auto max-w-xs font-mono text-[12.5px] text-ink">
      <div className="mb-1.5 text-center">
        <div className="text-[14px] font-bold">{storeName.toUpperCase()}</div>
        {settings?.address && <div className="text-[10.5px] text-ink-faint">{settings.address}</div>}
        {settings?.phone && <div className="text-[10.5px] text-ink-faint">Call {settings.phone}</div>}
        {settings?.taxId && <div className="text-[10.5px] text-ink-faint">Tax ID: {settings.taxId}</div>}
      </div>

      <div className="border-t border-dashed border-border-strong py-1.5">
        <div className="flex justify-between">
          <span>Invoice</span>
          <span>{sale.invoiceNo}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDateTime(sale.createdAt)}</span>
        </div>
      </div>

      <div className="border-t border-dashed border-border-strong py-1.5">
        <div className="flex justify-between">
          <span>Bill To</span>
          <span className="truncate">{sale.customerName || 'Walk-in Customer'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{sale.cashierName}</span>
        </div>
      </div>

      <table className="w-full border-t border-dashed border-border-strong py-1.5" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="border-b border-dashed border-border-strong text-[10.5px] font-semibold text-ink-faint">
            <th className="py-1 text-left font-semibold">Item</th>
            <th className="py-1 text-right font-semibold">Qty</th>
            <th className="py-1 text-right font-semibold">Price</th>
            <th className="py-1 text-right font-semibold">Ext Price</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.productId} className="align-top">
              <td className="py-1 pr-1 font-semibold">{item.name}</td>
              <td className="whitespace-nowrap py-1 text-right">{formatQuantity(item.qty, item.unit)}</td>
              <td className="whitespace-nowrap py-1 text-right">{formatAmount(item.unitPrice)}</td>
              <td className="whitespace-nowrap py-1 text-right font-semibold">
                {formatAmount(item.total)}
                {item.discount > 0 && <div className="text-[10px] font-normal text-ink-faint">-{formatAmount(item.discount)} disc</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-dashed border-border-strong py-1.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(sale.subtotal)}</span>
        </div>
        {sale.discount > 0 && (
          <div className="flex justify-between">
            <span>Discount</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span>Tax (0%)</span>
          <span>+ {formatCurrency(0)}</span>
        </div>
        <div className="flex justify-between text-[14px] font-bold">
          <span>RECEIPT TOTAL</span>
          <span>{formatCurrency(sale.grandTotal)}</span>
        </div>
      </div>

      {settings?.receiptFooter && <div className="pt-2 text-center text-[11px] text-ink-faint">{settings.receiptFooter}</div>}
    </div>
  )
}
