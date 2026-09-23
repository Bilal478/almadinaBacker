import { FilterBar, FilterField, selectClass } from '@/components/common/FilterBar'
import { DateRangePicker } from '@/components/common/DateRangePicker'
import { useProductStore } from '@/store/productStore'
import { useSupplierStore } from '@/store/supplierStore'
import { useUserStore } from '@/store/userStore'
import type { PaymentMethod } from '@/types'

export interface ReportFilters {
  from: string
  to: string
  productId: string
  sellerId: string
  supplierId: string
  paymentMethod: string
}

interface ReportFilterBarProps {
  filters: ReportFilters
  onChange: (patch: Partial<ReportFilters>) => void
  show?: { product?: boolean; seller?: boolean; supplier?: boolean; paymentMethod?: boolean }
}

const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'other']

export function ReportFilterBar({ filters, onChange, show = {} }: ReportFilterBarProps) {
  const products = useProductStore((s) => s.products)
  const suppliers = useSupplierStore((s) => s.suppliers)
  const users = useUserStore((s) => s.users)

  return (
    <FilterBar>
      <FilterField label="Date From">
        <DateRangePicker from={filters.from} to={filters.to} onFromChange={(v) => onChange({ from: v })} onToChange={(v) => onChange({ to: v })} />
      </FilterField>
      {show.product && (
        <FilterField label="Product">
          <select value={filters.productId} onChange={(e) => onChange({ productId: e.target.value })} className={selectClass}>
            <option value="All">All Products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </FilterField>
      )}
      {show.seller && (
        <FilterField label="Seller">
          <select value={filters.sellerId} onChange={(e) => onChange({ sellerId: e.target.value })} className={selectClass}>
            <option value="All">All Sellers</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </FilterField>
      )}
      {show.supplier && (
        <FilterField label="Supplier">
          <select value={filters.supplierId} onChange={(e) => onChange({ supplierId: e.target.value })} className={selectClass}>
            <option value="All">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </FilterField>
      )}
      {show.paymentMethod && (
        <FilterField label="Payment Method">
          <select value={filters.paymentMethod} onChange={(e) => onChange({ paymentMethod: e.target.value })} className={selectClass}>
            <option value="All">All Methods</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </FilterField>
      )}
    </FilterBar>
  )
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  from: '2026-01-01',
  to: '2026-12-31',
  productId: 'All',
  sellerId: 'All',
  supplierId: 'All',
  paymentMethod: 'All',
}
