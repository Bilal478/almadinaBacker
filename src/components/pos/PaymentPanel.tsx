import { forwardRef } from 'react'
import clsx from 'clsx'
import { Banknote, CreditCard, MoreHorizontal } from 'lucide-react'
import type { PaymentMethod } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/format'

const METHODS: { key: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
]

export const PaymentPanel = forwardRef<HTMLInputElement, { grandTotal: number }>(function PaymentPanel({ grandTotal }, ref) {
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const amountReceived = useCartStore((s) => s.amountReceived)
  const setAmountReceived = useCartStore((s) => s.setAmountReceived)

  const received = Number(amountReceived) || 0
  const change = received - grandTotal

  return (
    <div className="space-y-2 border-t border-border p-2.5">
      <div className="grid grid-cols-3 gap-1.5">
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => setPaymentMethod(m.key)}
            className={clsx(
              'flex flex-col items-center gap-0.5 rounded border py-1.5 text-[11.5px] font-medium transition-colors',
              paymentMethod === m.key ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-border-strong text-ink-soft hover:bg-panel-alt',
            )}
          >
            <m.icon size={15} />
            {m.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 items-center gap-2">
        <label className="text-[12px] font-medium text-ink-soft">Amount Received</label>
        <input
          ref={ref}
          type="number"
          min={0}
          value={amountReceived}
          onChange={(e) => setAmountReceived(e.target.value)}
          placeholder={grandTotal.toFixed(0)}
          className="rounded border border-border-strong bg-panel px-2 py-1 text-right text-sm font-semibold tabular-nums outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div className="flex items-center justify-between rounded bg-panel-alt px-2 py-1.5">
        <span className="text-[12px] font-medium text-ink-soft">Change</span>
        <span className={clsx('text-sm font-bold tabular-nums', change < 0 ? 'text-danger' : 'text-success')}>
          {formatCurrency(Math.max(0, change))}
        </span>
      </div>
    </div>
  )
})
