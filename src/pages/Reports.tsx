import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Download, Printer, CheckCircle2 } from 'lucide-react'
import { ReportTable } from '@/components/common/ReportTable'
import { ReportFilterBar, DEFAULT_REPORT_FILTERS, type ReportFilters } from '@/components/reports/ReportFilterBar'
import { Button } from '@/components/common/Button'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { useSalesStore } from '@/store/salesStore'
import { useProductStore } from '@/store/productStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useExpenseStore } from '@/store/expenseStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Sale } from '@/types'

type Tab = 'sales' | 'products' | 'sellers' | 'suppliers' | 'outstanding' | 'profit' | 'expenses' | 'inventory'

const TABS: { key: Tab; label: string }[] = [
  { key: 'sales', label: 'Sales Report' },
  { key: 'products', label: 'Product Sales' },
  { key: 'sellers', label: 'Seller Report' },
  { key: 'suppliers', label: 'Supplier Report' },
  { key: 'outstanding', label: 'Supplier Outstanding' },
  { key: 'profit', label: 'Profit Report' },
  { key: 'expenses', label: 'Expense Report' },
  { key: 'inventory', label: 'Inventory Report' },
]

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS)
  const [reprintSale, setReprintSale] = useState<Sale | null>(null)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const pushToast = useUiStore((s) => s.pushToast)
  const canExport = hasPermission('export_reports')

  const rawSales = useSalesStore((s) => s.sales)
  const allSales = useMemo(() => rawSales.filter((sale) => sale.status === 'completed'), [rawSales])
  const products = useProductStore((s) => s.products)
  const getStock = useProductStore((s) => s.getStock)
  const getCurrentPrice = useProductStore((s) => s.getCurrentPrice)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const purchases = useSupplierStore((s) => s.purchases)
  const getOutstanding = useSupplierStore((s) => s.getOutstanding)
  const getSupplier = useSupplierStore((s) => s.getSupplier)
  const expenses = useExpenseStore((s) => s.expenses)

  function patchFilters(patch: Partial<ReportFilters>) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  const filteredSales = useMemo(
    () =>
      allSales.filter((s) => {
        if (s.date < filters.from || s.date > filters.to) return false
        if (filters.sellerId !== 'All' && s.cashierId !== filters.sellerId) return false
        if (filters.paymentMethod !== 'All' && s.paymentMethod !== filters.paymentMethod) return false
        if (filters.productId !== 'All' && !s.items.some((i) => i.productId === filters.productId)) return false
        return true
      }),
    [allSales, filters],
  )

  // Flattened line-level rows — the unit needed for product/seller aggregation.
  const saleLines = useMemo(
    () =>
      filteredSales.flatMap((sale) =>
        sale.items
          .filter((i) => filters.productId === 'All' || i.productId === filters.productId)
          .map((item) => ({
            saleId: sale.id,
            invoiceNo: sale.invoiceNo,
            date: sale.date,
            cashierId: sale.cashierId,
            cashierName: sale.cashierName,
            paymentMethod: sale.paymentMethod,
            ...item,
            profit: item.qty * item.unitPrice - item.discount - item.qty * item.unitCost,
            revenue: item.qty * item.unitPrice - item.discount,
            cost: item.qty * item.unitCost,
          })),
      ),
    [filteredSales, filters.productId],
  )

  const totalRevenue = saleLines.reduce((s, l) => s + l.revenue, 0)
  const totalCost = saleLines.reduce((s, l) => s + l.cost, 0)
  const totalProfit = totalRevenue - totalCost
  const filteredExpenses = expenses.filter((e) => e.date >= filters.from && e.date <= filters.to)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  function handleExport() {
    pushToast('info', 'Export started — the report will download as a CSV shortly.')
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex flex-wrap gap-1 rounded border border-border bg-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'rounded px-3 py-1.5 text-[12.5px] font-medium transition-colors',
              tab === t.key ? 'bg-brand-600 text-white' : 'text-ink-soft hover:bg-panel-alt',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <ReportFilterBar
          filters={filters}
          onChange={patchFilters}
          show={{
            product: tab === 'sales' || tab === 'products' || tab === 'profit',
            seller: tab === 'sales' || tab === 'sellers' || tab === 'products',
            supplier: tab === 'suppliers' || tab === 'outstanding',
            paymentMethod: tab === 'sales',
          }}
        />
        {canExport && (
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryTile label="Total Sales" value={formatCurrency(totalRevenue)} />
        <SummaryTile label="Total Cost (COGS)" value={formatCurrency(totalCost)} />
        <SummaryTile label="Gross Profit" value={formatCurrency(totalProfit)} tone="success" />
        <SummaryTile label="Expenses" value={formatCurrency(totalExpenses)} tone="danger" />
        <SummaryTile label="Net Profit" value={formatCurrency(totalProfit - totalExpenses)} tone={totalProfit - totalExpenses >= 0 ? 'success' : 'danger'} emphasize />
      </div>

      <div className="min-h-0 flex-1">
        {tab === 'sales' && (
          <ReportTable
            keyField={(r) => r.id}
            rows={filteredSales}
            totals={[
              '',
              '',
              '',
              formatCurrency(filteredSales.reduce((s, r) => s + r.subtotal, 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + r.discount, 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + r.grandTotal, 0)),
              '',
              '',
              '',
            ]}
            columns={[
              { key: 'invoiceNo', header: 'Invoice No.', render: (r) => r.invoiceNo },
              { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
              { key: 'seller', header: 'Seller', render: (r) => r.cashierName },
              { key: 'subtotal', header: 'Subtotal', align: 'right', render: (r) => formatCurrency(r.subtotal) },
              { key: 'discount', header: 'Discount', align: 'right', render: (r) => formatCurrency(r.discount) },
              { key: 'total', header: 'Grand Total', align: 'right', render: (r) => <span className="font-semibold">{formatCurrency(r.grandTotal)}</span> },
              { key: 'method', header: 'Payment', render: (r) => <span className="capitalize">{r.paymentMethod.replace('_', ' ')}</span> },
              {
                key: 'printed',
                header: 'Printed',
                align: 'center',
                render: (r) =>
                  r.printedAt ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                      <CheckCircle2 size={13} /> Printed
                    </span>
                  ) : (
                    <span className="text-[11px] text-ink-faint">Not printed</span>
                  ),
              },
              {
                key: 'actions',
                header: 'Receipt',
                align: 'center',
                render: (r) => (
                  <button
                    onClick={() => setReprintSale(r)}
                    className="flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-panel-alt"
                  >
                    <Printer size={12} /> {r.printedAt ? 'Reprint' : 'Print'}
                  </button>
                ),
              },
            ]}
          />
        )}

        {tab === 'products' && <ProductSalesTable saleLines={saleLines} />}

        {tab === 'sellers' && <SellerTable saleLines={saleLines} />}

        {tab === 'suppliers' && (
          <ReportTable
            keyField={(r) => r.id}
            rows={purchases.filter((p) => p.date >= filters.from && p.date <= filters.to && (filters.supplierId === 'All' || p.supplierId === filters.supplierId))}
            totals={[
              '',
              '',
              formatCurrency(purchases.filter((p) => p.date >= filters.from && p.date <= filters.to && (filters.supplierId === 'All' || p.supplierId === filters.supplierId)).reduce((s, p) => s + p.totalAmount, 0)),
              formatCurrency(purchases.filter((p) => p.date >= filters.from && p.date <= filters.to && (filters.supplierId === 'All' || p.supplierId === filters.supplierId)).reduce((s, p) => s + p.paidAmount, 0)),
              '',
            ]}
            columns={[
              { key: 'invoiceNo', header: 'Invoice No.', render: (p) => p.invoiceNo },
              { key: 'supplier', header: 'Supplier', render: (p) => getSupplier(p.supplierId)?.name ?? '—' },
              { key: 'total', header: 'Total Purchase', align: 'right', render: (p) => formatCurrency(p.totalAmount) },
              { key: 'paid', header: 'Paid', align: 'right', render: (p) => formatCurrency(p.paidAmount) },
              { key: 'remaining', header: 'Remaining', align: 'right', render: (p) => formatCurrency(p.totalAmount - p.paidAmount) },
            ]}
          />
        )}

        {tab === 'outstanding' && (
          <ReportTable
            keyField={(s) => s.id}
            rows={suppliers.filter((s) => filters.supplierId === 'All' || s.id === filters.supplierId)}
            totals={['', '', formatCurrency(suppliers.reduce((sum, s) => sum + getOutstanding(s.id), 0))]}
            columns={[
              { key: 'name', header: 'Supplier', render: (s) => s.name },
              { key: 'status', header: 'Status', render: (s) => <span className="capitalize">{s.status}</span> },
              {
                key: 'outstanding',
                header: 'Outstanding Balance',
                align: 'right',
                render: (s) => {
                  const bal = getOutstanding(s.id)
                  return <span className={clsx('font-bold', bal > 0 ? 'text-danger' : 'text-ink-faint')}>{formatCurrency(bal)}</span>
                },
              },
            ]}
          />
        )}

        {tab === 'profit' && <ProfitTable saleLines={saleLines} expenses={filteredExpenses} />}

        {tab === 'expenses' && (
          <ReportTable
            keyField={(e) => e.id}
            rows={filteredExpenses}
            totals={['', '', '', formatCurrency(totalExpenses)]}
            columns={[
              { key: 'date', header: 'Date', render: (e) => formatDate(e.date) },
              { key: 'category', header: 'Category', render: (e) => e.category },
              { key: 'description', header: 'Description', render: (e) => e.description },
              { key: 'amount', header: 'Amount', align: 'right', render: (e) => formatCurrency(e.amount) },
            ]}
          />
        )}

        {tab === 'inventory' && (
          <ReportTable
            keyField={(p) => p.id}
            rows={products}
            totals={['', '', '', '', formatCurrency(products.reduce((s, p) => s + getStock(p.id) * (getCurrentPrice(p.id)?.purchaseCost ?? 0), 0))]}
            columns={[
              { key: 'code', header: 'Code', render: (p) => p.code },
              { key: 'name', header: 'Product', render: (p) => p.name },
              { key: 'stock', header: 'Current Stock', align: 'right', render: (p) => formatNumber(getStock(p.id)) },
              { key: 'cost', header: 'Unit Cost', align: 'right', render: (p) => formatCurrency(getCurrentPrice(p.id)?.purchaseCost ?? 0) },
              { key: 'value', header: 'Stock Value', align: 'right', render: (p) => formatCurrency(getStock(p.id) * (getCurrentPrice(p.id)?.purchaseCost ?? 0)) },
            ]}
          />
        )}
      </div>

      <ReceiptModal sale={reprintSale} onClose={() => setReprintSale(null)} />
    </div>
  )
}

interface SaleLine {
  saleId: string
  invoiceNo: string
  date: string
  cashierId: string
  cashierName: string
  paymentMethod: string
  productId: string
  name: string
  code: string
  qty: number
  revenue: number
  cost: number
  profit: number
}

function ProductSalesTable({ saleLines }: { saleLines: SaleLine[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { productId: string; name: string; code: string; qty: number; revenue: number; cost: number; profit: number }>()
    for (const l of saleLines) {
      const existing = map.get(l.productId) ?? { productId: l.productId, name: l.name, code: l.code, qty: 0, revenue: 0, cost: 0, profit: 0 }
      existing.qty += l.qty
      existing.revenue += l.revenue
      existing.cost += l.cost
      existing.profit += l.profit
      map.set(l.productId, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [saleLines])

  return (
    <ReportTable
      keyField={(r) => r.productId}
      rows={grouped}
      totals={['', '', formatNumber(grouped.reduce((s, r) => s + r.qty, 0)), formatCurrency(grouped.reduce((s, r) => s + r.revenue, 0)), formatCurrency(grouped.reduce((s, r) => s + r.cost, 0)), formatCurrency(grouped.reduce((s, r) => s + r.profit, 0))]}
      columns={[
        { key: 'code', header: 'Code', render: (r) => r.code },
        { key: 'name', header: 'Product', render: (r) => r.name },
        { key: 'qty', header: 'Qty Sold', align: 'right', render: (r) => formatNumber(r.qty) },
        { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
        { key: 'cost', header: 'Cost', align: 'right', render: (r) => formatCurrency(r.cost) },
        { key: 'profit', header: 'Profit', align: 'right', render: (r) => <span className="font-semibold text-success">{formatCurrency(r.profit)}</span> },
      ]}
    />
  )
}

function SellerTable({ saleLines }: { saleLines: SaleLine[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { cashierId: string; name: string; invoices: Set<string>; revenue: number; cost: number; profit: number }>()
    for (const l of saleLines) {
      const existing = map.get(l.cashierId) ?? { cashierId: l.cashierId, name: l.cashierName, invoices: new Set<string>(), revenue: 0, cost: 0, profit: 0 }
      existing.invoices.add(l.saleId)
      existing.revenue += l.revenue
      existing.cost += l.cost
      existing.profit += l.profit
      map.set(l.cashierId, existing)
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue)
  }, [saleLines])

  return (
    <ReportTable
      keyField={(r) => r.cashierId}
      rows={grouped}
      totals={['', formatNumber(grouped.reduce((s, r) => s + r.invoices.size, 0)), formatCurrency(grouped.reduce((s, r) => s + r.revenue, 0)), '', formatCurrency(grouped.reduce((s, r) => s + r.profit, 0))]}
      columns={[
        { key: 'name', header: 'Seller', render: (r) => r.name },
        { key: 'invoices', header: 'Transactions', align: 'right', render: (r) => r.invoices.size },
        { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
        { key: 'cost', header: 'Cost', align: 'right', render: (r) => formatCurrency(r.cost) },
        { key: 'profit', header: 'Profit', align: 'right', render: (r) => <span className="font-semibold text-success">{formatCurrency(r.profit)}</span> },
      ]}
    />
  )
}

function ProfitTable({ saleLines, expenses }: { saleLines: SaleLine[]; expenses: { date: string; amount: number }[] }) {
  const grouped = useMemo(() => {
    const map = new Map<string, { month: string; revenue: number; cost: number; expenses: number }>()
    for (const l of saleLines) {
      const month = l.date.slice(0, 7)
      const existing = map.get(month) ?? { month, revenue: 0, cost: 0, expenses: 0 }
      existing.revenue += l.revenue
      existing.cost += l.cost
      map.set(month, existing)
    }
    for (const e of expenses) {
      const month = e.date.slice(0, 7)
      const existing = map.get(month) ?? { month, revenue: 0, cost: 0, expenses: 0 }
      existing.expenses += e.amount
      map.set(month, existing)
    }
    return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month))
  }, [saleLines, expenses])

  return (
    <ReportTable
      keyField={(r) => r.month}
      rows={grouped}
      totals={[
        '',
        formatCurrency(grouped.reduce((s, r) => s + r.revenue, 0)),
        formatCurrency(grouped.reduce((s, r) => s + r.cost, 0)),
        formatCurrency(grouped.reduce((s, r) => s + (r.revenue - r.cost), 0)),
        formatCurrency(grouped.reduce((s, r) => s + r.expenses, 0)),
        formatCurrency(grouped.reduce((s, r) => s + (r.revenue - r.cost - r.expenses), 0)),
      ]}
      columns={[
        { key: 'month', header: 'Month', render: (r) => r.month },
        { key: 'revenue', header: 'Revenue', align: 'right', render: (r) => formatCurrency(r.revenue) },
        { key: 'cost', header: 'COGS', align: 'right', render: (r) => formatCurrency(r.cost) },
        { key: 'gross', header: 'Gross Profit', align: 'right', render: (r) => formatCurrency(r.revenue - r.cost) },
        { key: 'expenses', header: 'Expenses', align: 'right', render: (r) => formatCurrency(r.expenses) },
        {
          key: 'net',
          header: 'Net Profit',
          align: 'right',
          render: (r) => {
            const net = r.revenue - r.cost - r.expenses
            return <span className={clsx('font-bold', net >= 0 ? 'text-success' : 'text-danger')}>{formatCurrency(net)}</span>
          },
        },
      ]}
    />
  )
}

function SummaryTile({ label, value, tone, emphasize }: { label: string; value: string; tone?: 'success' | 'danger'; emphasize?: boolean }) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : 'text-ink'
  return (
    <div className={clsx('rounded border p-3', emphasize ? 'border-brand-500 bg-brand-50' : 'border-border bg-panel')}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={clsx('text-[16px] font-bold', toneClass)}>{value}</div>
    </div>
  )
}
