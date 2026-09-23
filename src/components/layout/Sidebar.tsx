import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { NAV_ITEMS } from '@/components/layout/navConfig'
import { useAuthStore } from '@/store/authStore'
import { useSettingsStore } from '@/store/settingsStore'

export function Sidebar() {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const storeName = useSettingsStore((s) => s.settings?.storeName) || 'Bakery POS'
  const initials = storeName
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <aside className="flex h-full w-52 shrink-0 flex-col bg-navy-900 text-slate-200">
      <div className="flex h-12 items-center gap-2 border-b border-white/10 px-3">
        <div className="flex h-7 w-7 items-center justify-center rounded bg-brand-500 text-[13px] font-bold text-white">
          {initials}
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-semibold text-white">{storeName}</div>
          <div className="text-[10px] text-slate-400">Point of Sale</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.filter((item) => !item.permission || hasPermission(item.permission)).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              clsx(
                'mx-2 mb-0.5 flex items-center gap-2.5 rounded px-2.5 py-2 text-[13px] font-medium transition-colors',
                isActive ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
              )
            }
          >
            <item.icon size={16} strokeWidth={2} className="shrink-0" />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-2 text-[10px] text-slate-500">
        {storeName} POS
      </div>
    </aside>
  )
}
