import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { ToastHost } from '@/components/common/ToastHost'

export function AppLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-app-bg text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main className="min-h-0 flex-1 overflow-auto p-3">
          <Outlet />
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
