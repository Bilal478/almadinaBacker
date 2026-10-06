import { useEffect, useMemo, useState } from 'react'
import { Barcode as BarcodeIcon, Printer, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { ProductSearchSelect } from '@/components/common/ProductSearchSelect'
import { BarcodeLabelContent } from '@/components/products/BarcodeLabelContent'
import { LABEL_HEIGHT_MM, LABEL_WIDTH_MM, printLabels } from '@/lib/printLabels'
import { useProductStore } from '@/store/productStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import { formatCurrency, formatNumber } from '@/lib/format'

interface QueueRow {
  productId: string
  copies: string
}

/**
 * Bulk barcode label printing: build a list of products with a copy count each, then print
 * them all in one go — every label is its own page, so the label printer feeds stickers one
 * after another. A product keeps the same barcode for life; restocking just means printing
 * more copies of it here, never a new code.
 */
export function BarcodeLabelsPage() {
  const products = useProductStore((s) => s.products)
  const fetchProducts = useProductStore((s) => s.fetchAll)
  const getStock = useProductStore((s) => s.getStock)
  const generateBarcode = useProductStore((s) => s.generateBarcode)
  const canManage = useAuthStore((s) => s.hasPermission('manage_products'))
  const pushToast = useUiStore((s) => s.pushToast)

  const [queue, setQueue] = useState<QueueRow[]>([])
  const [showPrice, setShowPrice] = useState(false)
  const [generatingId, setGeneratingId] = useState<string | null>(null)

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const activeProducts = useMemo(() => products.filter((p) => p.status === 'active'), [products])
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  const rows = queue.flatMap((row) => {
    const product = productById.get(row.productId)
    return product ? [{ ...row, product, copyCount: Math.max(0, Math.floor(Number(row.copies) || 0)) }] : []
  })
  const printable = rows.filter((r) => r.product.barcode && r.copyCount > 0)
  const totalLabels = printable.reduce((sum, r) => sum + r.copyCount, 0)
  const missingBarcode = rows.filter((r) => !r.product.barcode).length

  function addProduct(productId: string) {
    if (!productId) return
    setQueue((q) => (q.some((r) => r.productId === productId) ? q : [...q, { productId, copies: '1' }]))
  }

  function setCopies(productId: string, copies: string) {
    setQueue((q) => q.map((r) => (r.productId === productId ? { ...r, copies } : r)))
  }

  function matchAllToStock() {
    setQueue((q) => q.map((r) => ({ ...r, copies: String(Math.max(1, Math.ceil(getStock(r.productId)))) })))
  }

  async function handleGenerate(productId: string) {
    setGeneratingId(productId)
    try {
      await generateBarcode(productId)
      pushToast('success', 'Barcode generated.')
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to generate barcode.')
    } finally {
      setGeneratingId(null)
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-96">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Add product</label>
          <ProductSearchSelect products={activeProducts} value="" onChange={addProduct} placeholder="Search name, SKU or scan barcode…" />
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-sm text-ink-soft">
            <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
            Show price on label
          </label>
          <Button variant="secondary" onClick={matchAllToStock} disabled={queue.length === 0}>
            Copies = stock for all
          </Button>
          <Button variant="ghost" onClick={() => setQueue([])} disabled={queue.length === 0}>
            Clear list
          </Button>
          <Button variant="primary" onClick={() => printLabels(printable.map((r) => ({ product: r.product, copies: r.copyCount })), showPrice)}
            disabled={totalLabels === 0}>
            <Printer size={14} /> Print {formatNumber(totalLabels)} {totalLabels === 1 ? 'Label' : 'Labels'}
          </Button>
        </div>
      </div>

      {missingBarcode > 0 && (
        <div className="rounded border border-warning bg-warning-bg px-3 py-2 text-[12px] text-ink">
          {missingBarcode} product(s) in the list have no barcode yet and will be skipped.{' '}
          {canManage ? 'Use "Generate" on those rows first.' : 'Ask a manager to generate one.'}
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-3">
        <div className="min-h-0 flex-1 overflow-auto rounded border border-border bg-panel">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 z-10 bg-panel-alt">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="border-b border-border px-3 py-2 text-left">Product</th>
                <th className="border-b border-border px-3 py-2 text-left">Barcode</th>
                <th className="border-b border-border px-3 py-2 text-right">Price</th>
                <th className="border-b border-border px-3 py-2 text-right">Stock</th>
                <th className="border-b border-border px-3 py-2 text-center">Copies</th>
                <th className="border-b border-border px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-sm text-ink-faint">
                    Search or scan a product above to add it to the print list.
                  </td>
                </tr>
              )}
              {rows.map(({ product, copies }) => (
                <tr key={product.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    <div className="font-semibold text-ink">{product.name}</div>
                    <div className="text-[11px] text-ink-faint">{product.code}</div>
                  </td>
                  <td className="px-3 py-2">
                    {product.barcode ? (
                      <span className="font-mono text-[12.5px]">{product.barcode}</span>
                    ) : canManage ? (
                      <button
                        onClick={() => handleGenerate(product.id)}
                        disabled={generatingId === product.id}
                        className="flex items-center gap-1 text-[12px] font-semibold text-brand-700 hover:underline disabled:opacity-50"
                      >
                        <BarcodeIcon size={13} /> {generatingId === product.id ? 'Generating…' : 'Generate'}
                      </button>
                    ) : (
                      <span className="text-[12px] text-ink-faint">No barcode</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">{formatCurrency(product.currentPrice?.customerPrice ?? 0)}</td>
                  <td className="px-3 py-2 text-right">{formatNumber(getStock(product.id))}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min={0}
                      value={copies}
                      onChange={(e) => setCopies(product.id, e.target.value)}
                      className="w-20 rounded border border-border-strong bg-panel px-2 py-1 text-right text-sm outline-none focus:border-brand-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      title="Remove"
                      onClick={() => setQueue((q) => q.filter((r) => r.productId !== product.id))}
                      className="flex h-7 w-7 items-center justify-center rounded border border-border-strong text-ink-soft hover:border-danger hover:bg-danger-bg hover:text-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="w-72 shrink-0 rounded border border-border bg-panel p-3">
          <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            Label preview ({LABEL_WIDTH_MM} × {LABEL_HEIGHT_MM} mm)
          </div>
          {printable[0] ? (
            <div className="flex justify-center rounded border border-dashed border-border-strong bg-panel-alt p-3">
              <div style={{ width: `${LABEL_WIDTH_MM}mm` }}>
                <BarcodeLabelContent product={printable[0].product} showPrice={showPrice} />
              </div>
            </div>
          ) : (
            <div className="py-6 text-center text-[12px] text-ink-faint">Nothing to preview yet.</div>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
            Each product keeps the same barcode for good. When new stock arrives, add it here again and print as many copies as
            packets — no new barcode needed, so all its sales and stock history stay together.
          </p>
        </div>
      </div>
    </div>
  )
}
