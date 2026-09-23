import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useUserStore } from '@/store/userStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { User } from '@/types'

interface FormState {
  name: string
  username: string
  roleId: string
  counter: string
  status: 'active' | 'inactive'
  password: string
}

export function UserFormModal({ open, user, onClose }: { open: boolean; user: User | null; onClose: () => void }) {
  const roles = useUserStore((s) => s.roles)
  const addUser = useUserStore((s) => s.addUser)
  const updateUser = useUserStore((s) => s.updateUser)
  const pushToast = useUiStore((s) => s.pushToast)
  const isEdit = !!user

  const [form, setForm] = useState<FormState>({ name: '', username: '', roleId: roles[0]?.id ?? '', counter: '', status: 'active', password: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({ name: user.name, username: user.username, roleId: user.roleId, counter: user.counter ?? '', status: user.status, password: '' })
    } else {
      setForm({ name: '', username: '', roleId: roles[0]?.id ?? '', counter: '', status: 'active', password: '' })
    }
  }, [user, open, roles])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit() {
    if (submitting) return
    if (!form.name.trim() || !form.username.trim()) {
      pushToast('error', 'Name and username are required.')
      return
    }
    if (!isEdit && form.password.trim().length < 8) {
      pushToast('error', 'Password must be at least 8 characters.')
      return
    }
    if (isEdit && form.password.trim() && form.password.trim().length < 8) {
      pushToast('error', 'Password must be at least 8 characters.')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && user) {
        await updateUser(user.id, {
          name: form.name,
          username: form.username,
          roleId: form.roleId,
          counter: form.counter || undefined,
          status: form.status,
          password: form.password.trim() || undefined,
        })
        pushToast('success', 'User updated.')
      } else {
        await addUser({
          name: form.name,
          username: form.username,
          roleId: form.roleId,
          counter: form.counter || undefined,
          status: form.status,
          password: form.password.trim(),
        })
        pushToast('success', 'User created.')
      }
      onClose()
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to save user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit User' : 'Add User'}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Full Name</label>
          <input
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Username</label>
          <input
            value={form.username}
            onChange={(e) => set('username', e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Role</label>
          <select
            value={form.roleId}
            onChange={(e) => set('roleId', e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">
            {isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
          </label>
          <input
            type="password"
            value={form.password}
            onChange={(e) => set('password', e.target.value)}
            placeholder={isEdit ? '••••••••' : 'At least 8 characters'}
            autoComplete="new-password"
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Counter</label>
            <input
              value={form.counter}
              onChange={(e) => set('counter', e.target.value)}
              placeholder="e.g. Counter 1"
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Status</label>
            <select
              value={form.status}
              onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
              className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
