import { useMemo, useState } from 'react'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useUnitStore } from '@/store/unitStore'
import { useProductStore } from '@/store/productStore'
import { useUiStore } from '@/store/uiStore'
import type { UnitOfMeasure } from '@/types'

export function UnitsPage() {
  const units = useUnitStore((s) => s.units)
  const addUnit = useUnitStore((s) => s.addUnit)
  const updateUnit = useUnitStore((s) => s.updateUnit)
  const setUnitStatus = useUnitStore((s) => s.setUnitStatus)
  const products = useProductStore((s) => s.products)
  const pushToast = useUiStore((s) => s.pushToast)

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UnitOfMeasure | null>(null)
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [toggleTarget, setToggleTarget] = useState<UnitOfMeasure | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return units
    return units.filter((u) => u.name.toLowerCase().includes(q) || u.code.toLowerCase().includes(q))
  }, [units, query])

  function openCreate() {
    setEditing(null)
    setCode('')
    setName('')
    setFormOpen(true)
  }

  function openEdit(u: UnitOfMeasure) {
    setEditing(u)
    setCode(u.code)
    setName(u.name)
    setFormOpen(true)
  }

  function handleSubmit() {
    if (!code.trim() || !name.trim()) {
      pushToast('error', 'Unit code and name are required.')
      return
    }
    const duplicate = units.some((u) => u.code.toLowerCase() === code.trim().toLowerCase() && u.id !== editing?.id)
    if (duplicate) {
      pushToast('error', `Unit code "${code}" already exists.`)
      return
    }
    if (editing) {
      updateUnit(editing.id, { code: code.trim(), name: name.trim() })
      pushToast('success', 'Unit updated.')
    } else {
      addUnit({ code: code.trim(), name: name.trim() })
      pushToast('success', 'Unit added.')
    }
    setFormOpen(false)
  }

  const columns: DataTableColumn<UnitOfMeasure>[] = [
    { key: 'code', header: 'Code', render: (u) => <span className="font-semibold text-ink">{u.code}</span> },
    { key: 'name', header: 'Unit Name', render: (u) => u.name },
    { key: 'count', header: 'Products Using It', align: 'right', render: (u) => products.filter((p) => p.unit === u.code).length },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge tone={u.status === 'active' ? 'success' : 'neutral'}>{u.status}</StatusBadge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (u) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title="Edit" onClick={() => openEdit(u)}>
            <Pencil size={14} />
          </IconButton>
          <IconButton title={u.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(u)}>
            {u.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search units" className="w-64" />
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} /> Add Unit
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(u) => u.id} />
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit Unit' : 'Add Unit'}
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
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Code</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. tray"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
            <p className="mt-1 text-[11px] text-ink-faint">Short code stored on products — keep it stable once products use it.</p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Unit Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tray"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate Unit' : 'Activate Unit'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"? ${
          toggleTarget?.status === 'active' ? 'It will no longer be selectable for new products.' : ''
        }`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={() => {
          if (toggleTarget) {
            setUnitStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
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
