import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { ProductFormModal } from '@/components/products/ProductFormModal'
import { ProductLineCombobox } from '@/components/purchases/ProductLineCombobox'
import { useProductStore } from '@/store/productStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import { formatCurrency } from '@/lib/format'
import type { Product, Unit } from '@/types'

interface LineDraft {
  productId: string
  quantity: string
  unit: Unit
  cost: string
  expiryDate: string
}

// Starts with no product selected — a pre-filled default would sit in the combobox as text a
// scan could get appended onto instead of replacing (a receiving clerk scans into a blank line).
function emptyLine(): LineDraft {
  return { productId: '', quantity: '', unit: '', cost: '', expiryDate: '' }
}

// A scanned code is a long run of digits; a typed search phrase isn't — used to decide whether
// the quick-add modal should prefill the Barcode field or the Name field.
function looksLikeBarcode(query: string): boolean {
  return /^\d{6,}$/.test(query.trim())
}

export function PurchaseFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const allProducts = useProductStore((s) => s.products)
  const products = useMemo(() => allProducts.filter((p) => p.status === 'active'), [allProducts])
  const allSuppliers = useSupplierStore((s) => s.suppliers)
  const suppliers = useMemo(() => allSuppliers.filter((sup) => sup.status === 'active'), [allSuppliers])
  const addPurchase = useSupplierStore((s) => s.addPurchase)
  const pushToast = useUiStore((s) => s.pushToast)

  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? '')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [invoiceNo, setInvoiceNo] = useState('')
  const [paidAmount, setPaidAmount] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()])
  const [quickAdd, setQuickAdd] = useState<{ lineIndex: number; query: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const comboRefs = useRef<Array<HTMLInputElement | null>>([])
  const qtyRefs = useRef<Array<HTMLInputElement | null>>([])
  const costRefs = useRef<Array<HTMLInputElement | null>>([])
  const focusComboIndex = useRef<number | null>(null)

  // Runs after a line is added so the new row's combobox exists in the DOM before we focus it.
  useEffect(() => {
    if (focusComboIndex.current !== null) {
      comboRefs.current[focusComboIndex.current]?.focus()
      focusComboIndex.current = null
    }
  }, [lines.length])

  // Opening the form ready-to-scan means a clerk can start receiving without touching the mouse.
  useEffect(() => {
    if (open) comboRefs.current[0]?.focus()
  }, [open])

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((ls) => ls.map((l, i) => (i === index ? { ...l, ...patch } : l)))
  }

  function addLine(focusNew?: boolean) {
    setLines((ls) => {
      if (focusNew) focusComboIndex.current = ls.length
      return [...ls, emptyLine()]
    })
  }

  function removeLine(index: number) {
    setLines((ls) => ls.filter((_, i) => i !== index))
  }

  /** Chains Cost -> next line's Product field (adding a fresh line when scanning past the last one). */
  function handleCostEnter(idx: number) {
    if (idx === lines.length - 1) {
      addLine(true)
    } else {
      comboRefs.current[idx + 1]?.focus()
    }
  }

  const total = lines.reduce((sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.cost) || 0), 0)
  const paid = Number(paidAmount) || 0
  const remaining = Math.max(0, total - paid)

  function reset() {
    setSupplierId(suppliers[0]?.id ?? '')
    setDate(new Date().toISOString().slice(0, 10))
    setInvoiceNo('')
    setPaidAmount('')
    setLines([emptyLine()])
  }

  async function handleSubmit() {
    if (submitting) return
    if (!supplierId) {
      pushToast('error', 'Select a supplier.')
      return
    }
    const validLines = lines.filter((l) => l.productId && Number(l.quantity) > 0 && Number(l.cost) > 0)
    if (validLines.length === 0) {
      pushToast('error', 'Add at least one valid product line.')
      return
    }
    setSubmitting(true)
    try {
      await addPurchase({
        supplierId,
        date,
        invoiceNo: invoiceNo || undefined,
        paidAmount: paid,
        items: validLines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          unit: l.unit,
          cost: Number(l.cost),
          expiryDate: l.expiryDate || undefined,
        })),
      })
      pushToast('success', 'Purchase recorded and stock received into new batches.')
      reset()
      onClose()
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to record purchase.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        title="Record Purchase / Receiving"
        onClose={onClose}
        width="xl"
        footer={
          <>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Purchase'}
            </Button>
          </>
        }
      >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Supplier</label>
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Purchase Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Invoice / Reference No.</label>
            <input
              value={invoiceNo}
              onChange={(e) => setInvoiceNo(e.target.value)}
              placeholder="Auto-generated if left blank"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="rounded border border-border">
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-2 border-b border-border bg-panel-alt px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
            <div>Product</div>
            <div>Quantity</div>
            <div>Unit</div>
            <div>Purchase Cost</div>
            <div>Expiry</div>
            <div />
          </div>
          {lines.map((line, idx) => (
            <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] items-center gap-2 border-b border-border px-2.5 py-1.5 last:border-b-0">
              <ProductLineCombobox
                ref={(el) => {
                  comboRefs.current[idx] = el
                }}
                products={products}
                value={line.productId}
                onChange={(p) => updateLine(idx, { productId: p.id, unit: p.unit })}
                onCreateNew={(query) => setQuickAdd({ lineIndex: idx, query })}
                onResolved={() => qtyRefs.current[idx]?.focus()}
              />
              <input
                ref={(el) => {
                  qtyRefs.current[idx] = el
                }}
                type="number"
                min={0}
                value={line.quantity}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateLine(idx, { quantity: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    costRefs.current[idx]?.focus()
                  }
                }}
                className="rounded border border-border-strong bg-panel px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
              <input
                value={line.unit}
                disabled
                className="rounded border border-border bg-panel-alt px-2 py-1 text-sm text-ink-faint"
              />
              <input
                ref={(el) => {
                  costRefs.current[idx] = el
                }}
                type="number"
                min={0}
                value={line.cost}
                onFocus={(e) => e.target.select()}
                onChange={(e) => updateLine(idx, { cost: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCostEnter(idx)
                  }
                }}
                className="rounded border border-border-strong bg-panel px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
              <input
                type="date"
                value={line.expiryDate}
                onChange={(e) => updateLine(idx, { expiryDate: e.target.value })}
                className="rounded border border-border-strong bg-panel px-2 py-1 text-sm outline-none focus:border-brand-500"
              />
              <button
                onClick={() => removeLine(idx)}
                disabled={lines.length === 1}
                className="flex h-7 w-7 items-center justify-center rounded text-ink-faint hover:bg-danger-bg hover:text-danger disabled:opacity-30"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <div className="p-2">
            <Button size="sm" variant="ghost" onClick={() => addLine()}>
              <Plus size={13} /> Add Line
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 rounded border border-border bg-panel-alt p-3">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Total Purchase</div>
            <div className="text-[16px] font-bold text-ink">{formatCurrency(total)}</div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Paid Amount</label>
            <input
              type="number"
              min={0}
              value={paidAmount}
              onChange={(e) => setPaidAmount(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">Remaining (Outstanding)</div>
            <div className={`text-[16px] font-bold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>{formatCurrency(remaining)}</div>
          </div>
        </div>
      </div>
      </Modal>

      <ProductFormModal
        open={!!quickAdd}
        product={null}
        initialName={quickAdd && !looksLikeBarcode(quickAdd.query) ? quickAdd.query : undefined}
        initialBarcode={quickAdd && looksLikeBarcode(quickAdd.query) ? quickAdd.query : undefined}
        hideOpeningStock
        onClose={() => setQuickAdd(null)}
        onCreated={(created: Product) => {
          if (quickAdd) {
            updateLine(quickAdd.lineIndex, { productId: created.id, unit: created.unit })
            qtyRefs.current[quickAdd.lineIndex]?.focus()
          }
          setQuickAdd(null)
        }}
      />
    </>
  )
}
