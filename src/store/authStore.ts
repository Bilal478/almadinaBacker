import { create } from 'zustand'
import type { PermissionKey } from '@/types'
import { api, ApiError, setToken } from '@/lib/api'

interface AuthUser {
  id: string
  name: string
  username: string
  counter: string | null
  roleId: string
  roleName: string
  permissions: PermissionKey[]
}

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'loading' | 'ready'
  /** Checks for an existing token (e.g. after a page refresh) — call once on app boot. */
  init: () => Promise<void>
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  hasPermission: (permission: PermissionKey) => boolean
}

interface RawUser {
  id: number
  name: string
  username: string
  counter: string | null
  role_id: number
  role_name: string
  permissions: PermissionKey[]
}

function normalizeUser(raw: RawUser): AuthUser {
  return {
    id: String(raw.id),
    name: raw.name,
    username: raw.username,
    counter: raw.counter,
    roleId: String(raw.role_id),
    roleName: raw.role_name,
    permissions: raw.permissions,
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: 'idle',

  init: async () => {
    set({ status: 'loading' })
    try {
      const user = await api.get<RawUser>('/auth/me')
      set({ user: normalizeUser(user), status: 'ready' })
    } catch {
      setToken(null)
      set({ user: null, status: 'ready' })
    }
  },

  login: async (username, password) => {
    try {
      const { user, token } = await api.post<{ user: RawUser; token: string }>('/auth/login', { username, password })
      setToken(token)
      set({ user: normalizeUser(user), status: 'ready' })
      return true
    } catch (e) {
      if (e instanceof ApiError) return false
      throw e
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setToken(null)
      set({ user: null })
    }
  },

  hasPermission: (permission) => {
    const { user } = get()
    return user ? user.permissions.includes(permission) : false
  },
}))

export function useCurrentUser() {
  const user = useAuthStore((s) => s.user)
  const role = user ? { name: user.roleName, permissions: user.permissions } : undefined
  return { user: user ?? undefined, role }
}
