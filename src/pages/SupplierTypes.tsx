import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useSupplierStore } from '@/store/supplierStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { SupplierType } from '@/types'

export function SupplierTypesPage() {
  const supplierTypes = useSupplierStore((s) => s.supplierTypes)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const fetchSuppliers = useSupplierStore((s) => s.fetchAll)
  const addSupplierType = useSupplierStore((s) => s.addSupplierType)
  const updateSupplierType = useSupplierStore((s) => s.updateSupplierType)
  const setSupplierTypeStatus = useSupplierStore((s) => s.setSupplierTypeStatus)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<SupplierType | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [toggleTarget, setToggleTarget] = useState<SupplierType | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return supplierTypes
    return supplierTypes.filter((t) => t.name.toLowerCase().includes(q))
  }, [supplierTypes, query])

  function openCreate() {
    setEditing(null)
    setName('')
    setDescription('')
    setFormOpen(true)
  }

  function openEdit(t: SupplierType) {
    setEditing(t)
    setName(t.name)
    setDescription(t.description ?? '')
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (!name.trim()) {
      pushToast('error', 'Supplier type name is required.')
      return
    }
    try {
      if (editing) {
        await updateSupplierType(editing.id, { name, description })
        pushToast('success', 'Supplier type updated.')
      } else {
        await addSupplierType({ name, description })
        pushToast('success', 'Supplier type added.')
      }
      setFormOpen(false)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to save supplier type.')
    }
  }

  const columns: DataTableColumn<SupplierType>[] = [
    { key: 'name', header: 'Supplier Type', render: (t) => <span className="font-semibold text-ink">{t.name}</span> },
    { key: 'description', header: 'Description', render: (t) => <span className="text-ink-soft">{t.description ?? '—'}</span> },
    { key: 'count', header: 'Suppliers', align: 'right', render: (t) => suppliers.filter((s) => s.supplierTypeId === t.id).length },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={t.status === 'active' ? 'success' : 'neutral'}>{t.status}</StatusBadge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (t) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title="Edit" onClick={() => openEdit(t)}>
            <Pencil size={14} />
          </IconButton>
          <IconButton title={t.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(t)}>
            {t.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search supplier types" className="w-64" />
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} /> Add Supplier Type
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(t) => t.id} />
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit Supplier Type' : 'Add Supplier Type'}
        onClose={() => setFormOpen(false)}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate Supplier Type' : 'Activate Supplier Type'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={async () => {
          if (toggleTarget) {
            try {
              await setSupplierTypeStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
            } catch (e) {
              pushToast('error', e instanceof ApiError ? e.message : 'Failed to update supplier type.')
            }
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
