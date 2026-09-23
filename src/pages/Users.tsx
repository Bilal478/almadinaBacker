import { useMemo, useState } from 'react'
import { Pencil, Plus, Power, PowerOff } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { SearchBar } from '@/components/common/SearchBar'
import { StatusBadge } from '@/components/common/StatusBadge'
import { Button } from '@/components/common/Button'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserFormModal } from '@/components/users/UserFormModal'
import { useUserStore } from '@/store/userStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { User } from '@/types'

export function UsersPage() {
  const users = useUserStore((s) => s.users)
  const roles = useUserStore((s) => s.roles)
  const setUserStatus = useUserStore((s) => s.setUserStatus)
  const pushToast = useUiStore((s) => s.pushToast)

  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [toggleTarget, setToggleTarget] = useState<User | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q))
  }, [users, query])

  const columns: DataTableColumn<User>[] = [
    { key: 'name', header: 'Name', render: (u) => <span className="font-semibold text-ink">{u.name}</span> },
    { key: 'username', header: 'Username', render: (u) => u.username },
    { key: 'role', header: 'Role', render: (u) => roles.find((r) => r.id === u.roleId)?.name ?? '—' },
    { key: 'counter', header: 'Counter', render: (u) => u.counter ?? <span className="text-ink-faint">—</span> },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge tone={u.status === 'active' ? 'success' : 'neutral'}>{u.status}</StatusBadge> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (u) => (
        <div className="flex items-center justify-center gap-1">
          <IconButton
            title="Edit"
            onClick={() => {
              setEditing(u)
              setFormOpen(true)
            }}
          >
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
        <SearchBar value={query} onChange={setQuery} placeholder="Name or username" className="w-64" />
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus size={15} /> Add User
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(u) => u.id} />
      </div>

      <UserFormModal open={formOpen} user={editing} onClose={() => setFormOpen(false)} />
      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${toggleTarget?.status === 'active' ? 'deactivate' : 'activate'} "${toggleTarget?.name}"?`}
        confirmLabel={toggleTarget?.status === 'active' ? 'Deactivate' : 'Activate'}
        danger={toggleTarget?.status === 'active'}
        onCancel={() => setToggleTarget(null)}
        onConfirm={async () => {
          if (toggleTarget) {
            try {
              await setUserStatus(toggleTarget.id, toggleTarget.status === 'active' ? 'inactive' : 'active')
              pushToast('success', `${toggleTarget.name} ${toggleTarget.status === 'active' ? 'deactivated' : 'activated'}.`)
            } catch (e) {
              pushToast('error', e instanceof ApiError ? e.message : 'Failed to update user status.')
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
