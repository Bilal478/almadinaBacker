import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut, Monitor } from 'lucide-react'
import { NAV_ITEMS } from '@/components/layout/navConfig'
import { useAuthStore, useCurrentUser } from '@/store/authStore'
import { formatDate, formatTime } from '@/lib/format'

function currentTitle(pathname: string): string {
  const match = NAV_ITEMS.find((item) => (item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)))
  return match?.label ?? 'Bakery POS'
}

export function TopBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, role } = useCurrentUser()
  const logout = useAuthStore((s) => s.logout)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-panel px-4">
      <div className="text-[14px] font-semibold text-ink">{currentTitle(location.pathname)}</div>

      <div className="flex items-center gap-4 text-[12px] text-ink-soft">
        {user?.counter && (
          <span className="flex items-center gap-1.5 rounded border border-border bg-panel-alt px-2 py-1">
            <Monitor size={13} />
            {user.counter}
          </span>
        )}
        <div className="text-right leading-tight">
          <div className="font-medium text-ink">{user?.name ?? 'Guest'}</div>
          <div className="text-[10.5px] text-ink-faint">{role?.name}</div>
        </div>
        <div className="text-right leading-tight border-l border-border pl-4">
          <div className="font-medium text-ink tabular-nums">{formatTime(now)}</div>
          <div className="text-[10.5px] text-ink-faint">{formatDate(now.toISOString())}</div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded border border-border-strong px-2.5 py-1.5 font-medium text-ink-soft hover:bg-panel-alt hover:text-danger"
        >
          <LogOut size={14} />
          Logout
        </button>
      </div>
    </header>
  )
}
