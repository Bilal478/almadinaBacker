import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { TopScrollContainer } from '@/components/common/TopScrollContainer'
import { formatCurrency, formatDate, formatDateTime, formatQuantity } from '@/lib/format'
import { HandCoins, Printer, Undo2 } from 'lucide-react'
import type { Sale } from '@/types'

export function SaleDetailModal({
  sale,
  onClose,
  onPrint,
  onReturn,
  canReturn,
  onReceivePayment,
}: {
  sale: Sale | null
  onClose: () => void
  onPrint?: (sale: Sale) => void
  onReturn?: (sale: Sale) => void
  canReturn?: boolean
  /** Shown only for a pay-later sale that still has a balance. */
  onReceivePayment?: (sale: Sale) => void
}) {
  if (!sale) return null

  const returnedAmount = sale.items.reduce((s, i) => s + i.returnedQty * i.unitPrice, 0)
  const netTotal = sale.grandTotal - returnedAmount
  const fullyReturned = sale.items.every((i) => i.qty - i.returnedQty <= 0)

  return (
    <Modal
      open={!!sale}
      title={`Sale ${sale.invoiceNo}`}
      subtitle={formatDateTime(sale.createdAt)}
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          {onReturn && canReturn && !fullyReturned && (
            <Button variant="secondary" onClick={() => onReturn(sale)}>
              <Undo2 size={14} /> Process Return
            </Button>
          )}
          {onReceivePayment && sale.isCredit && sale.balanceDue > 0 && sale.status === 'completed' && (
            <Button variant="success" onClick={() => onReceivePayment(sale)}>
              <HandCoins size={14} /> Receive Payment
            </Button>
          )}
          {onPrint && (
            <Button variant="primary" onClick={() => onPrint(sale)}>
              <Printer size={14} /> {sale.printedAt ? 'Reprint' : 'Print'} Receipt
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoTile label="Cashier" value={sale.cashierName} />
          <InfoTile label="Counter" value={sale.counter || '—'} />
          <InfoTile label="Customer" value={sale.customerPhone ? `${sale.customerName} · ${sale.customerPhone}` : sale.customerName || 'Walk-in'} />
          <InfoTile label="Status" value={<StatusBadge tone={sale.status === 'completed' ? 'success' : sale.status === 'voided' ? 'danger' : 'neutral'}>{sale.status}</StatusBadge>} />
        </div>

        <TopScrollContainer className="rounded border border-border">
          <table className="w-full min-w-max border-collapse text-sm">
            <thead className="bg-panel-alt">
              <tr>
                <th className="border-b border-border px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Product</th>
                <th className="border-b border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Qty</th>
                <th className="border-b border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Unit Price</th>
                <th className="border-b border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Discount</th>
                <th className="border-b border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Line Total</th>
                <th className="border-b border-border px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Returned</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-medium text-ink">{item.name}</div>
                    <div className="text-[11px] text-ink-faint">{item.code}</div>
                  </td>
                  <td className="px-3 py-2 text-right">{formatQuantity(item.qty, item.unit)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="px-3 py-2 text-right">{item.discount > 0 ? `-${formatCurrency(item.discount)}` : '—'}</td>
                  <td className="px-3 py-2 text-right font-semibold text-ink">{formatCurrency(item.total)}</td>
                  <td className="px-3 py-2 text-right">
                    {item.returnedQty > 0 ? (
                      <span className="text-danger">{formatQuantity(item.returnedQty, item.unit)}</span>
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TopScrollContainer>

        <div className="ml-auto max-w-xs space-y-1 text-[13px]">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between text-ink-soft">
            <span>Discount</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
          <div className="flex justify-between border-t border-dashed border-border-strong pt-1 font-bold text-ink">
            <span>Grand Total</span>
            <span>{formatCurrency(sale.grandTotal)}</span>
          </div>
          {returnedAmount > 0 && (
            <>
              <div className="flex justify-between text-danger">
                <span>Returned</span>
                <span>-{formatCurrency(returnedAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-dashed border-border-strong pt-1 text-[15px] font-bold text-ink">
                <span>Net Total</span>
                <span>{formatCurrency(netTotal)}</span>
              </div>
            </>
          )}
          {sale.isCredit ? (
            <>
              <div className="flex justify-between border-t border-border pt-1 text-ink-soft">
                <span>PAY LATER · Paid</span>
                <span>{formatCurrency(sale.payments.reduce((sum, p) => sum + p.amount, 0))}</span>
              </div>
              <div className={`flex justify-between font-bold ${sale.balanceDue > 0 ? 'text-warning' : 'text-success'}`}>
                <span>{sale.balanceDue > 0 ? 'Balance Due' : 'Paid in full'}</span>
                <span>{formatCurrency(sale.balanceDue)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between border-t border-border pt-1 text-ink-soft">
              <span>{sale.paymentMethod.replace('_', ' ').toUpperCase()}</span>
              <span>{formatCurrency(sale.amountReceived)}</span>
            </div>
          )}
          {sale.paymentMethod === 'cash' && (
            <div className="flex justify-between text-ink-soft">
              <span>Change</span>
              <span>{formatCurrency(sale.change)}</span>
            </div>
          )}
        </div>

        {sale.isCredit && sale.payments.length > 0 && (
          <div className="rounded border border-border">
            <div className="border-b border-border bg-panel-alt px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Payments received
            </div>
            <table className="w-full text-sm">
              <tbody>
                {sale.payments.map((p) => (
                  <tr key={p.id} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-1.5">{formatDate(p.date)}</td>
                    <td className="px-3 py-1.5 capitalize">{p.method.replace('_', ' ')}</td>
                    <td className="px-3 py-1.5 text-ink-faint">{[p.reference, p.receivedBy && `by ${p.receivedBy}`].filter(Boolean).join(' · ') || '—'}</td>
                    <td className="px-3 py-1.5 text-right font-semibold">{formatCurrency(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  )
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-border p-2.5">
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="text-[13px] font-bold text-ink">{value}</div>
    </div>
  )
}
