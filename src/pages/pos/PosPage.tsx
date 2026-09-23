import { useEffect, useRef, useState } from 'react'
import { ProductSearchPanel } from '@/components/pos/ProductSearchPanel'
import { CartPanel } from '@/components/pos/CartPanel'
import { HeldSalesModal } from '@/components/pos/HeldSalesModal'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { useCartStore } from '@/store/cartStore'
import { useSalesStore } from '@/store/salesStore'
import { useCurrentUser } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { nextInvoiceNo } from '@/lib/id'
import { ApiError } from '@/lib/api'
import type { Sale } from '@/types'

export function PosPage() {
  const searchRef = useRef<HTMLInputElement>(null)
  const customerRef = useRef<HTMLInputElement>(null)
  const paymentRef = useRef<HTMLInputElement>(null)

  const [selectedProductId, setSelectedProductId] = useState<string | null>(null)
  const [heldSalesOpen, setHeldSalesOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<Sale | null>(null)
  const [draftInvoice, setDraftInvoice] = useState(() => nextInvoiceNo())
  const [submittingSale, setSubmittingSale] = useState(false)

  const items = useCartStore((s) => s.items)
  const customerName = useCartStore((s) => s.customerName)
  const priceTier = useCartStore((s) => s.priceTier)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const amountReceived = useCartStore((s) => s.amountReceived)
  const subtotal = useCartStore((s) => s.subtotal())
  const totalDiscount = useCartStore((s) => s.totalDiscount())
  const grandTotal = useCartStore((s) => s.grandTotal())
  const holdSale = useCartStore((s) => s.holdSale)
  const clearCart = useCartStore((s) => s.clearCart)
  const removeItem = useCartStore((s) => s.removeItem)

  const completeSaleAction = useSalesStore((s) => s.completeSale)
  const { user } = useCurrentUser()
  const pushToast = useUiStore((s) => s.pushToast)

  async function handleCompleteSale() {
    if (submittingSale) return
    if (items.length === 0) {
      pushToast('warning', 'Cart is empty.')
      return
    }
    const received = Number(amountReceived) || grandTotal
    if (paymentMethod === 'cash' && received < grandTotal) {
      pushToast('error', 'Amount received is less than the grand total.')
      return
    }
    setSubmittingSale(true)
    try {
      const sale = await completeSaleAction({
        items,
        subtotal,
        discount: totalDiscount,
        grandTotal,
        counter: user?.counter ?? 'Counter 1',
        cashierId: user?.id ?? 'unknown',
        cashierName: user?.name ?? 'Unknown',
        customerName: customerName || undefined,
        priceTier,
        paymentMethod,
        amountReceived: received,
      })
      setCompletedSale(sale)
      clearCart()
      setSelectedProductId(null)
      setDraftInvoice(nextInvoiceNo())
      pushToast('success', `Sale ${sale.invoiceNo} completed.`)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to complete sale.')
    } finally {
      setSubmittingSale(false)
    }
  }

  function handleHold() {
    if (items.length === 0) return
    holdSale()
    setSelectedProductId(null)
    setDraftInvoice(nextInvoiceNo())
    pushToast('info', 'Sale held. Resume it anytime from Held Sales.')
  }

  useEffect(() => {
    searchRef.current?.focus()
  }, [])

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'F2') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'F4') {
        e.preventDefault()
        customerRef.current?.focus()
      } else if (e.key === 'F6') {
        e.preventDefault()
        paymentRef.current?.focus()
      } else if (e.key === 'F8') {
        e.preventDefault()
        handleHold()
      } else if (e.key === 'F9') {
        e.preventDefault()
        handleCompleteSale()
      } else if (e.key === 'Escape') {
        if (heldSalesOpen) setHeldSalesOpen(false)
        if (completedSale) setCompletedSale(null)
      } else if (e.key === 'Delete') {
        if (selectedProductId) {
          removeItem(selectedProductId)
          setSelectedProductId(null)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="flex h-full min-h-0 gap-3">
      <div className="min-w-0 flex-1">
        <ProductSearchPanel ref={searchRef} />
      </div>
      <CartPanel
        ref={customerRef}
        invoiceNo={draftInvoice}
        selectedProductId={selectedProductId}
        onSelectProduct={setSelectedProductId}
        onHold={handleHold}
        onCompleteSale={handleCompleteSale}
        completingSale={submittingSale}
        onOpenHeldSales={() => setHeldSalesOpen(true)}
        paymentInputRef={paymentRef}
      />

      <HeldSalesModal open={heldSalesOpen} onClose={() => setHeldSalesOpen(false)} />
      <ReceiptModal sale={completedSale} onClose={() => setCompletedSale(null)} />
    </div>
  )
}
