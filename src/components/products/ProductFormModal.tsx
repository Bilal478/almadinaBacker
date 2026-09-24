import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useProductStore } from '@/store/productStore'
import { useUnitStore } from '@/store/unitStore'
import { useCategoryStore } from '@/store/categoryStore'
import { useUiStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { api, ApiError } from '@/lib/api'
import type { Product, Unit } from '@/types'

interface BarcodeLookupResult {
  found: boolean
  suggested_name?: string
  brand?: string | null
}

type LookupStatus = 'idle' | 'loading' | 'found' | 'not-found' | 'exists'

interface FormState {
  name: string
  code: string
  barcode: string
  categoryId: string
  unit: Unit
  lowStockLevel: string
  expiryTracking: boolean
  status: 'active' | 'inactive'
  purchaseCost: string
  /** One price for every customer — stored on the backend as both customer/retailer price
   *  (same value) since this app still supports that split, but nothing here ever asks for
   *  or shows two different prices anymore. */
  sellingPrice: string
  openingQuantity: string
  openingExpiryDate: string
}

const EMPTY: FormState = {
  name: '',
  code: '',
  barcode: '',
  categoryId: '',
  unit: 'pcs',
  lowStockLevel: '20',
  expiryTracking: true,
  status: 'active',
  purchaseCost: '',
  sellingPrice: '',
  openingQuantity: '',
  openingExpiryDate: '',
}

export function ProductFormModal({
  open,
  product,
  onClose,
  initialName,
  initialBarcode,
  hideOpeningStock,
  onCreated,
  onEditExisting,
  onAdjustExisting,
}: {
  open: boolean
  product: Product | null
  onClose: () => void
  /** Prefills the name field — used when quick-creating from a search-and-add flow. */
  initialName?: string
  /** Prefills the barcode field — used when quick-creating from an unrecognized scanned barcode. */
  initialBarcode?: string
  /** Hides the Opening Stock section — used when the caller (e.g. a Purchase line) will supply the first batch itself. */
  hideOpeningStock?: boolean
  /** Called when a scanned/typed barcode turns out to already belong to a product in this
   *  system — lets the caller switch this same form into editing that product instead of
   *  letting the cashier attempt (and fail on a unique-constraint error) to create a duplicate. */
  onEditExisting?: (product: Product) => void
  /** Called for that same "already exists" case, offered as the primary action — scanning an
   *  existing product while trying to "add" one almost always means "I have more of this,"
   *  not "I need to fix its name," so this jumps straight to Stock Adjustment for it. */
  onAdjustExisting?: (product: Product) => void
  /** Called with the newly created product, in addition to onClose. */
  onCreated?: (product: Product) => void
}) {
  const [form, setForm] = useState<FormState>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [lookup, setLookup] = useState<LookupStatus>('idle')
  const [existingMatch, setExistingMatch] = useState<Product | null>(null)
  const lookedUpBarcodeRef = useRef<string | null>(null)
  const canAdjustInventory = useAuthStore((s) => s.hasPermission('manage_inventory'))
  const allProducts = useProductStore((s) => s.products)
  const addProduct = useProductStore((s) => s.addProduct)
  const updateProduct = useProductStore((s) => s.updateProduct)
  const allUnits = useUnitStore((s) => s.units)
  const units = useMemo(() => allUnits.filter((u) => u.status === 'active'), [allUnits])
  const allCategories = useCategoryStore((s) => s.categories)
  const categories = useMemo(() => allCategories.filter((c) => c.status === 'active'), [allCategories])
  const pushToast = useUiStore((s) => s.pushToast)

  const isEdit = !!product

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        code: product.code,
        barcode: product.barcode,
        categoryId: product.categoryId,
        unit: product.unit,
        lowStockLevel: String(product.lowStockLevel),
        expiryTracking: product.expiryTracking,
        status: product.status,
        purchaseCost: '',
        sellingPrice: '',
        openingQuantity: '',
        openingExpiryDate: '',
      })
    } else {
      setForm({ ...EMPTY, categoryId: categories[0]?.id ?? '', name: initialName ?? '', barcode: initialBarcode ?? '' })
    }
    lookedUpBarcodeRef.current = null
    setLookup('idle')
    setExistingMatch(null)
  }, [product, open, initialName, initialBarcode, categories])

  // Fires off ANY barcode-shaped value landing in the Barcode field while adding a new
  // product — whether it arrived pre-filled (an unrecognized scan during Purchase quick-add)
  // or was typed/scanned directly into this form (e.g. from the plain "Add Product" button
  // on the Products page, which has no pre-fill step of its own). One lookup per distinct
  // barcode value, tracked in a ref so a re-render doesn't refire it and so it doesn't erase
  // its own "found"/"not-found" status the moment it fills in the name.
  useEffect(() => {
    if (!open || isEdit) return
    const barcode = form.barcode.trim()
    if (!/^\d{6,}$/.test(barcode)) {
      lookedUpBarcodeRef.current = null
      setLookup('idle')
      setExistingMatch(null)
      return
    }
    if (lookedUpBarcodeRef.current === barcode) return
    lookedUpBarcodeRef.current = barcode

    // Check THIS system's own catalog first — an external lookup only knows about public
    // commercial products and will always say "not found" for anything already in this
    // bakery's own database, which previously looked exactly like a bug (scan an existing
    // product while adding a new one and get silence instead of "you already have this").
    const local = allProducts.find((p) => p.barcode === barcode)
    if (local) {
      setExistingMatch(local)
      setLookup('exists')
      return
    }

    let cancelled = false
    setLookup('loading')
    // A short debounce: a physical scanner "types" a barcode in well under 100ms and sends
    // Enter, but a human typing it digit-by-digit shouldn't fire a request per keystroke.
    const timer = setTimeout(() => {
      api
        .get<BarcodeLookupResult>(`/products/barcode-lookup/${encodeURIComponent(barcode)}`)
        .then((res) => {
          if (cancelled) return
          if (res.found && res.suggested_name) {
            // Never clobber something the cashier already typed, and never apply a stale
            // result to a barcode field that's since changed again.
            setForm((f) => (f.name.trim() || f.barcode.trim() !== barcode ? f : { ...f, name: res.suggested_name! }))
            setLookup('found')
          } else {
            setLookup('not-found')
          }
        })
        .catch(() => {
          if (!cancelled) setLookup('not-found')
        })
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [open, isEdit, form.barcode, allProducts])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!form.name.trim() || !form.barcode.trim()) {
      pushToast('error', 'Product name and barcode are required.')
      return
    }

    if (!isEdit && (!form.purchaseCost || !form.sellingPrice)) {
      pushToast('error', 'Enter the purchase cost and selling price for the new product.')
      return
    }

    setSubmitting(true)
    try {
      if (isEdit && product) {
        await updateProduct(product.id, {
          name: form.name,
          code: form.code,
          barcode: form.barcode,
          categoryId: form.categoryId,
          unit: form.unit,
          lowStockLevel: Number(form.lowStockLevel) || 0,
          expiryTracking: form.expiryTracking,
          status: form.status,
        })
        pushToast('success', 'Product updated.')
      } else {
        const openingQty = hideOpeningStock ? 0 : Number(form.openingQuantity) || 0
        const created = await addProduct({
          name: form.name,
          barcode: form.barcode,
          categoryId: form.categoryId,
          unit: form.unit,
          lowStockLevel: Number(form.lowStockLevel) || 0,
          expiryTracking: form.expiryTracking,
          status: form.status,
          purchaseCost: Number(form.purchaseCost),
          customerPrice: Number(form.sellingPrice),
          retailerPrice: Number(form.sellingPrice),
          openingQuantity: openingQty || undefined,
          openingExpiryDate: form.openingExpiryDate || undefined,
        })
        pushToast('success', openingQty > 0 ? `Product created with ${openingQty} ${form.unit} opening stock.` : 'Product created.')
        onCreated?.(created)
      }
      onClose()
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Failed to save product.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Product' : 'Add Product'}
      onClose={onClose}
      width="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting || lookup === 'exists'}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Product'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <TextField label="Product Name" value={form.name} onChange={(v) => set('name', v)} />
          {lookup === 'loading' && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-faint">
              <Loader2 size={11} className="animate-spin" /> Looking up this barcode…
            </p>
          )}
          {lookup === 'found' && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-brand-700">
              <Sparkles size={11} /> Auto-filled from a public barcode database — please check it matches before saving.
            </p>
          )}
          {lookup === 'not-found' && (
            <p className="mt-1 text-[11px] text-ink-faint">
              No match for this barcode in the public database (normal for house-made or local items) — enter the name yourself.
            </p>
          )}
        </div>
        {isEdit && (
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">SKU</label>
            <input
              value={form.code}
              disabled
              className="w-full rounded border border-border bg-panel-alt px-2 py-1.5 text-sm text-ink-faint"
            />
          </div>
        )}
        <TextField
          label="Barcode"
          value={form.barcode}
          onChange={(v) => set('barcode', v)}
          autoFocus={!isEdit && !initialBarcode && !initialName}
        />
        {lookup === 'exists' && existingMatch && (
          <div className="col-span-2 space-y-2 rounded border border-warning bg-warning-bg px-3 py-2 text-[12.5px] text-warning">
            <p>
              This barcode already belongs to <strong>{existingMatch.name}</strong> ({existingMatch.code}) — creating another
              product here would fail.
            </p>
            <div className="flex items-center gap-3">
              {onAdjustExisting && canAdjustInventory && (
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => {
                    onAdjustExisting(existingMatch)
                    onClose()
                  }}
                >
                  Add Stock For It
                </Button>
              )}
              {onEditExisting && (
                <button
                  type="button"
                  onClick={() => {
                    onEditExisting(existingMatch)
                    onClose()
                  }}
                  className="text-[11.5px] font-medium underline hover:no-underline"
                >
                  Edit its details instead
                </button>
              )}
            </div>
          </div>
        )}
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Category</label>
          <select
            value={form.categoryId}
            onChange={(e) => set('categoryId', e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {categories.length === 0 && <option value="">No categories yet</option>}
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!isEdit && <p className="col-span-2 -mt-1.5 text-[11px] text-ink-faint">SKU will be assigned automatically when the product is created.</p>}

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Unit</label>
          <select
            value={form.unit}
            onChange={(e) => set('unit', e.target.value as Unit)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {units.map((u) => (
              <option key={u.id} value={u.code}>
                {u.name} ({u.code})
              </option>
            ))}
          </select>
        </div>

        <TextField label="Low Stock Alert Quantity" value={form.lowStockLevel} onChange={(v) => set('lowStockLevel', v)} type="number" />

        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <label className="col-span-2 flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.expiryTracking} onChange={(e) => set('expiryTracking', e.target.checked)} />
          Track expiry dates for batches of this product
        </label>

        {!isEdit && (
          <>
            <div className="col-span-2 border-t border-border pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
              Initial Pricing
            </div>
            <TextField label="Purchase Cost" value={form.purchaseCost} onChange={(v) => set('purchaseCost', v)} type="number" />
            <TextField label="Selling Price" value={form.sellingPrice} onChange={(v) => set('sellingPrice', v)} type="number" />

            {hideOpeningStock ? (
              <p className="col-span-2 text-xs text-ink-faint">
                Stock quantity and expiry for this product's first batch will come from the purchase line you're adding it to.
              </p>
            ) : (
              <>
                <div className="col-span-2 border-t border-border pt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                  Opening Stock
                </div>
                <TextField
                  label={`Opening Quantity (${form.unit})`}
                  value={form.openingQuantity}
                  onChange={(v) => set('openingQuantity', v)}
                  type="number"
                />
                {form.expiryTracking && (
                  <TextField
                    label="Expiry Date"
                    value={form.openingExpiryDate}
                    onChange={(v) => set('openingExpiryDate', v)}
                    type="date"
                  />
                )}
                <p className="col-span-2 text-xs text-ink-faint">
                  Leave quantity blank or 0 to create the product with no stock yet — you can receive stock later from the Purchases screen.
                </p>
              </>
            )}
          </>
        )}
        {isEdit && (
          <p className="col-span-2 rounded bg-panel-alt px-2.5 py-1.5 text-xs text-ink-faint">
            To change pricing, open the product and use “Record Price Change” in the Price History tab — this keeps historical prices intact.
          </p>
        )}
      </form>
    </Modal>
  )
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  span2,
  autoFocus,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  span2?: boolean
  autoFocus?: boolean
}) {
  return (
    <div className={span2 ? 'col-span-2' : undefined}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoFocus={autoFocus}
        className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}
