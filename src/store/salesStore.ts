import { create } from 'zustand'
import type { CartItem, PaymentMethod, PriceTier, Sale, SaleItem, SalePaymentMethod, SalePaymentRecord, SalePaymentStatus, SaleStatus } from '@/types'
import { api, getAll } from '@/lib/api'
import { useProductStore } from '@/store/productStore'
import { useInventoryStore } from '@/store/inventoryStore'

interface ApiSaleItem {
  id: number
  product_id: number
  name: string
  sku: string
  quantity: string | number
  unit_price: string | number
  unit_cost: number | null
  discount: string | number
  line_total: string | number
  gross_profit: number | null
  returned_quantity: string | number
}

interface ApiSalePayment {
  id: number
  payment_method: string
  amount: string | number
  reference: string | null
  payment_date: string
  created_at?: string | null
  received_by?: string | null
}

interface ApiSale {
  id: number
  invoice_no: string
  sale_date: string
  created_at: string
  counter: string
  cashier_id: number
  cashier_name?: string
  customer_name: string | null
  customer_phone?: string | null
  price_tier: PriceTier
  subtotal: string | number
  discount: string | number
  grand_total: string | number
  total_cost: number | null
  gross_profit: number | null
  amount_received: string | number
  change: string | number
  status: SaleStatus
  printed_at?: string | null
  payment_method?: string | null
  is_credit?: boolean
  payment_status?: SalePaymentStatus
  balance_due?: string | number
  settled_at?: string | null
  payments?: ApiSalePayment[]
  items?: ApiSaleItem[]
}

function toSaleItem(i: ApiSaleItem): SaleItem {
  const unit = useProductStore.getState().getProduct(String(i.product_id))?.unit ?? ''
  return {
    id: String(i.id),
    productId: String(i.product_id),
    name: i.name,
    code: i.sku,
    unit,
    qty: Number(i.quantity),
    unitPrice: Number(i.unit_price),
    unitCost: i.unit_cost ?? 0,
    discount: Number(i.discount),
    total: Number(i.line_total),
    returnedQty: Number(i.returned_quantity),
  }
}

function toPaymentRecord(p: ApiSalePayment): SalePaymentRecord {
  return {
    id: String(p.id),
    method: p.payment_method.toLowerCase() as PaymentMethod,
    amount: Number(p.amount),
    reference: p.reference ?? undefined,
    date: p.payment_date,
    createdAt: p.created_at ?? undefined,
    receivedBy: p.received_by ?? undefined,
  }
}

export function toSale(s: ApiSale): Sale {
  return {
    id: String(s.id),
    invoiceNo: s.invoice_no,
    date: s.sale_date,
    createdAt: s.created_at,
    counter: s.counter,
    cashierId: String(s.cashier_id),
    cashierName: s.cashier_name ?? '',
    customerName: s.customer_name ?? undefined,
    customerPhone: s.customer_phone ?? undefined,
    priceTier: s.price_tier,
    items: (s.items ?? []).map(toSaleItem),
    subtotal: Number(s.subtotal),
    discount: Number(s.discount),
    grandTotal: Number(s.grand_total),
    paymentMethod: (s.payment_method?.toLowerCase() ?? 'cash') as SalePaymentMethod,
    amountReceived: Number(s.amount_received),
    change: Number(s.change),
    status: s.status,
    printedAt: s.printed_at ?? null,
    isCredit: !!s.is_credit,
    paymentStatus: s.payment_status ?? 'paid',
    balanceDue: Number(s.balance_due ?? 0),
    settledAt: s.settled_at ?? null,
    payments: (s.payments ?? []).map(toPaymentRecord),
  }
}

export type CreditSaleFilter = 'outstanding' | 'settled' | 'all'

interface SalesState {
  sales: Sale[]
  loading: boolean
  /** Pay-later invoices, as last fetched for the Pay Later page. */
  creditSales: Sale[]
  creditLoading: boolean

  fetchAll: () => Promise<void>
  fetchCreditSales: (status: CreditSaleFilter) => Promise<void>
  receivePayment: (
    saleId: string,
    input: { amount: number; method: PaymentMethod; reference?: string; date?: string },
  ) => Promise<Sale>

  completeSale: (input: {
    items: CartItem[]
    subtotal: number
    discount: number
    grandTotal: number
    counter: string
    cashierId: string
    cashierName: string
    customerName?: string
    customerPhone?: string
    priceTier: PriceTier
    paymentMethod: SalePaymentMethod
    amountReceived: number
  }) => Promise<Sale>
  voidSale: (id: string) => Promise<void>
  markPrinted: (id: string) => Promise<void>
  createReturn: (
    saleId: string,
    input: { items: { saleItemId: string; quantity: number }[]; reason?: string; restock?: boolean },
  ) => Promise<{ totalRefund: number }>
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  loading: false,
  creditSales: [],
  creditLoading: false,

  fetchAll: async () => {
    set({ loading: true })
    const sales = await getAll<ApiSale>('/sales')
    set({ sales: sales.map(toSale), loading: false })
  },

  fetchCreditSales: async (status) => {
    set({ creditLoading: true })
    try {
      const sales = await getAll<ApiSale>(`/credit-sales?status=${status}`)
      set({ creditSales: sales.map(toSale) })
    } finally {
      set({ creditLoading: false })
    }
  },

  receivePayment: async (saleId, input) => {
    const sale = toSale(
      await api.post<ApiSale>(`/sales/${saleId}/payments`, {
        amount: input.amount,
        payment_method: input.method.toUpperCase(),
        reference: input.reference || undefined,
        payment_date: input.date,
      }),
    )
    set((state) => ({
      sales: state.sales.map((s) => (s.id === saleId ? sale : s)),
      creditSales: state.creditSales.map((s) => (s.id === saleId ? sale : s)),
    }))
    return sale
  },

  completeSale: async (input) => {
    const sale = toSale(
      await api.post<ApiSale>('/sales', {
        items: input.items.map((i) => ({
          product_id: i.productId,
          quantity: i.qty,
          discount: i.discount,
        })),
        price_tier: input.priceTier,
        // A genuinely separate whole-bill discount, distinct from the line discounts above —
        // the backend adds them together. Do NOT set this to a value derived from the line
        // discounts themselves (e.g. their sum) — that already burned us once (doubled every
        // discounted sale's total, since the backend already counts line discounts on its own).
        discount: input.discount,
        customer_name: input.customerName,
        customer_phone: input.customerPhone,
        payment_method: input.paymentMethod.toUpperCase(),
        amount_received: input.amountReceived,
      }),
    )
    set((state) => ({ sales: [sale, ...state.sales] }))
    // The sale consumed stock server-side — refresh products/batches so every screen reflects it.
    // Deliberately not awaited: the sale is already saved, and making the cashier wait for a full
    // product + inventory reload before the receipt appears was the main delay at checkout. The
    // backend still validates stock on the next sale, so a second of stale numbers is harmless.
    Promise.all([useProductStore.getState().fetchAll(), useInventoryStore.getState().fetchAll()]).catch((err) =>
      console.error('Background stock refresh after sale failed:', err),
    )
    return sale
  },

  voidSale: async (id) => {
    const sale = toSale(await api.post<ApiSale>(`/sales/${id}/void`))
    set((state) => ({ sales: state.sales.map((s) => (s.id === id ? sale : s)) }))
    await Promise.all([useProductStore.getState().fetchAll(), useInventoryStore.getState().fetchAll()])
  },

  markPrinted: async (id) => {
    const sale = toSale(await api.post<ApiSale>(`/sales/${id}/mark-printed`))
    set((state) => ({ sales: state.sales.map((s) => (s.id === id ? sale : s)) }))
  },

  createReturn: async (saleId, input) => {
    const result = await api.post<{ total_refund: string | number }>(`/sales/${saleId}/return`, {
      items: input.items.map((i) => ({ sale_item_id: i.saleItemId, quantity: i.quantity })),
      reason: input.reason || undefined,
      restock: input.restock,
    })
    // The return endpoint returns the SaleReturn record, not the updated Sale — refetch so
    // every item's returnedQty (and the restocked stock levels) reflect the change everywhere.
    await Promise.all([
      useSalesStore.getState().fetchAll(),
      useProductStore.getState().fetchAll(),
      useInventoryStore.getState().fetchAll(),
    ])
    return { totalRefund: Number(result.total_refund) }
  },
}))
