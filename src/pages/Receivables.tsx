import { useCallback, useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Eye, HandCoins, RefreshCw } from 'lucide-react'
import { DataTable, type DataTableColumn } from '@/components/common/DataTable'
import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { SearchBar } from '@/components/common/SearchBar'
import { Button } from '@/components/common/Button'
import { StatusBadge, type BadgeTone } from '@/components/common/StatusBadge'
import { SaleDetailModal } from '@/components/pos/SaleDetailModal'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { ReceivePaymentModal } from '@/components/receivables/ReceivePaymentModal'
import { useSalesStore, type CreditSaleFilter } from '@/store/salesStore'
import { useUiStore } from '@/store/uiStore'
import { apiErrorMessage } from '@/lib/api'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Sale, SalePaymentStatus } from '@/types'

const STATUS_BADGE: Record<SalePaymentStatus, { tone: BadgeTone; label: string }> = {
  unpaid: { tone: 'warning', label: 'Unpaid' },
  partial: { tone: 'info', label: 'Partly Paid' },
  paid: { tone: 'success', label: 'Paid' },
}

interface CustomerBalance {
  key: string
  name: string
  phone?: string
  invoices: number
  balanceDue: number
  oldestDate: string
}

const paidSoFar = (s: Sale) => s.payments.reduce((sum, p) => sum + p.amount, 0)

/** Whole days since the sale date — how long the customer has owed it. */
function daysOutstanding(date: string): number {
  const today = new Date(new Date().toISOString().slice(0, 10))
  return Math.max(0, Math.round((today.getTime() - new Date(date).getTime()) / 86_400_000))
}

export function ReceivablesPage() {
  const creditSales = useSalesStore((s) => s.creditSales)
  const loading = useSalesStore((s) => s.creditLoading)
  const fetchCreditSales = useSalesStore((s) => s.fetchCreditSales)
  const pushToast = useUiStore((s) => s.pushToast)

  const [status, setStatus] = useState<CreditSaleFilter>('outstanding')
  const [view, setView] = useState<'invoices' | 'customers'>('invoices')
  const [search, setSearch] = useState('')
  const [detailSale, setDetailSale] = useState<Sale | null>(null)
  const [paySale, setPaySale] = useState<Sale | null>(null)
  const [printSale, setPrintSale] = useState<Sale | null>(null)

  const load = useCallback(() => {
    fetchCreditSales(status).catch((e) => pushToast('error', apiErrorMessage(e, 'Failed to load pay-later invoices.')))
  }, [status, fetchCreditSales, pushToast])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return creditSales
    return creditSales.filter((s) =>
      [s.customerName, s.customerPhone, s.invoiceNo].some((v) => v?.toLowerCase().includes(term)),
    )
  }, [creditSales, search])

  const owing = filtered.filter((s) => s.balanceDue > 0)
  const totalDue = owing.reduce((sum, s) => sum + s.balanceDue, 0)

  const customers = useMemo(() => {
    const map = new Map<string, CustomerBalance>()
    for (const s of filtered) {
      if (s.balanceDue <= 0) continue
      const name = s.customerName?.trim() || 'Unknown'
      const key = name.toLowerCase()
      const row = map.get(key) ?? { key, name, phone: undefined, invoices: 0, balanceDue: 0, oldestDate: s.date }
      row.invoices += 1
      row.balanceDue += s.balanceDue
      row.phone ??= s.customerPhone
      if (s.date < row.oldestDate) row.oldestDate = s.date
      map.set(key, row)
    }
    return [...map.values()].sort((a, b) => b.balanceDue - a.balanceDue)
  }, [filtered])

  const oldestDays = owing.length ? Math.max(...owing.map((s) => daysOutstanding(s.date))) : 0

  // The list and the open detail modal both show the same sale — keep the modal in step
  // after a payment instead of showing the pre-payment balance.
  function handleReceived(updated: Sale) {
    if (detailSale?.id === updated.id) setDetailSale(updated)
    if (status === 'outstanding' && updated.balanceDue <= 0) load()
  }

  const invoiceColumns: DataTableColumn<Sale>[] = [
    { key: 'invoice', header: 'Invoice', sortValue: (s) => s.invoiceNo, render: (s) => <span className="font-semibold">{s.invoiceNo}</span> },
    { key: 'date', header: 'Date', width: '110px', sortValue: (s) => s.date, render: (s) => formatDate(s.date) },
    {
      key: 'customer',
      header: 'Customer',
      sortValue: (s) => s.customerName?.toLowerCase(),
      render: (s) => (
        <div className="leading-tight">
          <div className="font-medium">{s.customerName}</div>
          {s.customerPhone && <div className="text-[11px] text-ink-faint">{s.customerPhone}</div>}
        </div>
      ),
    },
    { key: 'total', header: 'Bill Total', align: 'right', sortValue: (s) => s.grandTotal, render: (s) => formatCurrency(s.grandTotal) },
    { key: 'paid', header: 'Paid', align: 'right', sortValue: paidSoFar, render: (s) => formatCurrency(paidSoFar(s)) },
    {
      key: 'balance',
      header: 'Balance Due',
      align: 'right',
      sortValue: (s) => s.balanceDue,
      render: (s) => <span className={clsx('font-bold', s.balanceDue > 0 ? 'text-warning' : 'text-ink-faint')}>{formatCurrency(s.balanceDue)}</span>,
    },
    {
      key: 'age',
      header: 'Days',
      align: 'right',
      sortValue: (s) => (s.balanceDue > 0 ? daysOutstanding(s.date) : null),
      render: (s) => (s.balanceDue > 0 ? formatNumber(daysOutstanding(s.date)) : '—'),
    },
    {
      key: 'status',
      header: 'Status',
      sortValue: (s) => s.paymentStatus,
      render: (s) => <StatusBadge tone={STATUS_BADGE[s.paymentStatus].tone}>{STATUS_BADGE[s.paymentStatus].label}</StatusBadge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'center',
      width: '190px',
      render: (s) => (
        <div className="flex items-center justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {s.balanceDue > 0 && (
            <Button variant="success" size="sm" onClick={() => setPaySale(s)}>
              <HandCoins size={13} /> Receive
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setDetailSale(s)}>
            <Eye size={13} /> View
          </Button>
        </div>
      ),
    },
  ]

  const customerColumns: DataTableColumn<CustomerBalance>[] = [
    { key: 'name', header: 'Customer', sortValue: (c) => c.name.toLowerCase(), render: (c) => <span className="font-semibold">{c.name}</span> },
    { key: 'phone', header: 'Phone', sortValue: (c) => c.phone, render: (c) => c.phone || <span className="text-ink-faint">—</span> },
    { key: 'invoices', header: 'Unpaid Invoices', align: 'right', sortValue: (c) => c.invoices, render: (c) => formatNumber(c.invoices) },
    { key: 'oldest', header: 'Oldest', sortValue: (c) => c.oldestDate, render: (c) => `${formatDate(c.oldestDate)} (${daysOutstanding(c.oldestDate)}d)` },
    {
      key: 'due',
      header: 'Total Due',
      align: 'right',
      sortValue: (c) => c.balanceDue,
      render: (c) => <span className="font-bold text-warning">{formatCurrency(c.balanceDue)}</span>,
    },
  ]

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryTile label="Total Outstanding" value={formatCurrency(totalDue)} highlight />
        <SummaryTile label="Unpaid Invoices" value={formatNumber(owing.length)} />
        <SummaryTile label="Customers Owing" value={formatNumber(customers.length)} />
        <SummaryTile label="Oldest Unpaid" value={owing.length ? `${oldestDays} day${oldestDays === 1 ? '' : 's'}` : '—'} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-2">
        <FilterBar>
          <FilterField label="Search">
            <SearchBar value={search} onChange={setSearch} placeholder="Customer, phone or invoice…" className="w-64" />
          </FilterField>
          <FilterField label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as CreditSaleFilter)} className={selectClass}>
              <option value="outstanding">Not paid yet</option>
              <option value="settled">Paid</option>
              <option value="all">All</option>
            </select>
          </FilterField>
          <FilterField label="View">
            <div className="flex overflow-hidden rounded border border-border-strong">
              {(['invoices', 'customers'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={clsx(
                    'px-3 py-1.5 text-sm font-medium capitalize',
                    view === v ? 'bg-brand-600 text-white' : 'bg-panel text-ink-soft hover:bg-panel-alt',
                  )}
                >
                  {v === 'invoices' ? 'By Invoice' : 'By Customer'}
                </button>
              ))}
            </div>
          </FilterField>
        </FilterBar>
        <Button variant="secondary" onClick={load} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </Button>
      </div>

      <div className="min-h-0 flex-1">
        {view === 'invoices' ? (
          <DataTable
            columns={invoiceColumns}
            rows={filtered}
            keyField={(s) => s.id}
            onRowClick={setDetailSale}
            emptyMessage={loading ? 'Loading…' : status === 'outstanding' ? 'Nobody owes anything right now.' : 'No pay-later invoices found.'}
          />
        ) : (
          <DataTable
            columns={customerColumns}
            rows={customers}
            keyField={(c) => c.key}
            onRowClick={(c) => {
              setSearch(c.name)
              setView('invoices')
            }}
            emptyMessage={loading ? 'Loading…' : 'Nobody owes anything right now.'}
          />
        )}
      </div>

      <SaleDetailModal
        sale={detailSale}
        onClose={() => setDetailSale(null)}
        onPrint={(s) => setPrintSale(s)}
        onReceivePayment={(s) => setPaySale(s)}
      />
      <ReceivePaymentModal sale={paySale} onClose={() => setPaySale(null)} onReceived={handleReceived} />
      <ReceiptModal sale={printSale} onClose={() => setPrintSale(null)} />
    </div>
  )
}

function SummaryTile({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={clsx('rounded border p-3', highlight ? 'border-warning/30 bg-warning-bg' : 'border-border bg-panel')}>
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={clsx('text-lg font-bold tabular-nums', highlight ? 'text-warning' : 'text-ink')}>{value}</div>
    </div>
  )
}
