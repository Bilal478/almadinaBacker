import { useEffect, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Download, Printer, CheckCircle2, Undo2 } from 'lucide-react'
import { ReportTable } from '@/components/common/ReportTable'
import { ReportFilterBar, DEFAULT_REPORT_FILTERS, type ReportFilters } from '@/components/reports/ReportFilterBar'
import { Button } from '@/components/common/Button'
import { ReceiptModal } from '@/components/pos/ReceiptModal'
import { ReturnModal } from '@/components/pos/ReturnModal'
import { SaleDetailModal } from '@/components/pos/SaleDetailModal'
import { useSalesStore } from '@/store/salesStore'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore } from '@/store/inventoryStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useExpenseStore } from '@/store/expenseStore'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
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

/** Which filters each tab's UI actually shows — also used to silently reset the ones it
 *  doesn't, so switching tabs can never leave an invisible filter (set on a different tab)
 *  still narrowing this one's numbers with no control on screen to explain why. */
function shownFiltersFor(tab: Tab) {
  return {
    product: tab === 'sales' || tab === 'products' || tab === 'profit',
    seller: tab === 'sales' || tab === 'sellers' || tab === 'products',
    supplier: tab === 'suppliers' || tab === 'outstanding',
    paymentMethod: tab === 'sales',
  }
}

export function ReportsPage() {
  const [tab, setTab] = useState<Tab>('sales')
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS)
  const [reprintSale, setReprintSale] = useState<Sale | null>(null)
  const [returnSale, setReturnSale] = useState<Sale | null>(null)
  const [viewingSale, setViewingSale] = useState<Sale | null>(null)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const pushToast = useUiStore((s) => s.pushToast)
  const canExport = hasPermission('export_reports')
  const canReturn = hasPermission('void_sale')

  const rawSales = useSalesStore((s) => s.sales)
  const fetchSales = useSalesStore((s) => s.fetchAll)
  const allSales = useMemo(() => rawSales.filter((sale) => sale.status === 'completed'), [rawSales])
  const products = useProductStore((s) => s.products)
  const fetchProducts = useProductStore((s) => s.fetchAll)
  const getStock = useProductStore((s) => s.getStock)
  const getCurrentPrice = useProductStore((s) => s.getCurrentPrice)
  const batches = useInventoryStore((s) => s.batches)
  const fetchInventory = useInventoryStore((s) => s.fetchAll)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const purchases = useSupplierStore((s) => s.purchases)
  const fetchSuppliers = useSupplierStore((s) => s.fetchAll)
  const getOutstanding = useSupplierStore((s) => s.getOutstanding)
  const getSupplier = useSupplierStore((s) => s.getSupplier)
  const expenses = useExpenseStore((s) => s.expenses)
  const fetchExpenses = useExpenseStore((s) => s.fetchAll)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    fetchInventory()
    fetchSuppliers()
    fetchExpenses()
  }, [fetchSales, fetchProducts, fetchInventory, fetchSuppliers, fetchExpenses])

  // Switching to a tab that doesn't show a given filter's control clears that filter, so it
  // can never keep silently narrowing this tab's numbers with no visible way to tell why.
  useEffect(() => {
    const shown = shownFiltersFor(tab)
    setFilters((f) => ({
      ...f,
      productId: shown.product ? f.productId : 'All',
      sellerId: shown.seller ? f.sellerId : 'All',
      supplierId: shown.supplier ? f.supplierId : 'All',
      paymentMethod: shown.paymentMethod ? f.paymentMethod : 'All',
    }))
  }, [tab])

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

  // Flattened line-level rows — the unit needed for product/seller aggregation. Every figure
  // here is NET of returns: a returned unit's revenue/cost is backed out using the same
  // "returnedQty * unitPrice" the backend actually records as the refund (ReturnModal / the
  // SaleReturnService), so this always matches what a Return actually did to the sale.
  const saleLines = useMemo(
    () =>
      filteredSales.flatMap((sale) =>
        sale.items
          .filter((i) => filters.productId === 'All' || i.productId === filters.productId)
          .map((item) => {
            const netQty = item.qty - item.returnedQty
            const returnedAmount = item.returnedQty * item.unitPrice
            const revenue = item.qty * item.unitPrice - item.discount - returnedAmount
            const cost = netQty * item.unitCost
            return {
              saleId: sale.id,
              invoiceNo: sale.invoiceNo,
              date: sale.date,
              cashierId: sale.cashierId,
              cashierName: sale.cashierName,
              paymentMethod: sale.paymentMethod,
              ...item,
              qty: netQty,
              revenue,
              cost,
              profit: revenue - cost,
            }
          }),
      ),
    [filteredSales, filters.productId],
  )

  // Same "returnedQty * unitPrice" formula as saleLines above, just aggregated at the sale
  // level instead of the line level — for the Sales tab's per-invoice Returned/Net columns.
  function saleReturnedAmount(sale: Sale) {
    return sale.items.reduce((s, i) => s + i.returnedQty * i.unitPrice, 0)
  }

  // Real inventory valuation: each batch keeps the cost it was actually bought at, so a
  // product's stock value is the sum of what's LEFT of every batch at THAT batch's own cost —
  // not "total stock × today's latest cost", which is wrong the moment a price has ever
  // changed while older-cost stock is still on the shelf (see Batch model — FIFO costing).
  function productStockValue(productId: string) {
    return batches.filter((b) => b.productId === productId).reduce((sum, b) => sum + b.remaining * b.cost, 0)
  }

  const totalRevenue = saleLines.reduce((s, l) => s + l.revenue, 0)
  const totalCost = saleLines.reduce((s, l) => s + l.cost, 0)
  const totalProfit = totalRevenue - totalCost
  const filteredExpenses = expenses.filter((e) => e.date >= filters.from && e.date <= filters.to)
  const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0)

  function handleExport() {
    const suppliersInRange = purchases.filter(
      (p) => p.date >= filters.from && p.date <= filters.to && (filters.supplierId === 'All' || p.supplierId === filters.supplierId),
    )
    const outstandingRows = suppliers.filter((s) => filters.supplierId === 'All' || s.id === filters.supplierId)

    let headers: string[]
    let rows: (string | number)[][]

    switch (tab) {
      case 'sales':
        headers = ['Invoice No.', 'Date', 'Seller', 'Subtotal', 'Discount', 'Grand Total', 'Returned', 'Net Total', 'Payment Method', 'Printed']
        rows = filteredSales.map((r) => [
          r.invoiceNo,
          r.date,
          r.cashierName,
          r.subtotal,
          r.discount,
          r.grandTotal,
          saleReturnedAmount(r),
          r.grandTotal - saleReturnedAmount(r),
          r.paymentMethod,
          r.printedAt ? 'Yes' : 'No',
        ])
        break
      case 'products':
        headers = ['Code', 'Product', 'Qty Sold', 'Revenue', 'Cost', 'Profit']
        rows = groupProductSales(saleLines).map((r) => [r.code, r.name, r.qty, r.revenue, r.cost, r.profit])
        break
      case 'sellers':
        headers = ['Seller', 'Transactions', 'Revenue', 'Cost', 'Profit']
        rows = groupSellers(saleLines).map((r) => [r.name, r.invoices.size, r.revenue, r.cost, r.profit])
        break
      case 'suppliers':
        headers = ['Invoice No.', 'Supplier', 'Total Purchase', 'Paid at Purchase', 'Due at Purchase']
        rows = suppliersInRange.map((p) => [p.invoiceNo, getSupplier(p.supplierId)?.name ?? '—', p.totalAmount, p.paidAmount, p.totalAmount - p.paidAmount])
        break
      case 'outstanding':
        headers = ['Supplier', 'Status', 'Outstanding Balance']
        rows = outstandingRows.map((s) => [s.name, s.status, getOutstanding(s.id)])
        break
      case 'profit':
        headers = ['Month', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit']
        rows = groupProfit(saleLines, filteredExpenses).map((r) => [r.month, r.revenue, r.cost, r.revenue - r.cost, r.expenses, r.revenue - r.cost - r.expenses])
        break
      case 'expenses':
        headers = ['Date', 'Category', 'Description', 'Amount']
        rows = filteredExpenses.map((e) => [formatDate(e.date), e.category, e.description, e.amount])
        break
      case 'inventory':
        headers = ['Code', 'Product', 'Current Stock', 'Avg. Cost / Unit', 'Stock Value']
        rows = products.map((p) => {
          const stock = getStock(p.id)
          const value = productStockValue(p.id)
          return [p.code, p.name, stock, stock > 0 ? value / stock : (getCurrentPrice(p.id)?.purchaseCost ?? 0), value]
        })
        break
    }

    downloadCsv(`${tab}-report_${filters.from}_to_${filters.to}.csv`, headers, rows)
    pushToast('success', 'Report exported.')
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
        <ReportFilterBar filters={filters} onChange={patchFilters} show={shownFiltersFor(tab)} />
        {canExport && (
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} /> Export
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <SummaryTile label="Total Sales (Net of Returns)" value={formatCurrency(totalRevenue)} />
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
            onRowClick={(r) => setViewingSale(r)}
            totals={[
              '',
              '',
              '',
              formatCurrency(filteredSales.reduce((s, r) => s + r.subtotal, 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + r.discount, 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + r.grandTotal, 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + saleReturnedAmount(r), 0)),
              formatCurrency(filteredSales.reduce((s, r) => s + (r.grandTotal - saleReturnedAmount(r)), 0)),
              '',
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
              {
                key: 'returned',
                header: 'Returned',
                align: 'right',
                render: (r) => {
                  const amt = saleReturnedAmount(r)
                  return amt > 0 ? <span className="text-danger">-{formatCurrency(amt)}</span> : <span className="text-ink-faint">—</span>
                },
              },
              {
                key: 'netTotal',
                header: 'Net Total',
                align: 'right',
                render: (r) => <span className="font-bold text-ink">{formatCurrency(r.grandTotal - saleReturnedAmount(r))}</span>,
              },
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
                    onClick={(e) => {
                      e.stopPropagation()
                      setReprintSale(r)
                    }}
                    className="flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-panel-alt"
                  >
                    <Printer size={12} /> {r.printedAt ? 'Reprint' : 'Print'}
                  </button>
                ),
              },
              {
                key: 'return',
                header: 'Return',
                align: 'center',
                render: (r) => {
                  const fullyReturned = r.items.every((i) => i.qty - i.returnedQty <= 0)
                  if (!canReturn) return <span className="text-[11px] text-ink-faint">—</span>
                  if (fullyReturned) return <span className="text-[11px] text-ink-faint">Fully returned</span>
                  return (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setReturnSale(r)
                      }}
                      className="flex items-center gap-1 rounded border border-border-strong px-2 py-1 text-[11px] font-medium text-ink-soft hover:bg-panel-alt"
                    >
                      <Undo2 size={12} /> Return
                    </button>
                  )
                },
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
              { key: 'paid', header: 'Paid at Purchase', align: 'right', render: (p) => formatCurrency(p.paidAmount) },
              { key: 'remaining', header: 'Due at Purchase', align: 'right', render: (p) => formatCurrency(p.totalAmount - p.paidAmount) },
            ]}
          />
        )}
        {tab === 'suppliers' && (
          <p className="mt-2 text-[11.5px] text-ink-faint">
            Paid/Due figures above are as recorded at the time of each purchase and don't include later standalone
            supplier payments. See the <span className="font-medium text-ink-soft">Supplier Outstanding</span> tab
            for each supplier's true current balance.
          </p>
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
            totals={['', '', '', '', formatCurrency(products.reduce((s, p) => s + productStockValue(p.id), 0))]}
            columns={[
              { key: 'code', header: 'Code', render: (p) => p.code },
              { key: 'name', header: 'Product', render: (p) => p.name },
              { key: 'stock', header: 'Current Stock', align: 'right', render: (p) => formatNumber(getStock(p.id)) },
              {
                key: 'cost',
                header: 'Avg. Cost / Unit',
                align: 'right',
                render: (p) => {
                  const stock = getStock(p.id)
                  // Weighted average across whatever batches are actually left — not just the
                  // latest purchase price, which older remaining stock may not reflect at all.
                  return formatCurrency(stock > 0 ? productStockValue(p.id) / stock : (getCurrentPrice(p.id)?.purchaseCost ?? 0))
                },
              },
              { key: 'value', header: 'Stock Value', align: 'right', render: (p) => formatCurrency(productStockValue(p.id)) },
            ]}
          />
        )}
      </div>

      <ReceiptModal sale={reprintSale} onClose={() => setReprintSale(null)} />
      <ReturnModal sale={returnSale} onClose={() => setReturnSale(null)} />
      <SaleDetailModal
        sale={viewingSale}
        onClose={() => setViewingSale(null)}
        canReturn={canReturn}
        onPrint={(s) => {
          setViewingSale(null)
          setReprintSale(s)
        }}
        onReturn={(s) => {
          setViewingSale(null)
          setReturnSale(s)
        }}
      />
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

function groupProductSales(saleLines: SaleLine[]) {
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
}

function ProductSalesTable({ saleLines }: { saleLines: SaleLine[] }) {
  const grouped = useMemo(() => groupProductSales(saleLines), [saleLines])

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

function groupSellers(saleLines: SaleLine[]) {
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
}

function SellerTable({ saleLines }: { saleLines: SaleLine[] }) {
  const grouped = useMemo(() => groupSellers(saleLines), [saleLines])

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

function groupProfit(saleLines: SaleLine[], expenses: { date: string; amount: number }[]) {
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
}

function ProfitTable({ saleLines, expenses }: { saleLines: SaleLine[]; expenses: { date: string; amount: number }[] }) {
  const grouped = useMemo(() => groupProfit(saleLines, expenses), [saleLines, expenses])

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
