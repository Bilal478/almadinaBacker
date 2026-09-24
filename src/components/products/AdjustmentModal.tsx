import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore, type AdjustmentType } from '@/store/inventoryStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import { formatDate, formatNumber } from '@/lib/format'
import type { Product } from '@/types'

const TYPE_OPTIONS: { value: AdjustmentType; label: string; direction: 'in' | 'out'; defaultReason: string }[] = [
  { value: 'ADJUSTMENT_IN', label: 'Found stock (add to inventory)', direction: 'in', defaultReason: 'Found stock (physical recount)' },
  { value: 'ADJUSTMENT_OUT', label: 'Stock correction (remove — miscount, etc.)', direction: 'out', defaultReason: 'Stock correction' },
  { value: 'DAMAGE', label: 'Damaged / spoiled (remove)', direction: 'out', defaultReason: 'Damaged / spoiled' },
  { value: 'EXPIRY', label: 'Expired (remove)', direction: 'out', defaultReason: 'Expired' },
]

/**
 * The "no supplier involved" path for fixing stock counts — use this instead of a Purchase
 * when nothing was actually bought (a physical recount found more/less than the system
 * thinks, or stock needs writing off). A Purchase always requires a supplier because it's a
 * real transaction with a cost and a ledger entry; this is a plain correction with just a
 * reason, going straight through InventoryService::adjust().
 */
export function AdjustmentModal({ open, initialProductId, onClose }: { open: boolean; initialProductId?: string; onClose: () => void }) {
  const products = useProductStore((s) => s.products)
  const batches = useInventoryStore((s) => s.batches)
  const adjustStock = useInventoryStore((s) => s.adjustStock)
  const getStock = useProductStore((s) => s.getStock)
  const pushToast = useUiStore((s) => s.pushToast)

  const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products])

  const [productId, setProductId] = useState('')
  const [productQuery, setProductQuery] = useState('')
  const [productDropdownOpen, setProductDropdownOpen] = useState(false)
  const [movementType, setMovementType] = useState<AdjustmentType>('ADJUSTMENT_IN')
  const [batchId, setBatchId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const selectedProduct = activeProducts.find((p) => p.id === productId)
  const typeInfo = TYPE_OPTIONS.find((t) => t.value === movementType)!

  useEffect(() => {
    if (open) {
      const initial = initialProductId ? activeProducts.find((p) => p.id === initialProductId) : undefined
      setProductId(initial?.id ?? '')
      setProductQuery(initial ? `${initial.name} (${initial.code})` : '')
      setMovementType('ADJUSTMENT_IN')
      setBatchId('')
      setQuantity('')
      setReason('')
    }
    // Deliberately not depending on activeProducts — only reset when the modal opens/changes target.
  }, [open, initialProductId])

  const direction = typeInfo.direction
  const productBatches = useMemo(
    () => batches.filter((b) => b.productId === productId && b.remaining > 0).sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate)),
    [batches, productId],
  )
  const currentStock = productId ? getStock(productId) : 0

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase()
    if (!q) return activeProducts
    return activeProducts.filter(
      (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q),
    )
  }, [activeProducts, productQuery])

  useEffect(() => {
    setBatchId('')
  }, [productId, movementType])

  function selectProduct(p: Product) {
    setProductId(p.id)
    setProductQuery(`${p.name} (${p.code})`)
    setProductDropdownOpen(false)
  }

  async function handleSubmit() {
    if (submitting) return
    if (!productId) {
      pushToast('error', 'Select a product.')
      return
    }
    const qty = Number(quantity)
    if (!qty || qty <= 0) {
      pushToast('error', 'Enter a quantity greater than 0.')
      return
    }
    if (direction === 'out' && !batchId) {
      pushToast('error', 'Select which batch this is coming out of.')
      return
    }
    setSubmitting(true)
    try {
      await adjustStock({
        productId,
        movementType,
        quantity: qty,
        reason: reason.trim() || typeInfo.defaultReason,
        batchId: direction === 'out' ? batchId : undefined,
      })
      pushToast('success', 'Stock adjusted.')
      onClose()
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to adjust stock.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Adjust Stock"
      subtitle="No supplier involved — for corrections, not purchases"
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Adjustment'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="relative">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Product</label>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              value={productQuery}
              onFocus={(e) => {
                setProductDropdownOpen(true)
                e.target.select()
              }}
              onChange={(e) => {
                setProductQuery(e.target.value)
                setProductDropdownOpen(true)
                if (productId) setProductId('')
              }}
              onBlur={() => setTimeout(() => setProductDropdownOpen(false), 150)}
              placeholder="Search by name, SKU or barcode…"
              className="w-full rounded border border-border-strong bg-panel py-1.5 pl-7 pr-2 text-sm outline-none focus:border-brand-500"
            />
          </div>
          {productDropdownOpen && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded border border-border bg-panel shadow-lg">
              {filteredProducts.length === 0 && <div className="px-2.5 py-2 text-xs text-ink-faint">No products match "{productQuery}".</div>}
              {filteredProducts.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectProduct(p)}
                  className="flex w-full flex-col items-start px-2.5 py-1.5 text-left text-sm hover:bg-brand-50"
                >
                  <span className="font-medium text-ink">{p.name}</span>
                  <span className="text-[11px] text-ink-faint">
                    {p.code} &middot; {p.barcode}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selectedProduct && <p className="mt-1 text-[11px] text-ink-faint">Current system stock: {formatNumber(currentStock)}</p>}
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Type</label>
          <select
            value={movementType}
            onChange={(e) => setMovementType(e.target.value as AdjustmentType)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {direction === 'out' && (
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">From Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            >
              <option value="">Select a batch…</option>
              {productBatches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchNo} — {formatNumber(b.remaining)} left{b.expiryDate ? ` — exp. ${formatDate(b.expiryDate)}` : ''}
                </option>
              ))}
            </select>
            {productId && productBatches.length === 0 && (
              <p className="mt-1 text-[11px] text-danger">No stocked batches available for this product.</p>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Quantity</label>
          <input
            type="number"
            min={0}
            step="any"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Reason (optional)</label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={typeInfo.defaultReason}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
          <p className="mt-1 text-[11px] text-ink-faint">Leave blank to record it simply as "{typeInfo.defaultReason}".</p>
        </div>
      </div>
    </Modal>
  )
}
