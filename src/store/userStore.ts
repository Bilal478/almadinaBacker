import { create } from 'zustand'
import type { PermissionKey, Role, User, UserStatus } from '@/types'
import { api, getAll } from '@/lib/api'

interface ApiUser {
  id: number
  name: string
  username: string
  role_id: number
  role_name?: string
  status: UserStatus
  counter: string | null
  permissions?: PermissionKey[]
}

interface ApiRole {
  id: number
  name: string
  description: string | null
  is_system: boolean
  permissions?: PermissionKey[]
  user_count?: number
}

function toUser(u: ApiUser): User {
  return {
    id: String(u.id),
    name: u.name,
    username: u.username,
    roleId: String(u.role_id),
    status: u.status,
    counter: u.counter ?? undefined,
  }
}

function toRole(r: ApiRole): Role {
  return {
    id: String(r.id),
    name: r.name,
    description: r.description ?? '',
    permissions: r.permissions ?? [],
    isSystem: r.is_system,
    userCount: r.user_count,
  }
}

interface UserState {
  users: User[]
  roles: Role[]
  loading: boolean

  fetchAll: () => Promise<void>

  getRole: (id: string) => Role | undefined
  getUser: (id: string) => User | undefined
  roleHasPermission: (roleId: string, permission: PermissionKey) => boolean

  addUser: (user: { name: string; username: string; roleId: string; counter?: string; status?: UserStatus; password: string }) => Promise<void>
  updateUser: (
    id: string,
    patch: { name?: string; username?: string; roleId?: string; counter?: string; status?: UserStatus; password?: string },
  ) => Promise<void>
  setUserStatus: (id: string, status: UserStatus) => Promise<void>

  addRole: (role: { name: string; description?: string; permissions: PermissionKey[] }) => Promise<void>
  updateRole: (id: string, patch: { name?: string; description?: string; permissions?: PermissionKey[] }) => Promise<void>
  deleteRole: (id: string) => Promise<void>
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  roles: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const [users, roles] = await Promise.all([getAll<ApiUser>('/users'), getAll<ApiRole>('/roles')])
    set({ users: users.map(toUser), roles: roles.map(toRole), loading: false })
  },

  getRole: (id) => get().roles.find((r) => r.id === id),
  getUser: (id) => get().users.find((u) => u.id === id),
  roleHasPermission: (roleId, permission) => {
    const role = get().getRole(roleId)
    return role ? role.permissions.includes(permission) : false
  },

  addUser: async (user) => {
    const created = toUser(
      await api.post<ApiUser>('/users', {
        name: user.name,
        username: user.username,
        role_id: user.roleId,
        counter: user.counter,
        status: user.status ?? 'active',
        password: user.password,
      }),
    )
    set((state) => ({ users: [...state.users, created] }))
  },
  updateUser: async (id, patch) => {
    const updated = toUser(
      await api.put<ApiUser>(`/users/${id}`, {
        name: patch.name,
        username: patch.username,
        role_id: patch.roleId,
        counter: patch.counter,
        status: patch.status,
        password: patch.password || undefined,
      }),
    )
    set((state) => ({ users: state.users.map((u) => (u.id === id ? updated : u)) }))
  },
  setUserStatus: async (id, status) => {
    const updated = toUser(await api.patch<ApiUser>(`/users/${id}/status`, { status }))
    set((state) => ({ users: state.users.map((u) => (u.id === id ? updated : u)) }))
  },

  addRole: async (role) => {
    const created = toRole(await api.post<ApiRole>('/roles', role))
    set((state) => ({ roles: [...state.roles, created] }))
  },
  updateRole: async (id, patch) => {
    const updated = toRole(await api.put<ApiRole>(`/roles/${id}`, patch))
    set((state) => ({ roles: state.roles.map((r) => (r.id === id ? updated : r)) }))
  },
  deleteRole: async (id) => {
    await api.del(`/roles/${id}`)
    set((state) => ({ roles: state.roles.filter((r) => r.id !== id) }))
  },
}))
