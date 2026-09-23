import { useMemo, useState } from 'react'
import { Eye, Plus } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { StatusBadge, type BadgeTone } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { PurchaseFormModal } from '@/components/purchases/PurchaseFormModal'
import { useSupplierStore } from '@/store/supplierStore'
import { useProductStore } from '@/store/productStore'
import { formatCurrency, formatDate } from '@/lib/format'
import type { Purchase } from '@/types'

const STATUS_TONE: Record<Purchase['status'], BadgeTone> = { paid: 'success', partial: 'warning', pending: 'danger' }

export function PurchasesPage() {
  const purchases = useSupplierStore((s) => s.purchases)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const getSupplier = useSupplierStore((s) => s.getSupplier)
  const getProduct = useProductStore((s) => s.getProduct)

  const [query, setQuery] = useState('')
  const [supplierId, setSupplierId] = useState('All')
  const [status, setStatus] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [viewing, setViewing] = useState<Purchase | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return purchases.filter((p) => {
      if (supplierId !== 'All' && p.supplierId !== supplierId) return false
      if (status !== 'All' && p.status !== status) return false
      if (!q) return true
      return p.invoiceNo.toLowerCase().includes(q)
    })
  }, [purchases, query, supplierId, status])

  const columns: DataTableColumn<Purchase>[] = [
    { key: 'invoiceNo', header: 'Invoice No.', render: (p) => <span className="font-semibold text-ink">{p.invoiceNo}</span> },
    { key: 'supplier', header: 'Supplier', render: (p) => getSupplier(p.supplierId)?.name ?? '—' },
    { key: 'date', header: 'Date', render: (p) => formatDate(p.date) },
    { key: 'items', header: 'Items', align: 'right', render: (p) => p.items.length },
    { key: 'total', header: 'Total Purchase', align: 'right', render: (p) => formatCurrency(p.totalAmount) },
    { key: 'paid', header: 'Paid Amount', align: 'right', render: (p) => formatCurrency(p.paidAmount) },
    {
      key: 'remaining',
      header: 'Remaining',
      align: 'right',
      render: (p) => {
        const remaining = p.totalAmount - p.paidAmount
        return <span className={remaining > 0 ? 'font-bold text-danger' : 'text-ink-faint'}>{formatCurrency(remaining)}</span>
      },
    },
    { key: 'status', header: 'Status', render: (p) => <StatusBadge tone={STATUS_TONE[p.status]}>{p.status}</StatusBadge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (p) => (
        <button
          title="View"
          onClick={() => setViewing(p)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt hover:text-ink"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <FilterBar>
          <FilterField label="Search">
            <SearchBar value={query} onChange={setQuery} placeholder="Invoice number" className="w-56" />
          </FilterField>
          <FilterField label="Supplier">
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={selectClass}>
              <option value="All">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </FilterField>
          <FilterField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass}>
              <option value="All">All</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </FilterField>
        </FilterBar>
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Record Purchase
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(p) => p.id} />
      </div>

      <PurchaseFormModal open={formOpen} onClose={() => setFormOpen(false)} />

      <Modal open={!!viewing} title={viewing?.invoiceNo ?? ''} subtitle={viewing ? getSupplier(viewing.supplierId)?.name : undefined} onClose={() => setViewing(null)} width="lg">
        {viewing && (
          <div className="space-y-3">
            <div className="rounded border border-border">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 border-b border-border bg-panel-alt px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
                <div>Product</div>
                <div className="text-right">Qty</div>
                <div>Batch</div>
                <div className="text-right">Cost</div>
                <div className="text-right">Line Total</div>
              </div>
              {viewing.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 border-b border-border px-2.5 py-1.5 text-sm last:border-b-0">
                  <div>{getProduct(item.productId)?.name ?? item.productId}</div>
                  <div className="text-right">
                    {item.quantity} {item.unit}
                  </div>
                  <div className="text-ink-faint">{item.batchNo}</div>
                  <div className="text-right">{formatCurrency(item.cost)}</div>
                  <div className="text-right font-semibold">{formatCurrency(item.cost * item.quantity)}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3 rounded border border-border bg-panel-alt p-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">Total</div>
                <div className="text-[15px] font-bold text-ink">{formatCurrency(viewing.totalAmount)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">Paid</div>
                <div className="text-[15px] font-bold text-success">{formatCurrency(viewing.paidAmount)}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-wide text-ink-faint">Remaining</div>
                <div className="text-[15px] font-bold text-danger">{formatCurrency(viewing.totalAmount - viewing.paidAmount)}</div>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
