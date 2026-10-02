import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { BarcodeLabelContent } from '@/components/products/BarcodeLabelContent'
import type { Product } from '@/types'

// This bakery's thermal label printer is loaded with 50mm x 30mm stickers — change these if a
// different label size is ever loaded, nothing else in this component depends on the exact size.
const LABEL_WIDTH_MM = 50
const LABEL_HEIGHT_MM = 30

export function BarcodeLabelModal({ product, onClose }: { product: Product | null; onClose: () => void }) {
  // A stylesheet can't make @page conditional on which print area is active (receipt vs.
  // label) — so instead of a fixed @page rule for labels in index.css, this injects one only
  // while the label modal is open, and removes it on close so receipt printing goes back to
  // its own 80mm @page untouched.
  useEffect(() => {
    if (!product) return
    const style = document.createElement('style')
    style.textContent = `@page { size: ${LABEL_WIDTH_MM}mm ${LABEL_HEIGHT_MM}mm; margin: 2mm; }`
    document.head.appendChild(style)
    return () => {
      style.remove()
    }
  }, [product])

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
            <Button variant="primary" onClick={() => window.print()} disabled={!product?.barcode}>
              <Printer size={14} /> Print Label
            </Button>
          </>
        }
      >
        {product && (
          <div className="flex justify-center rounded border border-dashed border-border-strong bg-panel-alt p-4">
            <div style={{ width: `${LABEL_WIDTH_MM}mm` }}>
              <BarcodeLabelContent product={product} />
            </div>
          </div>
        )}
      </Modal>

      {product &&
        createPortal(
          <div className="label-print-area">
            <div style={{ width: `${LABEL_WIDTH_MM}mm` }}>
              <BarcodeLabelContent product={product} />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
