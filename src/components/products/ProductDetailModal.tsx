import { useEffect, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { StatusBadge } from '@/components/common/StatusBadge'
import { PriceHistoryTable } from '@/components/products/PriceHistoryTable'
import { BatchHistoryTable } from '@/components/products/BatchHistoryTable'
import { useProductStore } from '@/store/productStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatNumber } from '@/lib/format'
import type { Product } from '@/types'
import clsx from 'clsx'

type Tab = 'overview' | 'price' | 'batches'

export function ProductDetailModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [showPriceForm, setShowPriceForm] = useState(false)
  const [cost, setCost] = useState('')
  const [sellingPrice, setSellingPrice] = useState('')

  const currentPrice = useProductStore(useShallow((s) => (product ? s.getCurrentPrice(product.id) : undefined)))
  const stock = useProductStore((s) => (product ? s.getStock(product.id) : 0))
  const addPriceHistoryEntry = useProductStore((s) => s.addPriceHistoryEntry)
  const fetchPriceHistory = useProductStore((s) => s.fetchPriceHistory)
  const fetchBatches = useProductStore((s) => s.fetchBatches)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    if (!product) return
    fetchPriceHistory(product.id)
    fetchBatches(product.id)
  }, [product, fetchPriceHistory, fetchBatches])

  if (!product) return null

  function resetPriceForm() {
    setCost('')
    setSellingPrice('')
    setShowPriceForm(false)
  }

  async function submitPriceChange() {
    if (!product) return
    const c = Number(cost)
    const sp = Number(sellingPrice)
    if (!c || !sp) {
      pushToast('error', 'Enter the purchase cost and selling price.')
      return
    }
    await addPriceHistoryEntry({
      productId: product.id,
      effectiveDate: new Date().toISOString().slice(0, 10),
      purchaseCost: c,
      customerPrice: sp,
      retailerPrice: sp,
    })
    pushToast('success', 'New price recorded. Previous prices remain in history.')
    resetPriceForm()
  }

  return (
    <Modal open={!!product} title={product.name} subtitle={`${product.code} · ${product.category}`} onClose={onClose} width="lg">
      <div className="mb-3 flex gap-1 border-b border-border">
        {(['overview', 'price', 'batches'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'border-b-2 px-3 py-1.5 text-[12.5px] font-medium capitalize',
              tab === t ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-faint hover:text-ink',
            )}
          >
            {t === 'price' ? 'Price History' : t === 'batches' ? 'Batch / Stock History' : 'Overview'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <InfoTile label="Current Stock" value={`${formatNumber(stock)} ${product.unit}`} />
          <InfoTile label="Purchase Cost" value={formatCurrency(currentPrice?.purchaseCost ?? 0)} />
          <InfoTile label="Selling Price" value={formatCurrency(currentPrice?.customerPrice ?? 0)} />
          <InfoTile label="Low Stock Alert" value={`${product.lowStockLevel} ${product.unit}`} />
          <InfoTile label="Barcode" value={product.barcode || 'No barcode'} />
          <InfoTile label="Expiry Tracking" value={product.expiryTracking ? 'Enabled' : 'Disabled'} />
          <InfoTile
            label="Status"
            value={<StatusBadge tone={product.status === 'active' ? 'success' : 'neutral'}>{product.status}</StatusBadge>}
          />
        </div>
      )}

      {tab === 'price' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-ink-faint">
              Prices are never overwritten — every change is recorded with an effective date so historical sales always reflect the price
              charged at the time.
            </p>
            <Button size="sm" variant="primary" onClick={() => setShowPriceForm((v) => !v)}>
              {showPriceForm ? 'Cancel' : 'Record Price Change'}
            </Button>
          </div>

          {showPriceForm && (
            <div className="grid grid-cols-2 gap-2 rounded border border-border bg-panel-alt p-2.5">
              <Field label="Purchase Cost" value={cost} onChange={setCost} />
              <Field label="Selling Price" value={sellingPrice} onChange={setSellingPrice} />
              <div className="col-span-2 flex justify-end">
                <Button size="sm" variant="success" onClick={submitPriceChange}>
                  Save New Price
                </Button>
              </div>
            </div>
          )}

          <PriceHistoryTable productId={product.id} />
        </div>
      )}

      {tab === 'batches' && (
        <div className="space-y-3">
          <p className="text-xs text-ink-faint">
            Every purchase creates a new batch at its own cost — older batches are never overwritten, which keeps inventory costing
            accurate (FIFO-ready).
          </p>
          <BatchHistoryTable productId={product.id} />
        </div>
      )}
    </Modal>
  )
}

function InfoTile({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded border border-border p-2.5">
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="text-[14px] font-bold text-ink">{value}</div>
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-panel px-2 py-1 text-sm outline-none focus:border-brand-500"
      />
    </div>
  )
}
