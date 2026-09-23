import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export function RequireAuth() {
  const user = useAuthStore((s) => s.user)
  const status = useAuthStore((s) => s.status)

  if (status !== 'ready') return null
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
