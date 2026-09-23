import { create } from 'zustand'
import type { Expense } from '@/types'
import { api, getAll } from '@/lib/api'

interface ApiExpense {
  id: number
  expense_date: string
  category_id: number
  category?: { name: string }
  description: string
  amount: string | number
  // Laravel's default serialization merges the loaded `createdBy` relation onto the same
  // `created_by` key as the raw FK column — so this is the full user object when loaded.
  created_by?: { name: string } | number | null
}

function toExpense(e: ApiExpense): Expense {
  return {
    id: String(e.id),
    date: e.expense_date,
    category: e.category?.name ?? '',
    description: e.description,
    amount: Number(e.amount),
    paidBy: typeof e.created_by === 'object' && e.created_by ? e.created_by.name : 'Unknown',
  }
}

interface ExpenseState {
  expenses: Expense[]
  loading: boolean
  fetchAll: () => Promise<void>
  addExpense: (expense: { date: string; categoryId: string; description: string; amount: number }) => Promise<void>
  voidExpense: (id: string) => Promise<void>
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const expenses = await getAll<ApiExpense>('/expenses')
    set({ expenses: expenses.map(toExpense), loading: false })
  },

  addExpense: async (expense) => {
    const created = toExpense(
      await api.post<ApiExpense>('/expenses', {
        expense_date: expense.date,
        category_id: expense.categoryId,
        description: expense.description,
        amount: expense.amount,
      }),
    )
    set((state) => ({ expenses: [created, ...state.expenses] }))
  },

  voidExpense: async (id) => {
    await api.patch(`/expenses/${id}/void`)
    set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) }))
  },
}))
