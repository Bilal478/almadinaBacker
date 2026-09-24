import { useEffect, useState } from 'react'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { PermissionMatrix } from '@/components/common/PermissionMatrix'
import { useUserStore } from '@/store/userStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { PermissionKey, Role } from '@/types'

export function RolesPage() {
  const roles = useUserStore((s) => s.roles)
  const users = useUserStore((s) => s.users)
  const fetchUsers = useUserStore((s) => s.fetchAll)
  const addRole = useUserStore((s) => s.addRole)
  const updateRole = useUserStore((s) => s.updateRole)
  const deleteRole = useUserStore((s) => s.deleteRole)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [permissions, setPermissions] = useState<PermissionKey[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null)

  function openCreate() {
    setEditing(null)
    setName('')
    setDescription('')
    setPermissions([])
    setFormOpen(true)
  }

  function openEdit(role: Role) {
    setEditing(role)
    setName(role.name)
    setDescription(role.description)
    setPermissions(role.permissions)
    setFormOpen(true)
  }

  function togglePermission(key: PermissionKey) {
    setPermissions((p) => (p.includes(key) ? p.filter((k) => k !== key) : [...p, key]))
  }

  async function handleSubmit() {
    if (!name.trim()) {
      pushToast('error', 'Role name is required.')
      return
    }
    try {
      if (editing) {
        await updateRole(editing.id, { name, description, permissions })
        pushToast('success', 'Role updated.')
      } else {
        await addRole({ name, description, permissions })
        pushToast('success', 'Role created.')
      }
      setFormOpen(false)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to save role.')
    }
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-end">
        <Button variant="primary" onClick={openCreate}>
          <Plus size={15} /> Add Role
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto md:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => {
          const userCount = users.filter((u) => u.roleId === role.id).length
          return (
            <div key={role.id} className="flex flex-col rounded border border-border bg-panel p-3">
              <div className="mb-1 flex items-start justify-between">
                <div className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
                  {role.name}
                  {role.isSystem && (
                    <span title="System role">
                      <Lock size={12} className="text-ink-faint" />
                    </span>
                  )}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(role)} className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-panel-alt hover:text-ink">
                    <Pencil size={13} />
                  </button>
                  {!role.isSystem && (
                    <button
                      onClick={() => setDeleteTarget(role)}
                      className="flex h-6 w-6 items-center justify-center rounded text-ink-faint hover:bg-danger-bg hover:text-danger"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>
              <p className="mb-2 text-xs text-ink-faint">{role.description}</p>
              <div className="mt-auto flex items-center justify-between text-[11px] text-ink-soft">
                <span>{role.permissions.length} permissions</span>
                <span>
                  {userCount} user{userCount !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <Modal
        open={formOpen}
        title={editing ? `Edit Role — ${editing.name}` : 'Add Role'}
        onClose={() => setFormOpen(false)}
        width="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Save Role
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Role Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={editing?.isSystem}
                className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500 disabled:bg-panel-alt disabled:text-ink-faint"
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
          <PermissionMatrix selected={permissions} onToggle={togglePermission} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Role"
        message={`Delete "${deleteTarget?.name}"? Users assigned to this role should be reassigned first.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await deleteRole(deleteTarget.id)
            } catch (e) {
              pushToast('error', e instanceof ApiError ? e.message : 'Failed to delete role.')
            }
          }
          setDeleteTarget(null)
        }}
      />
    </div>
  )
}
