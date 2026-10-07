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
  status?: 'active' | 'void'
  voided_at?: string | null
  // Same Laravel quirk as created_by: the loaded voidedBy relation lands on the voided_by key.
  voided_by?: { name: string } | number | null
  void_reason?: string | null
}

function userName(value: { name: string } | number | null | undefined): string | null {
  return typeof value === 'object' && value ? value.name : null
}

function toExpense(e: ApiExpense): Expense {
  return {
    id: String(e.id),
    date: e.expense_date,
    category: e.category?.name ?? '',
    description: e.description,
    amount: Number(e.amount),
    paidBy: userName(e.created_by) ?? 'Unknown',
    status: e.status ?? 'active',
    voidedAt: e.voided_at ?? null,
    voidedBy: userName(e.voided_by),
    voidReason: e.void_reason ?? null,
  }
}

interface ExpenseState {
  /** Active expenses only — Reports totals read this, so voided ones must never land here. */
  expenses: Expense[]
  /** Void history, loaded separately for the Expenses page's status filter. */
  voidedExpenses: Expense[]
  loading: boolean
  fetchAll: () => Promise<void>
  fetchVoided: () => Promise<void>
  addExpense: (expense: { date: string; categoryId: string; description: string; amount: number }) => Promise<void>
  voidExpense: (id: string, reason?: string) => Promise<void>
}

export const useExpenseStore = create<ExpenseState>((set) => ({
  expenses: [],
  voidedExpenses: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const expenses = await getAll<ApiExpense>('/expenses')
    set({ expenses: expenses.map(toExpense), loading: false })
  },

  fetchVoided: async () => {
    const voided = await getAll<ApiExpense>('/expenses?status=void')
    set({ voidedExpenses: voided.map(toExpense) })
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

  voidExpense: async (id, reason) => {
    const voided = toExpense(await api.patch<ApiExpense>(`/expenses/${id}/void`, { reason: reason || undefined }))
    set((state) => ({
      expenses: state.expenses.filter((e) => e.id !== id),
      voidedExpenses: [voided, ...state.voidedExpenses],
    }))
  },
}))
