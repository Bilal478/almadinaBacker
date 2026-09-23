import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency, formatDateTime } from '@/lib/format'

export function HeldSalesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const heldSales = useCartStore((s) => s.heldSales)
  const resumeHeldSale = useCartStore((s) => s.resumeHeldSale)
  const discardHeldSale = useCartStore((s) => s.discardHeldSale)

  return (
    <Modal open={open} title="Held Sales" subtitle="Resume a parked transaction" onClose={onClose} width="md">
      <div className="space-y-2">
        {heldSales.length === 0 && <div className="py-8 text-center text-sm text-ink-faint">No sales are currently on hold.</div>}
        {heldSales.map((h) => {
          const total = h.items.reduce((s, i) => s + i.qty * i.unitPrice - i.discount, 0)
          return (
            <div key={h.id} className="flex items-center justify-between rounded border border-border px-3 py-2">
              <div>
                <div className="text-sm font-semibold text-ink">{h.customerName || 'Walk-in customer'}</div>
                <div className="text-xs text-ink-faint">
                  {h.items.length} item{h.items.length > 1 ? 's' : ''} &middot; {formatDateTime(h.heldAt)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-ink">{formatCurrency(total)}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    discardHeldSale(h.id)
                  }}
                >
                  Discard
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    resumeHeldSale(h.id)
                    onClose()
                  }}
                >
                  Resume
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
