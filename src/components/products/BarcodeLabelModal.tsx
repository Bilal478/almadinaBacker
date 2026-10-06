import { useState } from 'react'
import { Printer } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { BarcodeLabelContent } from '@/components/products/BarcodeLabelContent'
import { LABEL_WIDTH_MM, printLabels } from '@/lib/printLabels'
import type { Product } from '@/types'

/** Callers key this by product id, so copies/show-price reset for each new product. */
export function BarcodeLabelModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const [copies, setCopies] = useState('1')
  const [showPrice, setShowPrice] = useState(false)
  const copyCount = Math.max(0, Math.floor(Number(copies) || 0))

  return (
    <>
      <Modal
        open={!!product}
        title="Print Barcode Label"
        subtitle={product?.barcode}
        onClose={onClose}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
            <Button variant="primary" onClick={() => product && printLabels([{ product, copies: copyCount }], showPrice)} disabled={!product?.barcode || copyCount < 1}>
              <Printer size={14} /> Print {copyCount === 1 ? 'Label' : `${copyCount} Labels`}
            </Button>
          </>
        }
      >
        {product && (
          <div className="space-y-3">
            <div className="flex justify-center rounded border border-dashed border-border-strong bg-panel-alt p-4">
              <div style={{ width: `${LABEL_WIDTH_MM}mm` }}>
                <BarcodeLabelContent product={product} showPrice={showPrice} />
              </div>
            </div>
            <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Copies</label>
                <input
                  type="number"
                  min={1}
                  value={copies}
                  onChange={(e) => setCopies(e.target.value)}
                  className="w-24 rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
                />
              </div>
              {product.stock > 0 && (
                <Button size="sm" variant="secondary" onClick={() => setCopies(String(Math.ceil(product.stock)))}>
                  Match stock ({Math.ceil(product.stock)})
                </Button>
              )}
              <label className="ml-auto flex items-center gap-1.5 pb-1.5 text-sm text-ink-soft">
                <input type="checkbox" checked={showPrice} onChange={(e) => setShowPrice(e.target.checked)} />
                Show price
              </label>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
