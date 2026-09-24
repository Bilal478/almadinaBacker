import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { SupplierFormModal } from '@/components/suppliers/SupplierFormModal'
import { useSupplierStore } from '@/store/supplierStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency } from '@/lib/format'
import type { Supplier } from '@/types'

export function SuppliersPage() {
  const suppliers = useSupplierStore((s) => s.suppliers)
  const supplierTypes = useSupplierStore((s) => s.supplierTypes)
  const fetchSuppliers = useSupplierStore((s) => s.fetchAll)
  const getOutstanding = useSupplierStore((s) => s.getOutstanding)
  const setSupplierStatus = useSupplierStore((s) => s.setSupplierStatus)
  const pushToast = useUiStore((s) => s.pushToast)
  const navigate = useNavigate()

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const [query, setQuery] = useState('')
  const [typeId, setTypeId] = useState('All')
  const [status, setStatus] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Supplier | null>(null)
  const [toggleTarget, setToggleTarget] = useState<Supplier | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return suppliers.filter((s) => {
      if (typeId !== 'All' && s.supplierTypeId !== typeId) return false
      if (status !== 'All' && s.status !== status) return false
      if (!q) return true
      return s.name.toLowerCase().includes(q) || s.phone.includes(q)
    })
  }, [suppliers, query, typeId, status])

  const columns: DataTableColumn<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier Name',
      render: (s) => (
        <button onClick={() => navigate(`/supplier-payments?supplierId=${s.id}`)} className="text-left font-semibold text-ink hover:text-brand-700 hover:underline">
          {s.name}
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', render: (s) => s.phone },
    { key: 'address', header: 'Address', render: (s) => <span className="text-ink-soft">{s.address}</span> },
    { key: 'type', header: 'Supplier Type', render: (s) => supplierTypes.find((t) => t.id === s.supplierTypeId)?.name ?? '—' },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge tone={s.status === 'active' ? 'success' : 'neutral'}>{s.status}</StatusBadge> },
    {
      key: 'balance',
      header: 'Current Balance',
      align: 'right',
      render: (s) => {
        const bal = getOutstanding(s.id)
        return <span className={bal > 0 ? 'font-bold text-danger' : 'text-ink-faint'}>{formatCurrency(bal)}</span>
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (s) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title="View Ledger" onClick={() => navigate(`/supplier-payments?supplierId=${s.id}`)}>
            <Eye size={14} />
          </IconButton>
          <IconButton
            title="Edit"
            onClick={() => {
              setEditing(s)
              setFormOpen(true)
            }}
          >
            <Pencil size={14} />
          </IconButton>
          <IconButton title={s.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(s)}>
            {s.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <FilterBar>
          <FilterField label="Search">
            <SearchBar value={query} onChange={setQuery} placeholder="Supplier name or phone" className="w-64" />
          </FilterField>
          <FilterField label="Supplier Type">
            <select value={typeId} onChange={(e) => setTypeId(e.target.value)} className={selectClass}>
              <option value="All">All Types</option>
              {supplierTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
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
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={15} /> Add Supplier
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(s) => s.id} />
      </div>

      <SupplierFormModal open={formOpen} supplier={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate Supplier' : 'Activate Supplier'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) {
            setSupplierStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
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
