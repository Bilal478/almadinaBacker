import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { inputClass, selectClass } from '@/components/common/FilterBar'
import { useSalesStore } from '@/store/salesStore'
import { useUiStore } from '@/store/uiStore'
import { apiErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PaymentMethod, Sale } from '@/types'

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: 'cash', label: 'Cash' },
  { key: 'card', label: 'Card' },
  { key: 'bank_transfer', label: 'Bank Transfer' },
  { key: 'other', label: 'Other' },
]

/** Records money received against a pay-later invoice — the full balance by default, or part of it. */
export function ReceivePaymentModal({ sale, onClose, onReceived }: { sale: Sale | null; onClose: () => void; onReceived?: (sale: Sale) => void }) {
  const receivePayment = useSalesStore((s) => s.receivePayment)
  const pushToast = useUiStore((s) => s.pushToast)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [reference, setReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sale) return
    setAmount(String(sale.balanceDue))
    setMethod('cash')
    setReference('')
  }, [sale])

  if (!sale) return null

  const value = Number(amount) || 0
  const remaining = Math.max(0, sale.balanceDue - value)

  async function handleSubmit() {
    if (!sale || submitting) return
    if (value <= 0) {
      pushToast('error', 'Enter the amount received.')
      return
    }
    if (value > sale.balanceDue + 0.001) {
      pushToast('error', `Amount is more than the balance due (${formatCurrency(sale.balanceDue)}).`)
      return
    }
    setSubmitting(true)
    try {
      const updated = await receivePayment(sale.id, { amount: value, method, reference: reference.trim() })
      pushToast(
        'success',
        updated.balanceDue > 0
          ? `Received ${formatCurrency(value)} — ${formatCurrency(updated.balanceDue)} still due on ${updated.invoiceNo}.`
          : `${updated.invoiceNo} is now fully paid.`,
      )
      onReceived?.(updated)
      onClose()
    } catch (e) {
      pushToast('error', apiErrorMessage(e, 'Failed to record payment.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!sale}
      title="Receive Payment"
      subtitle={`${sale.invoiceNo} · ${sale.customerName ?? ''} · ${formatDate(sale.date)}`}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : value >= sale.balanceDue ? 'Mark as Paid' : 'Record Partial Payment'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded border border-warning/30 bg-warning-bg px-3 py-2">
          <span className="text-[12px] font-medium text-warning">Balance Due</span>
          <span className="text-base font-bold tabular-nums text-warning">{formatCurrency(sale.balanceDue)}</span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Amount Received</label>
          <input
            type="number"
            min={0}
            max={sale.balanceDue}
            value={amount}
            autoFocus
            onFocus={(e) => e.target.select()}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className={`${inputClass} text-right font-semibold tabular-nums`}
          />
          {value > 0 && value < sale.balanceDue && (
            <span className="text-[11.5px] text-ink-faint">{formatCurrency(remaining)} will still be due after this payment.</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Method</label>
            <select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)} className={selectClass}>
              {METHODS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Reference (optional)</label>
            <input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Txn / note" className={inputClass} />
          </div>
        </div>
      </div>
    </Modal>
  )
}
