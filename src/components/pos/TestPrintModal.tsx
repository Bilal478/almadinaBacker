import { createPortal } from 'react-dom'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useSettingsStore } from '@/store/settingsStore'
import { ReceiptContent } from '@/components/pos/ReceiptContent'
import { useCurrentUser } from '@/store/authStore'
import { Printer } from 'lucide-react'
import type { Sale } from '@/types'

/**
 * A fabricated, never-saved receipt for checking a printer/paper/layout on a new till before
 * it ever touches real sales — nothing here hits the API or the database, and the sample
 * invoice number and item names make it unmistakable if it were ever mixed up with a real one.
 */
function buildTestSale(cashierName: string): Sale {
  const now = new Date().toISOString()
  return {
    id: 'test-print',
    invoiceNo: 'TEST-PRINT-0001',
    date: now.slice(0, 10),
    createdAt: now,
    counter: 'Test Counter',
    cashierId: 'test',
    cashierName,
    customerName: '*** TEST PRINT — NOT A REAL SALE ***',
    priceTier: 'customer',
    items: [
      { id: 't1', productId: 't1', name: 'Sample Item A', code: 'TEST-A', unit: 'pcs', qty: 2, unitPrice: 150, unitCost: 0, discount: 0, total: 300, returnedQty: 0 },
      { id: 't2', productId: 't2', name: 'Sample Item B', code: 'TEST-B', unit: 'pcs', qty: 1, unitPrice: 250, unitCost: 0, discount: 20, total: 230, returnedQty: 0 },
    ],
    subtotal: 550,
    discount: 20,
    grandTotal: 530,
    paymentMethod: 'cash',
    amountReceived: 600,
    change: 70,
    status: 'completed',
    printedAt: null,
  }
}

export function TestPrintModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettingsStore((s) => s.settings)
  const { user } = useCurrentUser()
  const sale = buildTestSale(user?.name ?? 'Test User')

  return (
    <>
      <Modal
        open={open}
        title="Test Print"
        subtitle="Sample receipt — not saved anywhere"
        onClose={onClose}
        width="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => window.print()}>
              <Printer size={14} /> Print Test Receipt
            </Button>
            <Button variant="primary" onClick={onClose}>
              Close
            </Button>
          </>
        }
      >
        <div className="mb-2 rounded bg-warning-bg px-2.5 py-1.5 text-center text-[11px] font-medium text-warning">
          This is a sample receipt for checking your printer setup — it uses fake data and is never saved.
        </div>
        <ReceiptContent sale={sale} settings={settings} />
      </Modal>

      {open &&
        createPortal(
          <div className="receipt-print-area">
            <ReceiptContent sale={sale} settings={settings} />
          </div>,
          document.body,
        )}
    </>
  )
}
