import { create } from 'zustand'
import { api, getAll } from '@/lib/api'

export interface ExpenseCategory {
  id: string
  name: string
  status: 'active' | 'inactive'
  /** How many expenses use it — a used category can only be deactivated, not deleted. */
  expenseCount: number
}

interface ApiExpenseCategory {
  id: number
  name: string
  status: 'active' | 'inactive'
  expenses_count?: number
}

function normalize(c: ApiExpenseCategory): ExpenseCategory {
  return { id: String(c.id), name: c.name, status: c.status, expenseCount: c.expenses_count ?? 0 }
}

function byName(a: ExpenseCategory, b: ExpenseCategory) {
  return a.name.localeCompare(b.name)
}

interface ExpenseCategoryState {
  categories: ExpenseCategory[]
  loading: boolean
  fetchAll: () => Promise<void>
  addCategory: (name: string) => Promise<ExpenseCategory>
  updateCategory: (id: string, name: string) => Promise<void>
  setCategoryStatus: (id: string, status: ExpenseCategory['status']) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
}

export const useExpenseCategoryStore = create<ExpenseCategoryState>((set) => {
  const replace = (updated: ExpenseCategory) =>
    set((state) => ({ categories: state.categories.map((c) => (c.id === updated.id ? updated : c)).sort(byName) }))

  return {
    categories: [],
    loading: false,

    fetchAll: async () => {
      set({ loading: true })
      const categories = await getAll<ApiExpenseCategory>('/expense-categories')
      set({ categories: categories.map(normalize).sort(byName), loading: false })
    },

    addCategory: async (name) => {
      const created = normalize(await api.post<ApiExpenseCategory>('/expense-categories', { name }))
      set((state) => ({ categories: [...state.categories, created].sort(byName) }))
      return created
    },

    updateCategory: async (id, name) => {
      replace(normalize(await api.put<ApiExpenseCategory>(`/expense-categories/${id}`, { name })))
    },

    setCategoryStatus: async (id, status) => {
      replace(normalize(await api.patch<ApiExpenseCategory>(`/expense-categories/${id}/status`, { status })))
    },

    deleteCategory: async (id) => {
      await api.del(`/expense-categories/${id}`)
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id) }))
    },
  }
})
