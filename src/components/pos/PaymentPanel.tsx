import { forwardRef } from 'react'
import clsx from 'clsx'
import { Banknote, Clock, CreditCard, MoreHorizontal, Phone } from 'lucide-react'
import type { SalePaymentMethod } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/format'

const METHODS: { key: SalePaymentMethod; label: string; icon: typeof Banknote }[] = [
  { key: 'cash', label: 'Cash', icon: Banknote },
  { key: 'card', label: 'Card', icon: CreditCard },
  { key: 'other', label: 'Other', icon: MoreHorizontal },
  { key: 'credit', label: 'Pay Later', icon: Clock },
]

export const PaymentPanel = forwardRef<HTMLInputElement, { grandTotal: number }>(function PaymentPanel({ grandTotal }, ref) {
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const setPaymentMethod = useCartStore((s) => s.setPaymentMethod)
  const amountReceived = useCartStore((s) => s.amountReceived)
  const setAmountReceived = useCartStore((s) => s.setAmountReceived)
  const customerPhone = useCartStore((s) => s.customerPhone)
  const setCustomerPhone = useCartStore((s) => s.setCustomerPhone)

  const received = Number(amountReceived) || 0
  const change = received - grandTotal
  const isCredit = paymentMethod === 'credit'

  return (
    <div className="space-y-2 border-t border-border p-2.5">
      <div className="grid grid-cols-4 gap-1.5">
        {METHODS.map((m) => (
          <button
            key={m.key}
            onClick={() => setPaymentMethod(m.key)}
            className={clsx(
              'flex flex-col items-center gap-0.5 rounded border py-1.5 text-[11.5px] font-medium transition-colors',
              paymentMethod === m.key
                ? m.key === 'credit'
                  ? 'border-warning bg-warning-bg text-warning'
                  : 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-border-strong text-ink-soft hover:bg-panel-alt',
            )}
          >
            <m.icon size={15} />
            {m.label}
          </button>
        ))}
      </div>

      {isCredit ? (
        <>
          <div className="relative">
            <Phone size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              ref={ref}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="Customer phone (optional)"
              className="w-full rounded border border-border-strong bg-panel py-1 pl-7 pr-2 text-[12.5px] outline-none placeholder:text-ink-faint focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div className="flex items-center justify-between rounded border border-warning/30 bg-warning-bg px-2 py-1.5">
            <span className="text-[12px] font-medium text-warning">Balance Due (unpaid)</span>
            <span className="text-sm font-bold tabular-nums text-warning">{formatCurrency(grandTotal)}</span>
          </div>
        </>
      ) : (
        <>
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
        </>
      )}
    </div>
  )
})
