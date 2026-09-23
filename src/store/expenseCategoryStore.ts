import { create } from 'zustand'
import { api, getAll } from '@/lib/api'

export interface ExpenseCategory {
  id: string
  name: string
  status: 'active' | 'inactive'
}

interface ApiExpenseCategory {
  id: number
  name: string
  status: 'active' | 'inactive'
}

function normalize(c: ApiExpenseCategory): ExpenseCategory {
  return { id: String(c.id), name: c.name, status: c.status }
}

interface ExpenseCategoryState {
  categories: ExpenseCategory[]
  loading: boolean
  fetchAll: () => Promise<void>
  addCategory: (name: string) => Promise<ExpenseCategory>
}

export const useExpenseCategoryStore = create<ExpenseCategoryState>((set) => ({
  categories: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const categories = await getAll<ApiExpenseCategory>('/expense-categories')
    set({ categories: categories.map(normalize), loading: false })
  },

  addCategory: async (name) => {
    const created = normalize(await api.post<ApiExpenseCategory>('/expense-categories', { name }))
    set((state) => ({ categories: [...state.categories, created] }))
    return created
  },
}))
