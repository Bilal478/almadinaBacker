import { useEffect, useMemo, useState } from 'react'
import { Plus, Tags, XCircle } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { Button } from '@/components/common/Button'
import { Modal } from '@/components/common/Modal'
import { StatusBadge } from '@/components/common/StatusBadge'
import { ExpenseCategoriesModal } from '@/components/expenses/ExpenseCategoriesModal'
import { useExpenseStore } from '@/store/expenseStore'
import { useExpenseCategoryStore } from '@/store/expenseCategoryStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/format'
import { ApiError, apiErrorMessage } from '@/lib/api'
import type { Expense } from '@/types'

export function ExpensesPage() {
  const expenses = useExpenseStore((s) => s.expenses)
  const voidedExpenses = useExpenseStore((s) => s.voidedExpenses)
  const fetchExpenses = useExpenseStore((s) => s.fetchAll)
  const fetchVoided = useExpenseStore((s) => s.fetchVoided)
  const addExpense = useExpenseStore((s) => s.addExpense)
  const voidExpense = useExpenseStore((s) => s.voidExpense)
  const categories = useExpenseCategoryStore((s) => s.categories)
  const fetchCategories = useExpenseCategoryStore((s) => s.fetchAll)
  const addCategory = useExpenseCategoryStore((s) => s.addCategory)
  const pushToast = useUiStore((s) => s.pushToast)

  useEffect(() => {
    fetchExpenses()
    fetchVoided()
    fetchCategories()
  }, [fetchExpenses, fetchVoided, fetchCategories])

  const [from, setFrom] = useState('2026-01-01')
  const [to, setTo] = useState('2026-12-31')
  const [category, setCategory] = useState('All')
  const [status, setStatus] = useState<'active' | 'void' | 'all'>('active')
  const [formOpen, setFormOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  // Quick "+ New" category from inside the Add Expense form.
  const [quickCategory, setQuickCategory] = useState<string | null>(null)
  const [voidTarget, setVoidTarget] = useState<Expense | null>(null)
  const [voidReason, setVoidReason] = useState('')
  const [voiding, setVoiding] = useState(false)

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [expCategoryId, setExpCategoryId] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const filtered = useMemo(
    () =>
      (status === 'active' ? expenses : status === 'void' ? voidedExpenses : [...expenses, ...voidedExpenses])
        .filter((e) => e.date >= from && e.date <= to)
        .filter((e) => (category === 'All' ? true : e.category === category))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [expenses, voidedExpenses, status, from, to, category],
  )

  // Voided expenses never count towards the total, whatever the filter shows.
  const total = filtered.filter((e) => e.status === 'active').reduce((s, e) => s + e.amount, 0)
  const voidedTotal = filtered.filter((e) => e.status === 'void').reduce((s, e) => s + e.amount, 0)
  // Deactivated categories stay on old expenses and in the filter, but can't be picked for new ones.
  const activeCategories = categories.filter((c) => c.status === 'active')

  async function handleQuickCategory() {
    const name = quickCategory?.trim()
    if (!name) return
    try {
      const created = await addCategory(name)
      setExpCategoryId(created.id)
      setQuickCategory(null)
      pushToast('success', `Category "${created.name}" added.`)
    } catch (e) {
      pushToast('error', apiErrorMessage(e, 'Failed to add category.'))
    }
  }

  async function handleSubmit() {
    if (submitting) return
    const categoryId = activeCategories.some((c) => c.id === expCategoryId) ? expCategoryId : activeCategories[0]?.id
    if (!description.trim() || !Number(amount) || !categoryId) {
      pushToast('error', 'Category, description and amount are required.')
      return
    }
    setSubmitting(true)
    try {
      await addExpense({ date, categoryId, description, amount: Number(amount) })
      pushToast('success', 'Expense recorded.')
      fetchCategories() // refresh per-category expense counts (used/unused decides deletability)
      setDescription('')
      setAmount('')
      setFormOpen(false)
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to record expense.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleVoid() {
    if (!voidTarget || voiding) return
    setVoiding(true)
    try {
      await voidExpense(voidTarget.id, voidReason.trim())
      pushToast('success', 'Expense voided. You can still see it under Status: Voided.')
      fetchCategories() // a voided expense still counts as "using" its category
      setVoidTarget(null)
    } catch (e) {
      pushToast('error', apiErrorMessage(e, 'Failed to void expense.'))
    } finally {
      setVoiding(false)
    }
  }

  const showVoidDetails = status !== 'active'
  const muted = (e: Expense) => (e.status === 'void' ? 'text-ink-faint' : '')

  const columns: DataTableColumn<Expense>[] = [
    { key: 'date', header: 'Date', width: '120px', sortValue: (e) => e.date, render: (e) => <span className={muted(e)}>{formatDate(e.date)}</span> },
    { key: 'category', header: 'Category', sortValue: (e) => e.category, render: (e) => <span className={muted(e)}>{e.category}</span> },
    { key: 'description', header: 'Description', sortValue: (e) => e.description, render: (e) => <span className={muted(e)}>{e.description}</span> },
    { key: 'paidBy', header: 'Paid By', sortValue: (e) => e.paidBy, render: (e) => <span className={muted(e)}>{e.paidBy}</span> },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortValue: (e) => e.amount,
      render: (e) => (
        <span className={e.status === 'void' ? 'text-ink-faint line-through' : 'font-semibold'}>{formatCurrency(e.amount)}</span>
      ),
    },
    ...(showVoidDetails
      ? [
          {
            key: 'status',
            header: 'Status',
            sortValue: (e: Expense) => e.status,
            render: (e: Expense) => (
              <StatusBadge tone={e.status === 'active' ? 'success' : 'danger'}>{e.status === 'active' ? 'Active' : 'Voided'}</StatusBadge>
            ),
          },
          {
            key: 'voidDetails',
            header: 'Voided',
            sortValue: (e: Expense) => e.voidedAt,
            render: (e: Expense) =>
              e.status !== 'void' ? (
                <span className="text-ink-faint">—</span>
              ) : (
                <div className="text-[12px] leading-snug">
                  <div className="text-ink">
                    {e.voidedAt ? formatDateTime(e.voidedAt) : 'Date not recorded'}
                    {e.voidedBy && <span className="text-ink-faint"> · by {e.voidedBy}</span>}
                  </div>
                  {e.voidReason && <div className="text-ink-soft">Reason: {e.voidReason}</div>}
                </div>
              ),
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '90px',
      render: (e) =>
        e.status === 'active' ? (
          <button
            onClick={() => {
              setVoidTarget(e)
              setVoidReason('')
            }}
            className="mx-auto flex h-7 w-7 items-center justify-center rounded border border-border-strong text-ink-soft hover:border-danger hover:bg-danger-bg hover:text-danger"
            title="Void expense"
          >
            <XCircle size={14} />
          </button>
        ) : null,
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <FilterBar>
          <FilterField label="Date Range">
            <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />
          </FilterField>
          <FilterField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className={selectClass}>
              <option value="active">Active</option>
              <option value="void">Voided</option>
              <option value="all">All</option>
            </select>
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
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setCategoriesOpen(true)}>
            <Tags size={15} /> Categories
          </Button>
          <Button variant="primary" onClick={() => setFormOpen(true)}>
            <Plus size={15} /> Add Expense
          </Button>
        </div>
      </div>

      <div className="rounded border border-border bg-panel px-3 py-2 text-sm">
        <span className="text-ink-faint">Total for selected period: </span>
        <span className="font-bold text-ink">{formatCurrency(total)}</span>
        {showVoidDetails && voidedTotal > 0 && (
          <span className="ml-3 text-ink-faint">
            (voided, not counted: <span className="line-through">{formatCurrency(voidedTotal)}</span>)
          </span>
        )}
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
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Category</label>
                {quickCategory === null && (
                  <button type="button" onClick={() => setQuickCategory('')} className="text-[11px] font-semibold text-brand-700 hover:underline">
                    + New
                  </button>
                )}
              </div>
              {quickCategory === null ? (
                <select value={expCategoryId} onChange={(e) => setExpCategoryId(e.target.value)} className={selectClass + ' w-full'}>
                  {activeCategories.length === 0 && <option value="">No categories yet — click + New</option>}
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="flex gap-1">
                  <input
                    value={quickCategory}
                    onChange={(e) => setQuickCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleQuickCategory()
                      if (e.key === 'Escape') setQuickCategory(null)
                    }}
                    placeholder="New category"
                    className={selectClass + ' min-w-0 flex-1'}
                    autoFocus
                  />
                  <Button size="sm" variant="primary" onClick={handleQuickCategory} disabled={!quickCategory.trim()}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setQuickCategory(null)}>
                    ✕
                  </Button>
                </div>
              )}
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

      <ExpenseCategoriesModal open={categoriesOpen} onClose={() => setCategoriesOpen(false)} />

      <Modal
        open={!!voidTarget}
        title="Void Expense"
        subtitle={voidTarget ? `${voidTarget.description} · ${formatCurrency(voidTarget.amount)}` : undefined}
        onClose={() => setVoidTarget(null)}
        width="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setVoidTarget(null)} disabled={voiding}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleVoid} disabled={voiding}>
              {voiding ? 'Voiding…' : 'Void Expense'}
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-soft">
          It will be removed from totals and reports, but kept in history — see it any time under <strong>Status: Voided</strong>.
        </p>
        <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Reason (optional)</label>
        <input
          value={voidReason}
          onChange={(e) => setVoidReason(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleVoid()}
          placeholder="e.g. Entered twice, wrong amount"
          maxLength={255}
          className={selectClass + ' w-full'}
          autoFocus
        />
      </Modal>
    </div>
  )
}
