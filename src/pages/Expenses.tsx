import { useEffect, useMemo, useState } from 'react'
import { Plus, XCircle } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { useExpenseStore } from '@/store/expenseStore'
import { useExpenseCategoryStore } from '@/store/expenseCategoryStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatDate } from '@/lib/format'
import { ApiError } from '@/lib/api'
import type { Expense } from '@/types'

export function ExpensesPage() {
  const expenses = useExpenseStore((s) => s.expenses)
  const fetchExpenses = useExpenseStore((s) => s.fetchAll)
  const addExpense = useExpenseStore((s) => s.addExpense)
  const voidExpense = useExpenseStore((s) => s.voidExpense)
  const categories = useExpenseCategoryStore((s) => s.categories)
  const fetchCategories = useExpenseCategoryStore((s) => s.fetchAll)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    fetchExpenses()
    fetchCategories()
  }, [fetchExpenses, fetchCategories])

  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-12-31')
  const [category, setCategory] = useState('All')
  const [formOpen, setFormOpen] = useState(false)
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [expCategoryId, setExpCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(
    () =>
      expenses
        .filter((e) => e.date >= from && e.date <= to)
        .filter((e) => (category === 'All' ? true : e.category === category))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, from, to, category],
  )

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  async function handleSubmit() {
    if (submitting) return
    const categoryId = expCategoryId || categories[0]?.id
    if (!description.trim() || !Number(amount) || !categoryId) {
      pushToast('error', 'Category, description and amount are required.')
      return
    }
    setSubmitting(true)
    try {
      await addExpense({ date, categoryId, description, amount: Number(amount) })
      pushToast('success', 'Expense recorded.')
      setDescription('')
      setAmount('')
      setFormOpen(false)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to record expense.')
    } finally {
      setSubmitting(false)
    }
  }

  const columns: DataTableColumn<Expense>[] = [
    { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
    { key: 'category', header: 'Category', render: (e) => e.category },
    { key: 'description', header: 'Description', render: (e) => e.description },
    { key: 'paidBy', header: 'Paid By', render: (e) => e.paidBy },
    { key: 'amount', header: 'Amount', align: 'right', render: (e) => <span className="font-semibold">{formatCurrency(e.amount)}</span> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      render: (e) => (
        <button
          onClick={() => setVoidTarget(e)}
          className="flex h-7 w-7 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-danger-bg hover:text-danger"
          title="Void expense"
        >
          <XCircle size={14} />
        </button>
      ),
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <FilterBar>
          <FilterField label="Date Range">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </FilterField>
          <FilterField label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectClass}>
              <option value="All">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </FilterField>
        </FilterBar>
        <Button variant="primary" onClick={() => setFormOpen(true)}>
          <Plus size={15} /> Add Expense
        </Button>
      </div>

      <div className="rounded border border-border bg-panel px-3 py-2 text-sm">
        <span className="text-ink-faint">Total for selected period: </span>
        <span className="font-bold text-ink">{formatCurrency(total)}</span>
      </div>

      <div className="min-h-0 flex-1">
        <DataTable columns={columns} rows={filtered} keyField={(e) => e.id} />
      </div>

      <Modal
        open={formOpen}
        title="Add Expense"
        onClose={() => setFormOpen(false)}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Expense'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={selectClass + ' w-full'} />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Category</label>
              <select value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)} className={selectClass + ' w-full'}>
                {categories.length === 0 && <option value="">No categories yet</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className={selectClass + ' w-full'} />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Amount</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={selectClass + ' w-full'} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!voidTarget}
        title="Void Expense"
        message={`Void "${voidTarget?.description}"? This removes it from active reports but keeps it in history.`}
        confirmLabel="Void"
        danger
        onCancel={() => setVoidTarget(null)}
        onConfirm={() => {
          if (voidTarget) voidExpense(voidTarget.id)
          setVoidTarget(null)
        }}
      />
    </div>
  )
}
