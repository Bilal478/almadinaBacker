import clsx from 'clsx'
import { useShallow } from 'zustand/react/shallow'
import type { Product } from '@/types'
import { useProductStore } from '@/store/productStore'
import { useCartStore } from '@/store/cartStore'
import { formatCurrency, formatNumber } from '@/lib/format'

export function ProductResultRow({ product }: { product: Product }) {
  const addProduct = useCartStore((s) => s.addProduct)
  const stock = useProductStore((s) => s.getStock(product.id))
  const price = useProductStore(useShallow((s) => s.getCurrentPrice(product.id)))
  const outOfStock = stock <= 0
  const lowStock = !outOfStock && stock <= product.lowStockLevel

  return (
    <button
      type="button"
      onClick={() => addProduct(product)}
      className="grid w-full grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-brand-50"
    >
      <div className="min-w-0">
        <div className="truncate text-[13px] font-semibold text-ink">{product.name}</div>
        <div className="truncate text-[11px] text-ink-faint">
          {product.code} &middot; {product.barcode}
        </div>
      </div>

      <div
        className={clsx(
          'w-20 shrink-0 rounded px-1.5 py-0.5 text-center text-[11px] font-medium',
          outOfStock ? 'bg-danger-bg text-danger' : lowStock ? 'bg-warning-bg text-warning' : 'bg-panel-alt text-ink-soft',
        )}
      >
        {formatNumber(stock)} {product.unit}
      </div>

      <div className="w-24 shrink-0 text-right text-[13px] font-bold text-brand-700">{formatCurrency(price?.customerPrice ?? 0)}</div>

      <div className="w-14 shrink-0 text-right text-[11px] font-medium text-ink-faint">{product.unit}</div>
    </button>
  )
}
