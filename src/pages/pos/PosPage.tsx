import { useEffect, useRef, useState } from 'react'
import { ProductSearchPanel } from '@/components/pos/ProductSearchPanel'
import { CartPanel } from '@/components/pos/CartPanel'
import { HeldSalesModal } from '@/components/pos/HeldSalesModal'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { useCartStore } from '@/store/cartStore'
import { useSalesStore } from '@/store/salesStore'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useCurrentUser } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { usePrinterSettingsStore } from '@/store/printerSettingsStore'
import { warmUpQz } from '@/lib/qzTray'
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
  const customerPhone = useCartStore((s) => s.customerPhone)
  const priceTier = useCartStore((s) => s.priceTier)
  const paymentMethod = useCartStore((s) => s.paymentMethod)
  const amountReceived = useCartStore((s) => s.amountReceived)
  const orderDiscount = useCartStore((s) => s.orderDiscount)
  const subtotal = useCartStore((s) => s.subtotal())
  const grandTotal = useCartStore((s) => s.grandTotal())
  const holdSale = useCartStore((s) => s.holdSale)
  const clearCart = useCartStore((s) => s.clearCart)
  const removeItem = useCartStore((s) => s.removeItem)

  const completeSaleAction = useSalesStore((s) => s.completeSale)
  const fetchProducts = useProductStore((s) => s.fetchAll)
  const fetchInventory = useInventoryStore((s) => s.fetchAll)
  const { user } = useCurrentUser()
  const pushToast = useUiStore((s) => s.pushToast)

  // Stock and prices must be current the moment a cashier opens the till — stale numbers
  // here mean overselling something that's actually out, or charging an old price.
  useEffect(() => {
    fetchProducts()
    fetchInventory()
  }, [fetchProducts, fetchInventory])

  async function handleCompleteSale() {
    if (submittingSale) return
    if (items.length === 0) {
      pushToast('warning', 'Cart is empty.')
      return
    }
    const isCredit = paymentMethod === 'credit'
    if (isCredit && !customerName.trim()) {
      pushToast('error', 'Enter the customer name for a Pay Later sale.')
      customerRef.current?.focus()
      return
    }
    const received = isCredit ? 0 : Number(amountReceived) || grandTotal
    if (paymentMethod === 'cash' && received < grandTotal) {
      pushToast('error', 'Amount received is less than the grand total.')
      return
    }
    setSubmittingSale(true)
    // Make sure the QZ Tray connection is up while the sale is still saving, so clicking Print
    // on the receipt doesn't first have to wait for a reconnect (that takes seconds).
    const { enabled, printerName } = usePrinterSettingsStore.getState()
    if (enabled && printerName) warmUpQz()
    try {
      const sale = await completeSaleAction({
        items,
        subtotal,
        discount: Number(orderDiscount) || 0,
        grandTotal,
        counter: user?.counter ?? 'Counter 1',
        cashierId: user?.id ?? 'unknown',
        cashierName: user?.name ?? 'Unknown',
        customerName: customerName.trim() || undefined,
        customerPhone: isCredit ? customerPhone.trim() || undefined : undefined,
        priceTier,
        paymentMethod,
        amountReceived: received,
      })
      setCompletedSale(sale)
      clearCart()
      setSelectedProductId(null)
      setDraftInvoice(nextInvoiceNo())
      pushToast(
        'success',
        sale.isCredit ? `Sale ${sale.invoiceNo} saved as unpaid for ${sale.customerName}.` : `Sale ${sale.invoiceNo} completed.`,
      )
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
