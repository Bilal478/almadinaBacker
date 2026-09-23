import clsx from 'clsx'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency } from '@/lib/format'

interface CartItemRowProps {
  item: CartItem
  selected: boolean
  onSelect: () => void
}

export function CartItemRow({ item, selected, onSelect }: CartItemRowProps) {
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const setLineDiscount = useCartStore((s) => s.setLineDiscount)

  const lineTotal = item.qty * item.unitPrice - item.discount

  return (
    <div
      onClick={onSelect}
      className={clsx('cursor-pointer border-b border-border px-2.5 py-2 text-[12.5px]', selected ? 'bg-brand-50' : 'hover:bg-panel-alt')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold text-ink">{item.name}</div>
          <div className="text-[10.5px] text-ink-faint">
            {item.code} &middot; {formatCurrency(item.unitPrice)} / {item.unit}
          </div>
        </div>
        <div className="shrink-0 text-right font-bold text-ink">{formatCurrency(lineTotal)}</div>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation()
              decQty(item.productId)
            }}
            className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt"
          >
            <Minus size={12} />
          </button>
          <span className="w-7 text-center font-semibold tabular-nums text-ink">{item.qty}</span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              incQty(item.productId)
            }}
            className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt"
          >
            <Plus size={12} />
          </button>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-ink-faint">
          <span>Disc.</span>
          <input
            type="number"
            min={0}
            value={item.discount || ''}
            placeholder="0"
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setLineDiscount(item.productId, Number(e.target.value) || 0)}
            className="w-16 rounded border border-border-strong bg-panel px-1.5 py-0.5 text-right text-[12px] tabular-nums text-ink outline-none focus:border-brand-500"
          />
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation()
            removeItem(item.productId)
          }}
          className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-danger-bg hover:text-danger"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}
