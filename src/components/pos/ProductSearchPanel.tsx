import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Search, ScanLine } from 'lucide-react'
import clsx from 'clsx'
import { useProductStore } from '@/store/productStore'
import { useCartStore } from '@/store/cartStore'
import { useUiStore } from '@/store/uiStore'
import { ProductResultRow } from '@/components/pos/ProductResultRow'

/** True when a keystroke on this element is meant for it (typing into a field), so the
 *  scanner redirect below must leave it alone. */
function isTextEntry(el: Element | null): boolean {
  if (!el) return false
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true
  if (el instanceof HTMLInputElement) return !['button', 'submit', 'reset', 'checkbox', 'radio'].includes(el.type)
  return (el as HTMLElement).isContentEditable
}

export const ProductSearchPanel = forwardRef<HTMLInputElement, object>(function ProductSearchPanel(_props, ref) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement)
  const [category, setCategory] = useState<string>('All')
  const products = useProductStore((s) => s.products)
  const addProduct = useCartStore((s) => s.addProduct)
  const pushToast = useUiStore((s) => s.pushToast)

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products])

  const active = useMemo(() => products.filter((p) => p.status === 'active'), [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return active.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q)
    })
  }, [active, category, query])

  // A barcode/QR scanner is just a keyboard: it types into whatever has focus. Once the cashier
  // clicks a product row or a payment button, focus leaves the search box and a scan would
  // otherwise go nowhere. So any printable key that isn't aimed at a text field pulls focus
  // back here — the first character is inserted by hand (it was already dispatched to the old
  // element), the rest of the scan and its closing Enter then arrive natively.
  // Skipped while a dialog is open, so a scan never adds to the cart hidden behind a modal.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.key.length !== 1) return
      const input = inputRef.current
      const activeEl = document.activeElement
      if (!input || activeEl === input || isTextEntry(activeEl)) return
      if (document.querySelector('[aria-modal="true"]')) return
      // Space on a focused button is a click, not the start of a scan.
      if (e.key === ' ' && activeEl instanceof HTMLButtonElement) return

      e.preventDefault()
      input.focus()
      // Starts a fresh query rather than appending to leftover text, which would turn the
      // scanned code into a search that matches nothing. flushSync so the input already holds
      // this character before the scanner's next keystroke lands a few ms later.
      flushSync(() => setQuery(e.key))
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    const q = query.trim().toLowerCase()
    if (!q) return

    const exactBarcode = active.find((p) => p.barcode === query.trim())
    const exactCode = active.find((p) => p.code.toLowerCase() === q)
    const match = exactBarcode ?? exactCode

    if (match) {
      addProduct(match)
      setQuery('')
      return
    }

    if (filtered.length === 1) {
      addProduct(filtered[0])
      setQuery('')
      return
    }

    if (filtered.length === 0) {
      pushToast('warning', `No product found for "${query}"`)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded border border-border bg-panel">
      <div className="flex items-center gap-2 border-b border-border p-2.5">
        <div className="relative flex-1">
          <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, SKU or scan barcode... (F2)"
            className="w-full rounded border border-border-strong bg-panel py-2 pl-8 pr-8 text-[13px] font-medium text-ink outline-none placeholder:text-ink-faint placeholder:font-normal focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
          />
          <ScanLine size={16} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border px-2.5 py-1.5">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={clsx(
              'shrink-0 rounded px-2.5 py-1 text-[11.5px] font-medium transition-colors',
              category === c ? 'bg-brand-600 text-white' : 'bg-panel-alt text-ink-soft hover:bg-border',
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b border-border bg-panel-alt px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
        <div>Product</div>
        <div className="w-20 text-center">Stock</div>
        <div className="w-24 text-right">Price</div>
        <div className="w-14 text-right">Unit</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-ink-faint">
            No products match your search.
          </div>
        )}
        {filtered.map((p) => (
          <ProductResultRow key={p.id} product={p} />
        ))}
      </div>
    </div>
  )
})
