import { useMemo, useState } from 'react'
import { AlertTriangle, PackageX } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Batch } from '@/types'

type Row = Batch & { productName: string; productCode: string; lowStockLevel: number; productStock: number }

export function InventoryPage() {
  const products = useProductStore((s) => s.products)
  const batches = useInventoryStore((s) => s.batches)
  const getStock = useProductStore((s) => s.getStock)

  const [query, setQuery] = useState('')
  const [productId, setProductId] = useState('All')
  const [scope, setScope] = useState<'All' | 'Low Stock' | 'Expiring Soon' | 'Depleted'>('All')

  const rows: Row[] = useMemo(
    () =>
      batches.map((b) => {
        const product = products.find((p) => p.id === b.productId)
        return {
          ...b,
          productName: product?.name ?? 'Unknown',
          productCode: product?.code ?? '—',
          lowStockLevel: product?.lowStockLevel ?? 0,
          productStock: getStock(b.productId),
        }
      }),
    [batches, products, getStock],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = Date.now()
    return rows
      .filter((r) => (productId === 'All' ? true : r.productId === productId))
      .filter((r) => {
        if (!q) return true
        return r.productName.toLowerCase().includes(q) || r.productCode.toLowerCase().includes(q) || r.batchNo.toLowerCase().includes(q)
      })
      .filter((r) => {
        if (scope === 'All') return true
        if (scope === 'Depleted') return r.remaining === 0
        if (scope === 'Low Stock') return r.remaining > 0 && r.productStock <= r.lowStockLevel
        if (scope === 'Expiring Soon') return !!r.expiryDate && r.remaining > 0 && new Date(r.expiryDate).getTime() - now < 1000 * 60 * 60 * 24 * 10
        return true
      })
      .sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate))
  }, [rows, query, productId, scope])

  const lowStockCount = useMemo(
    () => products.filter((p) => p.status === 'active' && getStock(p.id) <= p.lowStockLevel).length,
    [products, getStock],
  )
  const expiringCount = useMemo(
    () =>
      batches.filter((b) => b.remaining > 0 && b.expiryDate && new Date(b.expiryDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 10)
        .length,
    [batches],
  )

  const columns: DataTableColumn<Row>[] = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => (
        <div>
          <div className="font-semibold text-ink">{r.productName}</div>
          <div className="text-[11px] text-ink-faint">{r.productCode}</div>
        </div>
      ),
    },
    { key: 'batchNo', header: 'Batch No.', render: (r) => r.batchNo },
    { key: 'supplier', header: 'Supplier', render: (r) => r.supplierName },
    { key: 'purchaseDate', header: 'Purchase Date', render: (r) => formatDate(r.purchaseDate) },
    {
      key: 'expiry',
      header: 'Expiry Date',
      render: (r) => {
        if (!r.expiryDate) return <span className="text-ink-faint">—</span>
        const soon = r.remaining > 0 && new Date(r.expiryDate).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 10
        return <span className={soon ? 'font-semibold text-danger' : 'text-ink'}>{formatDate(r.expiryDate)}</span>
      },
    },
    { key: 'cost', header: 'Purchase Cost', align: 'right', render: (r) => formatCurrency(r.cost) },
    { key: 'quantity', header: 'Purchased Qty', align: 'right', render: (r) => formatNumber(r.quantity) },
    {
      key: 'remaining',
      header: 'Remaining Qty',
      align: 'right',
      render: (r) => (
        <span className={clsxRemaining(r)}>
          {formatNumber(r.remaining)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) =>
        r.remaining === 0 ? (
          <StatusBadge tone="neutral">Depleted</StatusBadge>
        ) : r.productStock <= r.lowStockLevel ? (
          <StatusBadge tone="warning">Low Stock</StatusBadge>
        ) : (
          <StatusBadge tone="success">Available</StatusBadge>
        ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard icon={PackageX} label="Low Stock Products" value={lowStockCount} tone="warning" />
        <SummaryCard icon={AlertTriangle} label="Batches Expiring Soon" value={expiringCount} tone="danger" />
      </div>

      <FilterBar>
        <FilterField label="Search">
          <SearchBar value={query} onChange={setQuery} placeholder="Product, code or batch no." className="w-64" />
        </FilterField>
        <FilterField label="Product">
          <select value={productId} onChange={(e) => setProductId(e.target.value)} className={selectClass}>
            <option value="All">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FilterField>
        <FilterField label="View">
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={selectClass}>
            <option>All</option>
            <option>Low Stock</option>
            <option>Expiring Soon</option>
            <option>Depleted</option>
          </select>
        </FilterField>
      </FilterBar>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(r) => r.id} />
      </div>
    </div>
  )
}

function clsxRemaining(r: Row) {
  if (r.remaining === 0) return 'text-ink-faint'
  if (r.remaining < r.quantity * 0.2) return 'font-semibold text-warning'
  return 'font-semibold text-ink'
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof PackageX; label: string; value: number; tone: 'warning' | 'danger' }) {
  const toneClass = tone === 'warning' ? 'bg-warning-bg text-warning' : 'bg-danger-bg text-danger'
  return (
    <div className="flex items-center gap-3 rounded border border-border bg-panel p-3">
      <div className={`flex h-9 w-9 items-center justify-center rounded ${toneClass}`}>
        <Icon size={18} />
      </div>
      <div>
        <div className="text-[18px] font-bold text-ink">{value}</div>
        <div className="text-[11px] text-ink-faint">{label}</div>
      </div>
    </div>
  )
}
