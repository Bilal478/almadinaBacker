import { create } from 'zustand'
import type { CartItem, PaymentMethod, PriceTier, Product } from '@/types'
import { useProductStore } from '@/store/productStore'
import { nextId } from '@/lib/id'

export interface HeldSale {
  id: string
  heldAt: string
  items: CartItem[]
  customerName?: string
  priceTier: PriceTier
}

interface CartState {
  items: CartItem[]
  customerName: string
  priceTier: PriceTier
  paymentMethod: PaymentMethod
  amountReceived: string
  heldSales: HeldSale[]

  addProduct: (product: Product) => void
  incQty: (productId: string) => void
  decQty: (productId: string) => void
  setQty: (productId: string, qty: number) => void
  removeItem: (productId: string) => void
  setLineDiscount: (productId: string, discount: number) => void
  removeLast: () => void

  setCustomerName: (name: string) => void
  setPriceTier: (tier: PriceTier) => void
  setPaymentMethod: (method: PaymentMethod) => void
  setAmountReceived: (value: string) => void

  holdSale: () => void
  resumeHeldSale: (id: string) => void
  discardHeldSale: (id: string) => void

  clearCart: () => void

  subtotal: () => number
  totalDiscount: () => number
  grandTotal: () => number
}

function priceFor(product: Product, tier: PriceTier): number {
  return useProductStore.getState().getPriceForTier(product.id, tier)
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerName: '',
  priceTier: 'customer',
  paymentMethod: 'cash',
  amountReceived: '',
  heldSales: [],

  addProduct: (product) => {
    const { priceTier, items } = get()
    const existing = items.find((i) => i.productId === product.id)
    if (existing) {
      get().incQty(product.id)
      return
    }
    const unitPrice = priceFor(product, priceTier)
    // Best-effort estimate for an in-progress cart preview — the server recomputes the real
    // FIFO-weighted cost authoritatively when the sale is completed.
    const unitCost = product.currentPrice?.purchaseCost ?? 0
    const newItem: CartItem = {
      productId: product.id,
      name: product.name,
      code: product.code,
      unit: product.unit,
      qty: 1,
      unitPrice,
      unitCost,
      discount: 0,
      batchAllocations: [],
    }
    set({ items: [...items, newItem] })
  },

  incQty: (productId) => {
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, qty: i.qty + 1 } : i)),
    }))
  },

  decQty: (productId) => {
    set((state) => ({
      items: state.items
        .map((i) => (i.productId === productId ? { ...i, qty: i.qty - 1 } : i))
        .filter((i) => i.qty > 0),
    }))
  },

  setQty: (productId, qty) => {
    if (qty <= 0) {
      get().removeItem(productId)
      return
    }
    set((state) => ({ items: state.items.map((i) => (i.productId === productId ? { ...i, qty } : i)) }))
  },

  removeItem: (productId) => {
    set((state) => ({ items: state.items.filter((i) => i.productId !== productId) }))
  },

  setLineDiscount: (productId, discount) => {
    set((state) => ({
      items: state.items.map((i) => (i.productId === productId ? { ...i, discount: Math.max(0, discount) } : i)),
    }))
  },

  removeLast: () => {
    set((state) => ({ items: state.items.slice(0, -1) }))
  },

  setCustomerName: (name) => set({ customerName: name }),
  setPriceTier: (tier) => {
    set((state) => ({
      priceTier: tier,
      items: state.items.map((i) => {
        const product = useProductStore.getState().getProduct(i.productId)
        return product ? { ...i, unitPrice: priceFor(product, tier) } : i
      }),
    }))
  },
  setPaymentMethod: (method) => set({ paymentMethod: method }),
  setAmountReceived: (value) => set({ amountReceived: value }),

  holdSale: () => {
    const { items, customerName, priceTier } = get()
    if (items.length === 0) return
    const held: HeldSale = {
      id: nextId('hold'),
      heldAt: new Date().toISOString(),
      items,
      customerName: customerName || undefined,
      priceTier,
    }
    set((state) => ({ heldSales: [held, ...state.heldSales], items: [], customerName: '', amountReceived: '' }))
  },

  resumeHeldSale: (id) => {
    const held = get().heldSales.find((h) => h.id === id)
    if (!held) return
    set((state) => ({
      items: held.items,
      customerName: held.customerName ?? '',
      priceTier: held.priceTier,
      heldSales: state.heldSales.filter((h) => h.id !== id),
    }))
  },

  discardHeldSale: (id) => {
    set((state) => ({ heldSales: state.heldSales.filter((h) => h.id !== id) }))
  },

  clearCart: () => set({ items: [], customerName: '', amountReceived: '' }),

  subtotal: () => get().items.reduce((s, i) => s + i.qty * i.unitPrice, 0),
  totalDiscount: () => get().items.reduce((s, i) => s + i.discount, 0),
  grandTotal: () => get().subtotal() - get().totalDiscount(),
}))
