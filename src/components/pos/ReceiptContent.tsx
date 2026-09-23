import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { formatCurrency, formatDateTime } from '@/lib/format'

/**
 * The actual receipt body — rendered twice by ReceiptModal: once inside the on-screen preview
 * modal, and once (identical) in a print-only portal so `window.print()` never has to fight
 * the modal's own chrome, backdrop or scroll clipping.
 */
export function ReceiptContent({ sale, settings }: { sale: Sale; settings: BusinessSettings | null }) {
  const storeName = settings?.storeName || 'Bakery POS'

  return (
    <div className="mx-auto max-w-xs font-mono text-[12.5px] text-ink">
      <div className="mb-2 text-center">
        <div className="text-[14px] font-bold">{storeName.toUpperCase()}</div>
        {settings?.address && <div className="text-[10.5px] text-ink-faint">{settings.address}</div>}
        {settings?.phone && <div className="text-[10.5px] text-ink-faint">Tel: {settings.phone}</div>}
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
        <div className="flex justify-between">
          <span>Counter</span>
          <span>{sale.counter}</span>
        </div>
        <div className="flex justify-between">
          <span>Cashier</span>
          <span>{sale.cashierName}</span>
        </div>
        {sale.customerName && (
          <div className="flex justify-between">
            <span>Customer</span>
            <span>{sale.customerName}</span>
          </div>
        )}
      </div>
      <div className="border-t border-dashed border-border-strong py-1.5">
        {sale.items.map((item) => (
          <div key={item.productId} className="mb-1">
            <div className="flex justify-between font-semibold">
              <span className="truncate">{item.name}</span>
              <span>{formatCurrency(item.total)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-ink-faint">
              <span>
                {item.qty} {item.unit} x {formatCurrency(item.unitPrice)}
              </span>
              {item.discount > 0 && <span>-{formatCurrency(item.discount)}</span>}
            </div>
          </div>
        ))}
      </div>
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
        <div className="flex justify-between text-[14px] font-bold">
          <span>TOTAL</span>
          <span>{formatCurrency(sale.grandTotal)}</span>
        </div>
      </div>
      <div className="border-t border-dashed border-border-strong py-1.5">
        <div className="flex justify-between">
          <span>{sale.paymentMethod.replace('_', ' ').toUpperCase()}</span>
          <span>{formatCurrency(sale.amountReceived)}</span>
        </div>
        {sale.paymentMethod === 'cash' && (
          <div className="flex justify-between">
            <span>Change</span>
            <span>{formatCurrency(sale.change)}</span>
          </div>
        )}
      </div>
      {settings?.receiptFooter && <div className="pt-2 text-center text-[11px] text-ink-faint">{settings.receiptFooter}</div>}
    </div>
  )
}
