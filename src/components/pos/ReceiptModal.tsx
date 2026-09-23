import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import type { Sale } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { useSalesStore } from '@/store/salesStore'
import { ReceiptContent } from '@/components/pos/ReceiptContent'
import { Printer, CheckCircle2 } from 'lucide-react'

export function ReceiptModal({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings)
  const markPrinted = useSalesStore((s) => s.markPrinted)
  const [justPrinted, setJustPrinted] = useState(false)

  // The browser gives no "print actually succeeded" signal — `afterprint` fires whether the
  // user hit Print or Cancel in the dialog. It's the closest available signal, and good
  // enough for "did they at least go through printing", which is what this is tracking.
  useEffect(() => {
    setJustPrinted(false)
    if (!sale) return
    const saleId = sale.id
    function handleAfterPrint() {
      setJustPrinted(true)
      markPrinted(saleId).catch(() => {})
    }
    window.addEventListener('afterprint', handleAfterPrint)
    return () => window.removeEventListener('afterprint', handleAfterPrint)
  }, [sale, markPrinted])

  const printed = justPrinted || !!sale?.printedAt

  return (
    <>
      <Modal
        open={!!sale}
        title="Sale Completed"
        subtitle={sale?.invoiceNo}
        onClose={onClose}
        width="sm"
        footer={
          <>
            {printed && (
              <span className="mr-auto flex items-center gap-1 text-[12px] font-medium text-success">
                <CheckCircle2 size={14} /> Printed
              </span>
            )}
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={14} /> {printed ? 'Print Again' : 'Print'}
            </Button>
            <Button variant="primary" onClick={onClose}>
              New Sale (F9)
            </Button>
          </>
        }
      >
        {sale && <ReceiptContent sale={sale} settings={settings} />}
      </Modal>

      {/* Print-only copy, portaled straight onto <body> so it's never nested inside the
          modal's fixed/overflow wrappers — those would otherwise clip or mis-position it
          when the browser prints. Hidden on screen, shown only under @media print (index.css). */}
      {sale &&
        createPortal(
          <div className="receipt-print-area">
            <ReceiptContent sale={sale} settings={settings} />
          </div>,
          document.body,
        )}
    </>
  )
}
