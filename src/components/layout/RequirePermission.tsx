import { ShieldAlert } from 'lucide-react'
import type { PermissionKey } from '@/types'
import { useAuthStore } from '@/store/authStore'

export function RequirePermission({ permission, children }: { permission: PermissionKey; children: React.ReactNode }) {
  const allowed = useAuthStore((s) => s.hasPermission(permission))

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 rounded border border-border bg-panel py-16 text-center">
        <ShieldAlert size={32} className="text-ink-faint" />
        <div className="text-sm font-semibold text-ink">Access restricted</div>
        <div className="text-xs text-ink-faint">Your role does not have permission to view this module.</div>
      </div>
    )
  }

  return <>{children}</>
}
