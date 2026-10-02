import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { Product } from '@/types'

interface ProductSearchSelectProps {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  /** Shown as a pinned first entry — e.g. {value: 'All', label: 'All Products'} for a filter. Omit for a required single-product picker. */
  allOption?: { value: string; label: string }
  placeholder?: string
  className?: string
}

function labelFor(p: Product) {
  return `${p.name} (${p.code})`
}

/**
 * A searchable replacement for a plain `<select>` of products — a native dropdown stops being
 * usable once a catalog grows past a couple dozen items (no way to jump to an item by typing
 * its name or code), which this app's product lists regularly do. Matches on name, product
 * code/SKU (e.g. "PRD-001"), and barcode.
 */
export function ProductSearchSelect({ products, value, onChange, allOption, placeholder, className }: ProductSearchSelectProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (allOption && value === allOption.value) {
      setQuery(allOption.label)
      return
    }
    const selected = products.find((p) => p.id === value)
    setQuery(selected ? labelFor(selected) : '')
  }, [value, products, allOption])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q))
  }, [products, query])

  function select(productId: string, label: string) {
    onChange(productId)
    setQuery(label)
    setOpen(false)
  }

  return (
    <div className={`relative ${className ?? ''}`}>
      <div className="relative">
        <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onFocus={(e) => {
            setOpen(true)
            e.target.select()
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Search by name or code…'}
          className="w-full rounded border border-border-strong bg-panel py-1.5 pl-7 pr-2 text-sm outline-none focus:border-brand-500"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full min-w-[220px] overflow-y-auto rounded border border-border bg-panel shadow-lg">
          {allOption && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(allOption.value, allOption.label)}
              className="flex w-full items-center px-2.5 py-1.5 text-left text-sm font-medium text-ink hover:bg-brand-50"
            >
              {allOption.label}
            </button>
          )}
          {filtered.length === 0 && <div className="px-2.5 py-2 text-xs text-ink-faint">No products match "{query}".</div>}
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(p.id, labelFor(p))}
              className="flex w-full flex-col items-start border-t border-border px-2.5 py-1.5 text-left text-sm first:border-t-0 hover:bg-brand-50"
            >
              <span className="font-medium text-ink">{p.name}</span>
              <span className="text-[11px] text-ink-faint">
                {p.code} &middot; {p.barcode}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
