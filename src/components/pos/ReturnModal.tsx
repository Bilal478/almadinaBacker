import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useSalesStore } from '@/store/salesStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { Sale } from '@/types'

export function ReturnModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const createReturn = useSalesStore((s) => s.createReturn)
  const pushToast = useUiStore((s) => s.pushToast)

  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reason, setReason] = useState('')
  const [restock, setRestock] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setQuantities({})
    setReason('')
    setRestock(true)
  }, [sale?.id])

  const lines = (sale?.items ?? []).map((item) => {
    const returnable = Math.max(0, item.qty - item.returnedQty)
    const qty = Math.min(returnable, Number(quantities[item.id]) || 0)
    return { item, returnable, qty }
  })
  const totalRefund = lines.reduce((s, l) => s + l.qty * l.item.unitPrice, 0)
  const anyReturnable = lines.some((l) => l.returnable > 0)

  function setQty(itemId: string, value: string) {
    setQuantities((q) => ({ ...q, [itemId]: value }))
  }

  function returnEverything() {
    const next: Record<string, string> = {}
    lines.forEach((l) => {
      if (l.returnable > 0) next[l.item.id] = String(l.returnable)
    })
    setQuantities(next)
  }

  async function handleSubmit() {
    if (submitting || !sale) return
    const toReturn = lines.filter((l) => l.qty > 0)
    if (toReturn.length === 0) {
      pushToast('error', 'Enter a quantity to return for at least one item.')
      return
    }
    setSubmitting(true)
    try {
      const result = await createReturn(sale.id, {
        items: toReturn.map((l) => ({ saleItemId: l.item.id, quantity: l.qty })),
        reason: reason.trim() || undefined,
        restock,
      })
      pushToast('success', `Return recorded — refund ${formatCurrency(result.totalRefund)}.`)
      onClose()
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to record return.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={!!sale}
      title="Process Return"
      subtitle={sale?.invoiceNo}
      onClose={onClose}
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || !anyReturnable}>
            {submitting ? 'Processing…' : `Record Return${totalRefund > 0 ? ` — ${formatCurrency(totalRefund)}` : ''}`}
          </Button>
        </>
      }
    >
      {sale && (
        <div className="space-y-3">
          {!anyReturnable && (
            <p className="rounded bg-panel-alt px-2.5 py-2 text-sm text-ink-faint">
              Every item on this sale has already been fully returned.
            </p>
          )}

          {anyReturnable && (
            <>
              <div className="divide-y divide-border rounded border border-border">
                {lines.map(({ item, returnable }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-ink">{item.name}</div>
                      <div className="text-[11px] text-ink-faint">
                        Sold {item.qty} {item.unit}
                        {item.returnedQty > 0 && ` · already returned ${item.returnedQty}`}
                        {' · '}
                        {formatCurrency(item.unitPrice)} each
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={returnable}
                      step="any"
                      value={quantities[item.id] ?? ''}
                      onChange={(e) => setQty(item.id, e.target.value)}
                      disabled={returnable <= 0}
                      placeholder="0"
                      className="w-20 shrink-0 rounded border border-border-strong bg-panel px-2 py-1 text-right text-sm outline-none focus:border-brand-500 disabled:bg-panel-alt disabled:text-ink-faint"
                    />
                  </div>
                ))}
              </div>

              <button type="button" onClick={returnEverything} className="text-[11px] font-medium text-brand-700 hover:underline">
                Return everything remaining
              </button>

              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Reason (optional)</label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Customer changed mind, item damaged…"
                  className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                Add returned items back into inventory
              </label>

              <div className="flex justify-between border-t border-dashed border-border-strong pt-2 text-[15px] font-bold text-ink">
                <span>Refund Total</span>
                <span>{formatCurrency(totalRefund)}</span>
              </div>
            </>
          )}
        </div>
      )}
    </Modal>
  )
}
