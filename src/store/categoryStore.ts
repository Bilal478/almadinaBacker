import { create } from 'zustand'
import type { Category } from '@/types'
import { api, getAll } from '@/lib/api'

interface ApiCategory {
  id: number
  name: string
  description: string | null
  status: Category['status']
}

function normalize(c: ApiCategory): Category {
  return { id: String(c.id), name: c.name, description: c.description ?? undefined, status: c.status }
}

interface CategoryState {
  categories: Category[]
  loading: boolean
  fetchAll: () => Promise<void>
  addCategory: (payload: { name: string; description?: string }) => Promise<Category>
  updateCategory: (id: string, payload: { name: string; description?: string }) => Promise<Category>
  setCategoryStatus: (id: string, status: Category['status']) => Promise<Category>
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const categories = await getAll<ApiCategory>('/categories')
    set({ categories: categories.map(normalize), loading: false })
  },

  addCategory: async (payload) => {
    const created = normalize(await api.post<ApiCategory>('/categories', payload))
    set((state) => ({ categories: [...state.categories, created] }))
    return created
  },

  updateCategory: async (id, payload) => {
    const updated = normalize(await api.put<ApiCategory>(`/categories/${id}`, payload))
    set((state) => ({ categories: state.categories.map((c) => (c.id === id ? updated : c)) }))
    return updated
  },

  setCategoryStatus: async (id, status) => {
    const updated = normalize(await api.patch<ApiCategory>(`/categories/${id}/status`, { status }))
    set((state) => ({ categories: state.categories.map((c) => (c.id === id ? updated : c)) }))
    return updated
  },
}))
