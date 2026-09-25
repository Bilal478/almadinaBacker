import { forwardRef, useEffect, useState } from 'react'
import { Plus, Search } from 'lucide-react'
import type { Product } from '@/types'

interface ProductLineComboboxProps {
  products: Product[]
  value: string
  onChange: (product: Product) => void
  onCreateNew: (query: string) => void
  /** Fired after Enter resolves to a product (scan or single-match) — caller focuses the next field (Quantity). */
  onResolved?: () => void
}

function labelFor(p: Product) {
  return `${p.name} (${p.code})`
}

export const ProductLineCombobox = forwardRef<HTMLInputElement, ProductLineComboboxProps>(function ProductLineCombobox(
  { products, value, onChange, onCreateNew, onResolved },
  ref,
) {
  const selected = products.find((p) => p.id === value)
  const [query, setQuery] = useState(selected ? labelFor(selected) : '')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const current = products.find((p) => p.id === value)
    setQuery(current ? labelFor(current) : '')
  }, [value, products])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q))
    : products
  const exactMatch = filtered.some((p) => labelFor(p).toLowerCase() === q)

  function selectProduct(p: Product) {
    onChange(p)
    setQuery(labelFor(p))
    setOpen(false)
  }

  // A scanner types the barcode and sends Enter within milliseconds — this is the same
  // "exact match on Enter" pattern the POS search box uses, just wired to the Quantity field
  // afterward instead of the cart.
  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const raw = query.trim()
    if (!raw) return

    const exactByCode = products.find((p) => p.barcode === raw || p.code.toLowerCase() === raw.toLowerCase())
    if (exactByCode) {
      selectProduct(exactByCode)
      onResolved?.()
      return
    }

    if (filtered.length === 1) {
      selectProduct(filtered[0])
      onResolved?.()
      return
    }

    if (filtered.length === 0) {
      // Nothing matches at all — most likely an unregistered barcode. Hand it straight to
      // "add new product" instead of making the operator click the dropdown option.
      onCreateNew(raw)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          ref={ref}
          value={query}
          onFocus={(e) => {
            setOpen(true)
            // Selecting existing text means a scan (or fresh typing) replaces it instead of
            // appending onto whatever product was already chosen for this line.
            e.target.select()
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search or scan barcode…"
          className="w-full rounded border border-border-strong bg-panel py-1 pl-6 pr-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded border border-border bg-panel shadow-lg">
          {filtered.length === 0 && (
            <div className="px-2.5 py-2 text-xs text-ink-faint">No products match "{query}".</div>
          )}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectProduct(p)}
              className="flex w-full flex-col items-start px-2.5 py-1.5 text-left text-sm hover:bg-brand-50"
            >
              <span className="font-medium text-ink">{p.name}</span>
              <span className="text-[11px] text-ink-faint">
                {p.code}
                {p.barcode && <> &middot; {p.barcode}</>}
              </span>
            </button>
          ))}
          {query.trim() && !exactMatch && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onCreateNew(query.trim())
                setOpen(false)
              }}
              className="flex w-full items-center gap-1.5 border-t border-border px-2.5 py-1.5 text-left text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              <Plus size={13} />
              Add "{query.trim()}" as new product
            </button>
          )}
        </div>
      )}
    </div>
  )
})
