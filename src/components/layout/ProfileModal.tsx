import { useEffect, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useAuthStore, useCurrentUser } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'

export function ProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user } = useCurrentUser()
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const changePassword = useAuthStore((s) => s.changePassword)
  const pushToast = useUiStore((s) => s.pushToast)

  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setUsername(user.username)
      setEmail(user.email ?? '')
      setPhone(user.phone ?? '')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }, [open, user])

  async function handleSaveProfile() {
    if (savingProfile) return
    if (!name.trim() || !username.trim()) {
      pushToast('error', 'Name and username are required.')
      return
    }
    const usernameChanged = username.trim() !== user?.username
    setSavingProfile(true)
    try {
      await updateProfile({ name: name.trim(), username: username.trim(), email: email.trim(), phone: phone.trim() })
      pushToast(
        'success',
        usernameChanged ? `Profile updated — your login username is now "${username.trim()}".` : 'Profile updated.',
      )
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to update profile.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleChangePassword() {
    if (savingPassword) return
    if (!currentPassword || !newPassword) {
      pushToast('error', 'Enter your current and new password.')
      return
    }
    if (newPassword.length < 8) {
      pushToast('error', 'New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      pushToast('error', 'New password and confirmation do not match.')
      return
    }
    setSavingPassword(true)
    try {
      await changePassword(currentPassword, newPassword)
      pushToast('success', 'Password changed.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to change password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <Modal open={open} title="My Profile" subtitle={user?.username} onClose={onClose} width="sm" footer={<Button variant="ghost" onClick={onClose}>Close</Button>}>
      <div className="space-y-4">
        <Section title="Profile Information">
          <Field label="Full Name" value={name} onChange={setName} />
          <Field label="Username (used to log in)" value={username} onChange={setUsername} />
          <Field label="Email (optional)" value={email} onChange={setEmail} type="email" />
          <Field label="Phone (optional)" value={phone} onChange={setPhone} />
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleSaveProfile} disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save Profile'}
            </Button>
          </div>
        </Section>

        <Section title="Change Password">
          <Field label="Current Password" value={currentPassword} onChange={setCurrentPassword} type="password" />
          <Field label="New Password" value={newPassword} onChange={setNewPassword} type="password" placeholder="At least 8 characters" />
          <Field label="Confirm New Password" value={confirmPassword} onChange={setConfirmPassword} type="password" />
          <div className="flex justify-end">
            <Button variant="primary" onClick={handleChangePassword} disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Change Password'}
            </Button>
          </div>
        </Section>
      </div>
    </Modal>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-panel-alt p-3">
      <div className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={type === 'password' ? 'new-password' : undefined}
        className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}
