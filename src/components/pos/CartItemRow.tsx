import { useState } from 'react'
import clsx from 'clsx'
import { Minus, Plus, Trash2 } from 'lucide-react'
import type { CartItem } from '@/types'
import { useCartStore } from '@/store/cartStore'
import { useUnitStore } from '@/store/unitStore'
import { formatCurrency, formatQuantity } from '@/lib/format'

interface CartItemRowProps {
  item: CartItem
  selected: boolean
  onSelect: () => void
}

export function CartItemRow({ item, selected, onSelect }: CartItemRowProps) {
  const incQty = useCartStore((s) => s.incQty)
  const decQty = useCartStore((s) => s.decQty)
  const setQty = useCartStore((s) => s.setQty)
  const removeItem = useCartStore((s) => s.removeItem)
  const setLineDiscount = useCartStore((s) => s.setLineDiscount)
  const decimalAllowed = useUnitStore((s) => s.getUnit(item.unit)?.decimalAllowed ?? false)

  // Lets the cashier type "0." without it snapping back to "0" mid-entry — only commits
  // to the cart (and re-syncs from it) once they're done editing.
  const [draft, setDraft] = useState<string | null>(null)
  const qtyText = draft ?? String(item.qty)

  function commitQty(text: string) {
    const parsed = Number(text)
    if (!text.trim() || Number.isNaN(parsed) || parsed <= 0) {
      setDraft(null)
      return
    }
    setQty(item.productId, decimalAllowed ? parsed : Math.round(parsed))
    setDraft(null)
  }

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
          <input
            type="number"
            min={0}
            step={decimalAllowed ? '0.01' : '1'}
            value={qtyText}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={(e) => commitQty(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
            }}
            className="w-12 rounded border border-border-strong bg-panel px-1 py-0.5 text-center text-[12px] font-semibold tabular-nums text-ink outline-none focus:border-brand-500"
          />
          <button
            onClick={(e) => {
              e.stopPropagation()
              incQty(item.productId)
            }}
            className="flex h-6 w-6 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt"
          >
            <Plus size={12} />
          </button>
          {item.qty > 0 && item.qty < 1 && (
            <span className="text-[10px] text-ink-faint">({formatQuantity(item.qty, item.unit)})</span>
          )}
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
