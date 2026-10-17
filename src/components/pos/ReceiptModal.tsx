import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import type { Sale } from '@/types'
import { useSettingsStore } from '@/store/settingsStore'
import { useSalesStore } from '@/store/salesStore'
import { ReceiptContent } from '@/components/pos/ReceiptContent'
import { printReceipt } from '@/lib/printReceipt'
import { warmUpQz } from '@/lib/qzTray'
import { usePrinterSettingsStore } from '@/store/printerSettingsStore'
import { useUiStore } from '@/store/uiStore'
import { Printer, CheckCircle2 } from 'lucide-react'

export function ReceiptModal({
  sale,
  onClose,
  autoPrint,
}: {
  sale: Sale | null
  onClose: () => void
  /** Start printing as soon as the receipt opens — only for a sale just rung up, never a reprint. */
  autoPrint?: boolean
}) {
  const settings = useSettingsStore((s) => s.settings)
  const markPrinted = useSalesStore((s) => s.markPrinted)
  const pushToast = useUiStore((s) => s.pushToast)
  const [justPrinted, setJustPrinted] = useState(false)
  const [printing, setPrinting] = useState(false)
  // Which sale was already auto-printed — React StrictMode runs effects twice in development,
  // and re-renders must never send a second copy to the printer.
  const autoPrintedId = useRef<string | null>(null)

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

  // Re-check the QZ Tray connection the moment the receipt appears (it may have dropped since
  // app start), so it's ready by the time the cashier clicks Print.
  useEffect(() => {
    const { enabled, printerName } = usePrinterSettingsStore.getState()
    if (sale && enabled && printerName) warmUpQz()
  }, [sale])

  const printed = justPrinted || !!sale?.printedAt

  async function handlePrint() {
    if (!sale || printing) return
    setPrinting(true)
    try {
      const result = await printReceipt(sale, settings)
      if (result.fallbackReason) {
        pushToast('warning', `Direct printing failed (${result.fallbackReason}) — opened the regular print dialog instead.`)
      }
      // 'browser' still relies on the `afterprint` listener above — window.print()'s dialog is
      // still open/pending at this point, so there's nothing to confirm yet.
      if (result.method === 'direct') {
        setJustPrinted(true)
        markPrinted(sale.id).catch(() => {})
      }
    } finally {
      setPrinting(false)
    }
  }

  useEffect(() => {
    if (!autoPrint || !sale || sale.printedAt || autoPrintedId.current === sale.id) return
    autoPrintedId.current = sale.id
    handlePrint()
    // Keyed on the sale id only: once per newly completed sale, not on every re-render.
  }, [autoPrint, sale?.id])

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
            {printing ? (
              <span className="mr-auto text-[12px] font-medium text-ink-faint">Printing…</span>
            ) : (
              printed && (
                <span className="mr-auto flex items-center gap-1 text-[12px] font-medium text-success">
                  <CheckCircle2 size={14} /> Printed
                </span>
              )
            )}
            <Button variant="secondary" onClick={handlePrint} disabled={printing}>
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
