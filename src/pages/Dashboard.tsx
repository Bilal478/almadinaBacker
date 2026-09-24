import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Banknote, PackageX, ShoppingCart, TrendingUp, Truck } from 'lucide-react'
import { useSalesStore } from '@/store/salesStore'
import { useProductStore } from '@/store/productStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useCurrentUser } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/format'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function DashboardPage() {
  const { user, role } = useCurrentUser()
  const allSales = useSalesStore((s) => s.sales)
  const fetchSales = useSalesStore((s) => s.fetchAll)
  const sales = useMemo(() => allSales.filter((s2) => s2.status === 'completed'), [allSales])
  const products = useProductStore((s) => s.products)
  const fetchProducts = useProductStore((s) => s.fetchAll)
  const getStock = useProductStore((s) => s.getStock)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const fetchSuppliers = useSupplierStore((s) => s.fetchAll)
  const getOutstanding = useSupplierStore((s) => s.getOutstanding)

  useEffect(() => {
    fetchSales()
    fetchProducts()
    fetchSuppliers()
  }, [fetchSales, fetchProducts, fetchSuppliers])

  const today = todayIso()
  const todaySales = sales.filter((s) => s.date === today)
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.grandTotal, 0)
  const todayCount = todaySales.length

  const monthPrefix = today.slice(0, 7)
  const monthSales = sales.filter((s) => s.date.startsWith(monthPrefix))
  const monthRevenue = monthSales.reduce((sum, s) => sum + s.grandTotal, 0)
  const monthCost = monthSales.reduce((sum, s) => sum + s.items.reduce((c, i) => c + i.qty * i.unitCost, 0), 0)
  const monthProfit = monthRevenue - monthCost

  const lowStockProducts = products.filter((p) => p.status === 'active' && getStock(p.id) <= p.lowStockLevel)
  const totalOutstanding = suppliers.reduce((sum, s) => sum + getOutstanding(s.id), 0)

  const canViewFinancials = role?.permissions.includes('view_reports')
  const canViewSupplierBalances = role?.permissions.includes('view_supplier_balances')

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded border border-border bg-panel px-4 py-3">
        <div className="text-[15px] font-semibold text-ink">Welcome back, {user?.name?.split(' ')[0]}</div>
        <div className="text-xs text-ink-faint">{role?.name} &middot; {formatDate(new Date().toISOString())}</div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ShoppingCart} label="Today's Sales" value={todayCount.toString()} sub={formatCurrency(todayRevenue)} tone="brand" />
        {canViewFinancials ? (
          <StatCard icon={TrendingUp} label="This Month's Profit" value={formatCurrency(monthProfit)} sub={`Revenue ${formatCurrency(monthRevenue)}`} tone="success" />
        ) : (
          <StatCard icon={TrendingUp} label="This Month's Sales" value={formatCurrency(monthRevenue)} sub={`${monthSales.length} transactions`} tone="success" />
        )}
        <StatCard icon={PackageX} label="Low Stock Items" value={lowStockProducts.length.toString()} sub="Need restocking" tone="warning" />
        {canViewSupplierBalances && (
          <StatCard icon={Banknote} label="Supplier Payables" value={formatCurrency(totalOutstanding)} sub={`${suppliers.length} suppliers`} tone="danger" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <AlertTriangle size={15} className="text-warning" />
              Low Stock Alerts
            </div>
            <Link to="/inventory" className="flex items-center gap-1 text-[11.5px] font-medium text-brand-600 hover:underline">
              View Inventory <ArrowRight size={12} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {lowStockProducts.length === 0 && <div className="p-4 text-center text-sm text-ink-faint">All stock levels are healthy.</div>}
            {lowStockProducts.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-ink">{p.name}</div>
                  <div className="text-[11px] text-ink-faint">{p.code}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-warning">{getStock(p.id)} left</div>
                  <div className="text-[11px] text-ink-faint">Threshold: {p.lowStockLevel}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <ShoppingCart size={15} className="text-brand-600" />
              Recent Sales
            </div>
            {canViewFinancials && (
              <Link to="/reports" className="flex items-center gap-1 text-[11.5px] font-medium text-brand-600 hover:underline">
                View Reports <ArrowRight size={12} />
              </Link>
            )}
          </div>
          <div className="divide-y divide-border">
            {sales.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium text-ink">{s.invoiceNo}</div>
                  <div className="text-[11px] text-ink-faint">
                    {s.cashierName} &middot; {formatDate(s.date)}
                  </div>
                </div>
                <div className="font-bold text-ink">{formatCurrency(s.grandTotal)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {canViewSupplierBalances && (
        <div className="rounded border border-border bg-panel">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <div className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Truck size={15} className="text-ink-soft" />
              Supplier Balances
            </div>
            <Link to="/supplier-payments" className="flex items-center gap-1 text-[11.5px] font-medium text-brand-600 hover:underline">
              Manage Payments <ArrowRight size={12} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border md:grid-cols-3">
            {suppliers
              .filter((s) => getOutstanding(s.id) > 0)
              .map((s) => (
                <div key={s.id} className="bg-panel px-3 py-2">
                  <div className="text-sm font-medium text-ink">{s.name}</div>
                  <div className="text-sm font-bold text-danger">{formatCurrency(getOutstanding(s.id))}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: typeof ShoppingCart
  label: string
  value: string
  sub: string
  tone: 'brand' | 'success' | 'warning' | 'danger'
}) {
  const toneClasses = {
    brand: 'bg-brand-50 text-brand-700',
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
  }[tone]

  return (
    <div className="rounded border border-border bg-panel p-3">
      <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded ${toneClasses}`}>
        <Icon size={16} />
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="text-[18px] font-bold text-ink">{value}</div>
      <div className="text-[11px] text-ink-faint">{sub}</div>
    </div>
  )
}
