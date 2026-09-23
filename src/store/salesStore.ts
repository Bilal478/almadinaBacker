import { create } from 'zustand'
import type { CartItem, PaymentMethod, PriceTier, Sale, SaleItem, SaleStatus } from '@/types'
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

interface ApiSale {
  id: number
  invoice_no: string
  sale_date: string
  created_at: string
  counter: string
  cashier_id: number
  cashier_name?: string
  customer_name: string | null
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
  items?: ApiSaleItem[]
}

function toSaleItem(i: ApiSaleItem): SaleItem {
  const unit = useProductStore.getState().getProduct(String(i.product_id))?.unit ?? ''
  return {
    productId: String(i.product_id),
    name: i.name,
    code: i.sku,
    unit,
    qty: Number(i.quantity),
    unitPrice: Number(i.unit_price),
    unitCost: i.unit_cost ?? 0,
    discount: Number(i.discount),
    total: Number(i.line_total),
  }
}

function toSale(s: ApiSale): Sale {
  return {
    id: String(s.id),
    invoiceNo: s.invoice_no,
    date: s.sale_date,
    createdAt: s.created_at,
    counter: s.counter,
    cashierId: String(s.cashier_id),
    cashierName: s.cashier_name ?? '',
    customerName: s.customer_name ?? undefined,
    priceTier: s.price_tier,
    items: (s.items ?? []).map(toSaleItem),
    subtotal: Number(s.subtotal),
    discount: Number(s.discount),
    grandTotal: Number(s.grand_total),
    paymentMethod: (s.payment_method?.toLowerCase() ?? 'cash') as PaymentMethod,
    amountReceived: Number(s.amount_received),
    change: Number(s.change),
    status: s.status,
    printedAt: s.printed_at ?? null,
  }
}

interface SalesState {
  sales: Sale[]
  loading: boolean

  fetchAll: () => Promise<void>

  completeSale: (input: {
    items: CartItem[]
    subtotal: number
    discount: number
    grandTotal: number
    counter: string
    cashierId: string
    cashierName: string
    customerName?: string
    priceTier: PriceTier
    paymentMethod: PaymentMethod
    amountReceived: number
  }) => Promise<Sale>
  voidSale: (id: string) => Promise<void>
  markPrinted: (id: string) => Promise<void>
}

export const useSalesStore = create<SalesState>((set) => ({
  sales: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const sales = await getAll<ApiSale>('/sales')
    set({ sales: sales.map(toSale), loading: false })
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
        discount: input.discount,
        customer_name: input.customerName,
        payment_method: input.paymentMethod.toUpperCase(),
        amount_received: input.amountReceived,
      }),
    )
    set((state) => ({ sales: [sale, ...state.sales] }))
    // The sale consumed stock server-side — refresh products/batches so every screen reflects it.
    await Promise.all([useProductStore.getState().fetchAll(), useInventoryStore.getState().fetchAll()])
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
}))
