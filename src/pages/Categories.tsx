import { useEffect, useMemo, useState } from 'react'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useCategoryStore } from '@/store/categoryStore'
import { useProductStore } from '@/store/productStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { Category } from '@/types'

export function CategoriesPage() {
  const categories = useCategoryStore((s) => s.categories)
  const fetchCategories = useCategoryStore((s) => s.fetchAll)
  const addCategory = useCategoryStore((s) => s.addCategory)
  const updateCategory = useCategoryStore((s) => s.updateCategory)
  const setCategoryStatus = useCategoryStore((s) => s.setCategoryStatus)
  const products = useProductStore((s) => s.products)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<Category | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, query])

  function openCreate() {
    setEditing(null)
    setName('')
    setDescription('')
    setFormOpen(true)
  }

  function openEdit(c: Category) {
    setEditing(c)
    setName(c.name)
    setDescription(c.description ?? '')
    setFormOpen(true)
  }

  async function handleSubmit() {
    if (submitting) return
    if (!name.trim()) {
      pushToast('error', 'Category name is required.')
      return
    }
    const duplicate = categories.some((c) => c.name.toLowerCase() === name.trim().toLowerCase() && c.id !== editing?.id)
    if (duplicate) {
      pushToast('error', `Category "${name}" already exists.`)
      return
    }
    setSubmitting(true)
    try {
      if (editing) {
        await updateCategory(editing.id, { name: name.trim(), description: description.trim() || undefined })
        pushToast('success', 'Category updated.')
      } else {
        await addCategory({ name: name.trim(), description: description.trim() || undefined })
        pushToast('success', 'Category added.')
      }
      setFormOpen(false)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to save category.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: DataTableColumn<Category>[] = [
    { key: 'name', header: 'Category Name', render: (c) => <span className="font-semibold text-ink">{c.name}</span> },
    { key: 'description', header: 'Description', render: (c) => c.description || <span className="text-ink-faint">—</span> },
    { key: 'count', header: 'Products Using It', align: 'right', render: (c) => products.filter((p) => p.categoryId === c.id).length },
    { key: 'status', header: 'Status', render: (c) => <StatusBadge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</StatusBadge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (c) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton title="Edit" onClick={() => openEdit(c)}>
            <Pencil size={14} />
          </IconButton>
          <IconButton title={c.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => setToggleTarget(c)}>
            {c.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
          </IconButton>
        </div>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <SearchBar value={query} onChange={setQuery} placeholder="Search categories" className="w-64" />
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} /> Add Category
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(c) => c.id} />
      </div>

      <Modal
        open={formOpen}
        title={editing ? 'Edit Category' : 'Add Category'}
        onClose={() => setFormOpen(false)}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Category Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Bread"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Description (optional)</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Loaves, baguettes, rolls"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate Category' : 'Activate Category'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"? ${
          toggleTarget?.status === 'active' ? 'It will no longer be selectable for new products.' : ''
        }`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={async () => {
          if (toggleTarget) {
            try {
              await setCategoryStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
            } catch (e) {
              pushToast('error', e instanceof ApiError ? e.message : 'Failed to update category status.')
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
