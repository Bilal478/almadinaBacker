import { forwardRef } from 'react'
import clsx from 'clsx'
import { PauseCircle, ShoppingBag, Users } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'
import { CartItemRow } from '@/components/pos/CartItemRow'
import { PaymentPanel } from '@/components/pos/PaymentPanel'
import { Button } from '@/components/common/Button'
import { formatCurrency } from '@/lib/format'
import type { PriceTier } from '@/types'

interface CartPanelProps {
  invoiceNo: string
  selectedProductId: string | null
  onSelectProduct: (id: string | null) => void
  onHold: () => void
  onCompleteSale: () => void
  completingSale?: boolean
  onOpenHeldSales: () => void
  paymentInputRef: React.RefObject<HTMLInputElement | null>
}

export const CartPanel = forwardRef<HTMLInputElement, CartPanelProps>(function CartPanel(
  { invoiceNo, selectedProductId, onSelectProduct, onHold, onCompleteSale, completingSale, onOpenHeldSales, paymentInputRef },
  customerRef,
) {
  const items = useCartStore((s) => s.items)
  const customerName = useCartStore((s) => s.customerName)
  const setCustomerName = useCartStore((s) => s.setCustomerName)
  const priceTier = useCartStore((s) => s.priceTier)
  const setPriceTier = useCartStore((s) => s.setPriceTier)
  const heldSales = useCartStore((s) => s.heldSales)
  const subtotal = useCartStore((s) => s.subtotal())
  const totalDiscount = useCartStore((s) => s.totalDiscount())
  const grandTotal = useCartStore((s) => s.grandTotal())

  return (
    <div className="flex h-full min-h-0 w-[380px] shrink-0 flex-col rounded border border-border bg-panel">
      <div className="space-y-2 border-b border-border p-2.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">New Sale</div>
            <div className="text-[13px] font-bold text-ink">{invoiceNo}</div>
          </div>
          <button
            onClick={onOpenHeldSales}
            className="flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-panel-alt"
          >
            <PauseCircle size={13} />
            Held ({heldSales.length})
          </button>
        </div>

        <div className="relative">
          <Users size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={customerRef}
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Customer name (optional) — F4"
            className="w-full rounded border border-border-strong bg-panel py-1.5 pl-7 pr-2 text-[12.5px] outline-none placeholder:text-ink-faint focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          {(['customer', 'retailer'] as PriceTier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => setPriceTier(tier)}
              className={clsx(
                'rounded border py-1 text-[11.5px] font-semibold capitalize transition-colors',
                priceTier === tier ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-strong text-ink-soft hover:bg-panel-alt',
              )}
            >
              {tier} price
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-border bg-panel-alt px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
        <span>Items ({items.length})</span>
        <span>Qty &middot; Discount &middot; Total</span>
      </div>

      <div className="min-h-[120px] flex-1 overflow-y-auto">
        {items.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-ink-faint">
            <ShoppingBag size={28} />
            <span className="text-sm">Cart is empty. Search or scan a product to begin.</span>
          </div>
        )}
        {items.map((item) => (
          <CartItemRow
            key={item.productId}
            item={item}
            selected={selectedProductId === item.productId}
            onSelect={() => onSelectProduct(item.productId)}
          />
        ))}
      </div>

      <div className="space-y-1 border-t border-border p-2.5 text-[12.5px]">
        <div className="flex justify-between text-ink-soft">
          <span>Subtotal</span>
          <span className="tabular-nums">{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex justify-between text-ink-soft">
          <span>Discount</span>
          <span className="tabular-nums">-{formatCurrency(totalDiscount)}</span>
        </div>
        <div className="flex justify-between border-t border-dashed border-border-strong pt-1 text-[16px] font-bold text-ink">
          <span>Grand Total</span>
          <span className="tabular-nums">{formatCurrency(grandTotal)}</span>
        </div>
      </div>

      <PaymentPanel ref={paymentInputRef} grandTotal={grandTotal} />

      <div className="grid grid-cols-[1fr_2fr] gap-2 p-2.5 pt-0">
        <Button variant="secondary" size="lg" onClick={onHold} disabled={items.length === 0 || completingSale}>
          Hold (F8)
        </Button>
        <Button
          variant="success"
          size="lg"
          className="text-[15px] font-bold"
          onClick={onCompleteSale}
          disabled={items.length === 0 || completingSale}
        >
          {completingSale ? 'PROCESSING…' : 'COMPLETE SALE (F9)'}
        </Button>
      </div>
    </div>
  )
})
