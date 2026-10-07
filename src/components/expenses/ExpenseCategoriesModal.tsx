import { useState } from 'react'
import { Check, Pencil, Plus, Power, PowerOff, Trash2, X } from 'lucide-react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { StatusBadge } from '@/components/common/StatusBadge'
import { selectClass } from '@/components/common/FilterBar'
import { useExpenseCategoryStore, type ExpenseCategory } from '@/store/expenseCategoryStore'
import { useUiStore } from '@/store/uiStore'
import { apiErrorMessage } from '@/lib/api'

/**
 * Add / rename / activate-deactivate / delete expense categories, right from the Expenses page.
 * A category already used by expenses can't be deleted (that would orphan them and break the
 * expense reports) — it can be deactivated instead, which hides it from the Add Expense dropdown
 * while keeping it on old expenses.
 */
export function ExpenseCategoriesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const categories = useExpenseCategoryStore((s) => s.categories)
  const addCategory = useExpenseCategoryStore((s) => s.addCategory)
  const updateCategory = useExpenseCategoryStore((s) => s.updateCategory)
  const setCategoryStatus = useExpenseCategoryStore((s) => s.setCategoryStatus)
  const deleteCategory = useExpenseCategoryStore((s) => s.deleteCategory)
  const pushToast = useUiStore((s) => s.pushToast)

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<ExpenseCategory | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(action: () => Promise<unknown>, success: string, failure: string) {
    if (busy) return false
    setBusy(true)
    try {
      await action()
      pushToast('success', success)
      return true
    } catch (e) {
      pushToast('error', apiErrorMessage(e, failure))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    if (await run(() => addCategory(name), `Category "${name}" added.`, 'Failed to add category.')) setNewName('')
  }

  async function handleRename(category: ExpenseCategory) {
    const name = editName.trim()
    if (!name || name === category.name) {
      setEditingId(null)
      return
    }
    if (await run(() => updateCategory(category.id, name), 'Category renamed.', 'Failed to rename category.')) setEditingId(null)
  }

  return (
    <>
      <Modal
        open={open}
        title="Expense Categories"
        subtitle="Add, rename, deactivate or delete the categories used for expenses"
        onClose={onClose}
        width="md"
        footer={
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        }
      >
        <div className="mb-3 flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="New category name, e.g. Electricity, Rent, Salaries"
            className={selectClass + ' flex-1'}
            autoFocus
          />
          <Button variant="primary" onClick={handleAdd} disabled={busy || !newName.trim()}>
            <Plus size={14} /> Add
          </Button>
        </div>

        <div className="max-h-[50vh] overflow-auto rounded border border-border">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-panel-alt">
              <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                <th className="border-b border-border px-3 py-2 text-left">Name</th>
                <th className="border-b border-border px-3 py-2 text-right">Expenses</th>
                <th className="border-b border-border px-3 py-2 text-left">Status</th>
                <th className="border-b border-border px-3 py-2 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-ink-faint">
                    No categories yet — add your first one above.
                  </td>
                </tr>
              )}
              {categories.map((c) => (
                <tr key={c.id} className="border-b border-border last:border-b-0">
                  <td className="px-3 py-2">
                    {editingId === c.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRename(c)
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        className={selectClass + ' w-full'}
                        autoFocus
                      />
                    ) : (
                      <span className="font-medium text-ink">{c.name}</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-ink-soft">{c.expenseCount}</td>
                  <td className="px-3 py-2">
                    <StatusBadge tone={c.status === 'active' ? 'success' : 'neutral'}>{c.status}</StatusBadge>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      {editingId === c.id ? (
                        <>
                          <IconButton title="Save" onClick={() => handleRename(c)}>
                            <Check size={14} />
                          </IconButton>
                          <IconButton title="Cancel" onClick={() => setEditingId(null)}>
                            <X size={14} />
                          </IconButton>
                        </>
                      ) : (
                        <IconButton
                          title="Rename"
                          onClick={() => {
                            setEditingId(c.id)
                            setEditName(c.name)
                          }}
                        >
                          <Pencil size={14} />
                        </IconButton>
                      )}
                      <IconButton
                        title={c.status === 'active' ? 'Deactivate (hide from new expenses)' : 'Activate'}
                        onClick={() =>
                          run(
                            () => setCategoryStatus(c.id, c.status === 'active' ? 'inactive' : 'active'),
                            `${c.name} ${c.status === 'active' ? 'deactivated' : 'activated'}.`,
                            'Failed to update category.',
                          )
                        }
                      >
                        {c.status === 'active' ? <PowerOff size={14} /> : <Power size={14} />}
                      </IconButton>
                      <IconButton
                        title={c.expenseCount > 0 ? 'Used by expenses — deactivate it instead' : 'Delete'}
                        onClick={() => setDeleteTarget(c)}
                        disabled={c.expenseCount > 0}
                        danger
                      >
                        <Trash2 size={14} />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Expense Category"
        message={`Delete "${deleteTarget?.name}"? This can't be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          const target = deleteTarget
          setDeleteTarget(null)
          if (target) await run(() => deleteCategory(target.id), `${target.name} deleted.`, 'Failed to delete category.')
        }}
      />
    </>
  )
}

function IconButton({
  children,
  title,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode
  title: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={
        (danger
          ? 'border-border-strong text-ink-soft hover:border-danger hover:bg-danger-bg hover:text-danger'
          : 'border-border-strong text-ink-soft hover:bg-panel-alt hover:text-ink') +
        ' flex h-7 w-7 items-center justify-center rounded border disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'
      }
    >
      {children}
    </button>
  )
}
