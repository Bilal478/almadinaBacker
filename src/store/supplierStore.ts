import { create } from 'zustand'
import type { Purchase, PurchaseLineItem, Supplier, SupplierPayment, SupplierStatus, SupplierType } from '@/types'
import { api, getAll } from '@/lib/api'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore } from '@/store/inventoryStore'

export interface LedgerRow {
  id: string
  date: string
  type: 'opening' | 'purchase' | 'payment' | 'return' | 'adjustment'
  reference: string
  description: string
  debit: number
  credit: number
  balance: number
}

interface ApiSupplierType {
  id: number
  name: string
  description: string | null
  status: SupplierStatus
}

interface ApiSupplier {
  id: number
  name: string
  phone: string
  address: string
  supplier_type_id: number | null
  supplier_type_name: string | null
  opening_balance: number
  status: SupplierStatus
  outstanding: number
}

interface ApiPurchaseItem {
  product_id: number
  quantity: string | number
  purchase_cost: string | number
  batch_number: string
  expiry_date: string | null
  unit?: { symbol: string }
  product?: { unit?: { symbol: string } }
}

interface ApiPurchase {
  id: number
  invoice_no: string
  supplier_id: number
  purchase_date: string
  total_amount: string | number
  paid_amount: string | number
  status: Purchase['status']
  items: ApiPurchaseItem[]
}

interface ApiSupplierPayment {
  id: number
  supplier_id: number
  amount: string | number
  payment_date: string
  reference: string | null
  description: string | null
  payment_method: string
}

interface ApiLedgerRow {
  id: number
  transaction_date: string
  transaction_type: string
  reference: string | null
  description: string
  debit: string | number
  credit: string | number
  balance: string | number
}

const toSupplierType = (u: ApiSupplierType): SupplierType => ({ id: String(u.id), name: u.name, description: u.description ?? undefined, status: u.status })

const toSupplier = (s: ApiSupplier): Supplier => ({
  id: String(s.id),
  name: s.name,
  phone: s.phone,
  address: s.address,
  supplierTypeId: s.supplier_type_id !== null ? String(s.supplier_type_id) : '',
  status: s.status,
  openingBalance: Number(s.opening_balance),
  outstanding: Number(s.outstanding),
})

const toPurchase = (p: ApiPurchase): Purchase => ({
  id: String(p.id),
  invoiceNo: p.invoice_no,
  supplierId: String(p.supplier_id),
  date: p.purchase_date,
  totalAmount: Number(p.total_amount),
  paidAmount: Number(p.paid_amount),
  status: p.status,
  items: p.items.map(
    (i): PurchaseLineItem => ({
      productId: String(i.product_id),
      quantity: Number(i.quantity),
      unit: i.unit?.symbol ?? i.product?.unit?.symbol ?? '',
      cost: Number(i.purchase_cost),
      expiryDate: i.expiry_date ?? undefined,
      batchNo: i.batch_number,
    }),
  ),
})

const toPayment = (p: ApiSupplierPayment): SupplierPayment => ({
  id: String(p.id),
  supplierId: String(p.supplier_id),
  amount: Number(p.amount),
  method: p.payment_method.toLowerCase() as SupplierPayment['method'],
  date: p.payment_date,
  reference: p.reference ?? '',
  notes: p.description ?? undefined,
})

const LEDGER_TYPE_MAP: Record<string, LedgerRow['type']> = {
  opening: 'opening',
  purchase: 'purchase',
  payment: 'payment',
  purchase_return: 'return',
  adjustment: 'adjustment',
}

const toLedgerRow = (r: ApiLedgerRow): LedgerRow => ({
  id: String(r.id),
  date: r.transaction_date,
  type: LEDGER_TYPE_MAP[r.transaction_type] ?? 'adjustment',
  reference: r.reference ?? '—',
  description: r.description,
  debit: Number(r.debit),
  credit: Number(r.credit),
  balance: Number(r.balance),
})

interface SupplierState {
  supplierTypes: SupplierType[]
  suppliers: Supplier[]
  purchases: Purchase[]
  payments: SupplierPayment[]
  ledgerBySupplier: Record<string, LedgerRow[]>
  loading: boolean

  fetchAll: () => Promise<void>
  fetchLedger: (supplierId: string) => Promise<void>

  getSupplier: (id: string) => Supplier | undefined
  getSupplierType: (id: string) => SupplierType | undefined
  getOutstanding: (supplierId: string) => number
  getLedger: (supplierId: string) => LedgerRow[]

  addSupplierType: (type: { name: string; description?: string }) => Promise<void>
  updateSupplierType: (id: string, patch: { name: string; description?: string }) => Promise<void>
  setSupplierTypeStatus: (id: string, status: SupplierStatus) => Promise<void>

  addSupplier: (supplier: Omit<Supplier, 'id' | 'outstanding'>) => Promise<void>
  updateSupplier: (id: string, patch: Partial<Supplier>) => Promise<void>
  setSupplierStatus: (id: string, status: SupplierStatus) => Promise<void>

  addPurchase: (input: {
    supplierId: string
    date: string
    invoiceNo?: string
    paidAmount: number
    items: { productId: string; quantity: number; unit: string; cost: number; expiryDate?: string }[]
  }) => Promise<Purchase>

  addSupplierPayment: (payment: Omit<SupplierPayment, 'id'>) => Promise<void>
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
  supplierTypes: [],
  suppliers: [],
  purchases: [],
  payments: [],
  ledgerBySupplier: {},
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const [supplierTypes, suppliers, purchases] = await Promise.all([
      getAll<ApiSupplierType>('/supplier-types'),
      getAll<ApiSupplier>('/suppliers'),
      getAll<ApiPurchase>('/purchases'),
    ])
    set({
      supplierTypes: supplierTypes.map(toSupplierType),
      suppliers: suppliers.map(toSupplier),
      purchases: purchases.map(toPurchase),
      loading: false,
    })
  },

  fetchLedger: async (supplierId) => {
    const rows = await getAll<ApiLedgerRow>(`/suppliers/${supplierId}/ledger`)
    set((state) => ({ ledgerBySupplier: { ...state.ledgerBySupplier, [supplierId]: rows.map(toLedgerRow) } }))
  },

  getSupplier: (id) => get().suppliers.find((s) => s.id === id),
  getSupplierType: (id) => get().supplierTypes.find((t) => t.id === id),
  getOutstanding: (supplierId) => get().suppliers.find((s) => s.id === supplierId)?.outstanding ?? 0,
  getLedger: (supplierId) => get().ledgerBySupplier[supplierId] ?? [],

  addSupplierType: async (type) => {
    const created = toSupplierType(await api.post<ApiSupplierType>('/supplier-types', type))
    set((state) => ({ supplierTypes: [...state.supplierTypes, created] }))
  },
  updateSupplierType: async (id, patch) => {
    const updated = toSupplierType(await api.put<ApiSupplierType>(`/supplier-types/${id}`, patch))
    set((state) => ({ supplierTypes: state.supplierTypes.map((t) => (t.id === id ? updated : t)) }))
  },
  setSupplierTypeStatus: async (id, status) => {
    const updated = toSupplierType(await api.patch<ApiSupplierType>(`/supplier-types/${id}/status`, { status }))
    set((state) => ({ supplierTypes: state.supplierTypes.map((t) => (t.id === id ? updated : t)) }))
  },

  addSupplier: async (supplier) => {
    const created = toSupplier(
      await api.post<ApiSupplier>('/suppliers', {
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        supplier_type_id: supplier.supplierTypeId,
        opening_balance: supplier.openingBalance,
      }),
    )
    set((state) => ({ suppliers: [...state.suppliers, created] }))
  },
  updateSupplier: async (id, patch) => {
    const updated = toSupplier(
      await api.put<ApiSupplier>(`/suppliers/${id}`, {
        name: patch.name,
        phone: patch.phone,
        address: patch.address,
        supplier_type_id: patch.supplierTypeId,
      }),
    )
    set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? updated : s)) }))
  },
  setSupplierStatus: async (id, status) => {
    const updated = toSupplier(await api.patch<ApiSupplier>(`/suppliers/${id}/status`, { status }))
    set((state) => ({ suppliers: state.suppliers.map((s) => (s.id === id ? updated : s)) }))
  },

  addPurchase: async (input) => {
    const created = toPurchase(
      await api.post<ApiPurchase>('/purchases', {
        supplier_id: input.supplierId,
        purchase_date: input.date,
        invoice_no: input.invoiceNo || undefined,
        paid_amount: input.paidAmount,
        items: input.items.map((i) => ({
          product_id: i.productId,
          quantity: i.quantity,
          purchase_cost: i.cost,
          expiry_date: i.expiryDate,
        })),
      }),
    )
    set((state) => ({ purchases: [created, ...state.purchases] }))
    // The purchase received new batches into stock and increased the supplier's outstanding
    // balance — refresh both so cost/stock and payables reflect it everywhere immediately.
    const suppliers = (await getAll<ApiSupplier>('/suppliers')).map(toSupplier)
    set({ suppliers })
    await Promise.all([useProductStore.getState().fetchAll(), useInventoryStore.getState().fetchAll()])
    return created
  },

  addSupplierPayment: async (payment) => {
    const created = toPayment(
      await api.post<ApiSupplierPayment>(`/suppliers/${payment.supplierId}/payments`, {
        amount: payment.amount,
        payment_date: payment.date,
        reference: payment.reference,
        description: payment.notes,
        payment_method: payment.method.toUpperCase(),
      }),
    )
    set((state) => ({ payments: [created, ...state.payments] }))
    // The payment changes this supplier's outstanding balance and its ledger — refresh both.
    const suppliers = (await getAll<ApiSupplier>('/suppliers')).map(toSupplier)
    set({ suppliers })
    await get().fetchLedger(payment.supplierId)
  },
}))
