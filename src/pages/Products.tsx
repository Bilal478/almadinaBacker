import { useMemo, useState } from 'react'
import { Eye, Pencil, Plus, PowerOff, Power } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { ProductFormModal } from '@/components/products/ProductFormModal'
import { ProductDetailModal } from '@/components/products/ProductDetailModal'
import { useProductStore } from '@/store/productStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Product } from '@/types'

export function ProductsPage() {
  const products = useProductStore((s) => s.products)
  const getCurrentPrice = useProductStore((s) => s.getCurrentPrice)
  const getStock = useProductStore((s) => s.getStock)
  const getNearestExpiry = useProductStore((s) => s.getNearestExpiry)
  const setProductStatus = useProductStore((s) => s.setProductStatus)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const pushToast = useUiStore((s) => s.pushToast)
  const canManage = hasPermission('manage_products')
  const canViewCost = hasPermission('view_purchase_cost')

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState('All')

  const [formOpen, setFormOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Product | null>(null)

  const categories = useMemo(() => ['All', ...Array.from(new Set(products.map((p) => p.category)))], [products])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return products.filter((p) => {
      if (category !== 'All' && p.category !== category) return false
      if (status !== 'All' && p.status !== status) return false
      if (!q) return true
      return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.barcode.includes(q)
    })
  }, [products, query, category, status])

  const columns: DataTableColumn<Product>[] = [
    { key: 'code', header: 'Product Code', render: (p) => <span className="font-medium text-ink">{p.code}</span> },
    {
      key: 'name',
      header: 'Product Name',
      render: (p) => (
        <button onClick={() => setViewingProduct(p)} className="text-left font-semibold text-ink hover:text-brand-700 hover:underline">
          {p.name}
        </button>
      ),
    },
    { key: 'unit', header: 'Unit', render: (p) => p.unit },
    {
      key: 'stock',
      header: 'Current Stock',
      align: 'right',
      render: (p) => {
        const stock = getStock(p.id)
        const low = stock <= p.lowStockLevel
        return <span className={low ? 'font-semibold text-warning' : 'text-ink'}>{formatNumber(stock)}</span>
      },
    },
    ...(canViewCost
      ? [{ key: 'cost', header: 'Purchase Cost', align: 'right' as const, render: (p: Product) => formatCurrency(getCurrentPrice(p.id)?.purchaseCost ?? 0) }]
      : []),
    { key: 'customerPrice', header: 'Customer Price', align: 'right', render: (p) => formatCurrency(getCurrentPrice(p.id)?.customerPrice ?? 0) },
    { key: 'retailerPrice', header: 'Retailer Price', align: 'right', render: (p) => formatCurrency(getCurrentPrice(p.id)?.retailerPrice ?? 0) },
    {
      key: 'expiry',
      header: 'Expiry',
      render: (p) => {
        const expiry = getNearestExpiry(p.id)
        if (!expiry) return <span className="text-ink-faint">—</span>
        const soon = new Date(expiry).getTime() - Date.now() < 1000 * 60 * 60 * 24 * 7
        return <span className={soon ? 'font-semibold text-danger' : 'text-ink'}>{formatDate(expiry)}</span>
      },
    },
    { key: 'lowStockLevel', header: 'Low Stock Level', align: 'right', render: (p) => formatNumber(p.lowStockLevel) },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusBadge tone={p.status === 'active' ? 'success' : 'neutral'}>{p.status}</StatusBadge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (p) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title="View" onClick={() => setViewingProduct(p)}>
            <Eye size={14} />
          </IconButton>
          {canManage && (
            <>
              <IconButton
                title="Edit"
                onClick={() => {
                  setEditingProduct(p)
                  setFormOpen(true)
                }}
              >
                <Pencil size={14} />
              </IconButton>
              <IconButton title={p.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(p)}>
                {p.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
              </IconButton>
            </>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <FilterBar>
          <FilterField label="Search">
            <SearchBar value={query} onChange={setQuery} placeholder="Name, SKU or barcode" className="w-64" />
          </FilterField>
          <FilterField label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="All">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FilterField>
        </FilterBar>
        {canManage && (
          <Button
            variant="primary"
            onClick={() => {
              setEditingProduct(null)
              setFormOpen(true)
            }}
          >
            <Plus size={15} /> Add Product
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(p) => p.id} />
      </div>

      <ProductFormModal open={formOpen} product={editingProduct} onClose={() => setFormOpen(false)} />
      <ProductDetailModal product={viewingProduct} onClose={() => setViewingProduct(null)} />
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate Product' : 'Activate Product'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) {
            setProductStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
            pushToast('success', `${toggleTarget.name} ${toggleTarget.status === 'active' ? 'deactivated' : 'activated'}.`)
          }
          setToggleTarget(null)
        }}
      />
    </div>
  )
}

function IconButton({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: () => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt hover:text-ink"
    >
      {children}
    </button>
  )
}
