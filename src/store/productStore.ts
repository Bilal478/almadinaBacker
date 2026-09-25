import { create } from 'zustand'
import type { Batch, CurrentPrice, PriceHistoryEntry, PriceTier, Product, ProductStatus, Unit } from '@/types'
import { api, getAll } from '@/lib/api'
import { useUnitStore } from '@/store/unitStore'

interface ApiProduct {
  id: number
  name: string
  sku: string
  barcode: string | null
  qr_code: string | null
  category_id: number | null
  category_name: string | null
  unit: { id: number; name: string; symbol: string }
  current_purchase_cost?: number
  current_customer_price: number
  current_retailer_price: number
  low_stock_alert_qty: number
  expiry_controlled: boolean
  status: ProductStatus
  available_stock: number
  nearest_expiry: string | null
  is_low_stock: boolean
}

interface ApiPriceHistoryEntry {
  id: number
  product_id: number
  effective_from: string
  purchase_cost: number
  customer_price: number
  retailer_price: number
  note: string | null
  created_by?: { name: string } | null
}

interface ApiBatch {
  id: number
  product_id: number
  batch_number: string
  purchase_id: number | null
  supplier_id: number | null
  purchase_date: string
  expiry_date: string | null
  unit_cost: string | number
  original_quantity: string | number
  remaining_quantity: string | number
  supplier?: { name: string } | null
}

function toProduct(p: ApiProduct): Product {
  return {
    id: String(p.id),
    code: p.sku,
    // Normalized to '' here so the rest of the app (search filters, the form, scan-match
    // checks) can keep treating `barcode` as a plain string everywhere — "no barcode" is
    // represented the same way the Add Product form already produces it.
    barcode: p.barcode ?? '',
    qrCode: p.qr_code ?? undefined,
    name: p.name,
    category: p.category_name ?? '',
    categoryId: p.category_id !== null ? String(p.category_id) : '',
    unit: p.unit.symbol,
    lowStockLevel: p.low_stock_alert_qty,
    expiryTracking: p.expiry_controlled,
    status: p.status,
    createdAt: '',
    stock: p.available_stock,
    nearestExpiry: p.nearest_expiry,
    currentPrice: {
      purchaseCost: p.current_purchase_cost ?? 0,
      customerPrice: p.current_customer_price,
      retailerPrice: p.current_retailer_price,
      effectiveDate: '',
    },
  }
}

function toPriceHistory(p: ApiPriceHistoryEntry): PriceHistoryEntry {
  return {
    id: String(p.id),
    productId: String(p.product_id),
    effectiveDate: p.effective_from,
    purchaseCost: Number(p.purchase_cost),
    customerPrice: Number(p.customer_price),
    retailerPrice: Number(p.retailer_price),
    changedBy: p.created_by?.name ?? 'Unknown',
    note: p.note ?? undefined,
  }
}

function toBatch(b: ApiBatch): Batch {
  return {
    id: String(b.id),
    productId: String(b.product_id),
    batchNo: b.batch_number,
    purchaseId: b.purchase_id !== null ? String(b.purchase_id) : '',
    supplierId: b.supplier_id !== null ? String(b.supplier_id) : '',
    purchaseDate: b.purchase_date,
    expiryDate: b.expiry_date ?? undefined,
    cost: Number(b.unit_cost),
    quantity: Number(b.original_quantity),
    remaining: Number(b.remaining_quantity),
    supplierName: b.supplier?.name ?? 'Opening Stock',
  }
}

interface ProductState {
  products: Product[]
  loading: boolean
  priceHistoryByProduct: Record<string, PriceHistoryEntry[]>
  batchesByProduct: Record<string, Batch[]>

  fetchAll: () => Promise<void>
  fetchPriceHistory: (productId: string) => Promise<void>
  fetchBatches: (productId: string) => Promise<void>

  getProduct: (id: string) => Product | undefined
  getCurrentPrice: (productId: string) => CurrentPrice | undefined
  getPriceForTier: (productId: string, tier: PriceTier) => number
  getPriceHistoryFor: (productId: string) => PriceHistoryEntry[]
  getBatchesFor: (productId: string) => Batch[]
  getStock: (productId: string) => number
  getNearestExpiry: (productId: string) => string | undefined
  isLowStock: (productId: string) => boolean

  addProduct: (product: {
    name: string
    /** Leave unset to have the backend assign one automatically (e.g. "BAK-004"). */
    code?: string
    barcode: string
    qrCode?: string
    categoryId?: string
    unit: Unit
    lowStockLevel: number
    expiryTracking: boolean
    status?: ProductStatus
    purchaseCost: number
    customerPrice: number
    retailerPrice: number
    openingQuantity?: number
    openingExpiryDate?: string
  }) => Promise<Product>
  updateProduct: (id: string, patch: Partial<Product>) => Promise<void>
  setProductStatus: (id: string, status: ProductStatus) => Promise<void>
  addPriceHistoryEntry: (entry: {
    productId: string
    purchaseCost: number
    customerPrice: number
    retailerPrice: number
    effectiveDate?: string
    note?: string
  }) => Promise<void>
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  loading: false,
  priceHistoryByProduct: {},
  batchesByProduct: {},

  fetchAll: async () => {
    set({ loading: true })
    const products = await getAll<ApiProduct>('/products')
    set({ products: products.map(toProduct), loading: false })
  },

  fetchPriceHistory: async (productId) => {
    const rows = await getAll<ApiPriceHistoryEntry>(`/products/${productId}/price-history`)
    // Backend returns insertion order; the UI expects most-recent-first so it can badge the current price.
    const entries = rows
      .map(toPriceHistory)
      .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate) || Number(b.id) - Number(a.id))
    set((state) => ({ priceHistoryByProduct: { ...state.priceHistoryByProduct, [productId]: entries } }))
  },

  fetchBatches: async (productId) => {
    const { batches } = await api.get<{ batches: ApiBatch[] }>(`/products/${productId}/stock`)
    set((state) => ({ batchesByProduct: { ...state.batchesByProduct, [productId]: batches.map(toBatch) } }))
  },

  getProduct: (id) => get().products.find((p) => p.id === id),
  getCurrentPrice: (productId) => get().getProduct(productId)?.currentPrice ?? undefined,
  getPriceForTier: (productId, tier) => {
    const price = get().getCurrentPrice(productId)
    if (!price) return 0
    return tier === 'retailer' ? price.retailerPrice : price.customerPrice
  },
  getPriceHistoryFor: (productId) => get().priceHistoryByProduct[productId] ?? [],
  getBatchesFor: (productId) => get().batchesByProduct[productId] ?? [],
  getStock: (productId) => get().getProduct(productId)?.stock ?? 0,
  getNearestExpiry: (productId) => get().getProduct(productId)?.nearestExpiry ?? undefined,
  isLowStock: (productId) => {
    const product = get().getProduct(productId)
    return product ? product.stock <= product.lowStockLevel : false
  },

  addProduct: async (product) => {
    const unitId = useUnitStore.getState().getUnit(product.unit)?.id
    const created = toProduct(
      await api.post<ApiProduct>('/products', {
        name: product.name,
        sku: product.code,
        barcode: product.barcode,
        qr_code: product.qrCode,
        category_id: product.categoryId,
        unit_id: unitId,
        low_stock_alert_qty: product.lowStockLevel,
        expiry_controlled: product.expiryTracking,
        status: product.status ?? 'active',
        purchase_cost: product.purchaseCost,
        customer_price: product.customerPrice,
        retailer_price: product.retailerPrice,
        opening_quantity: product.openingQuantity,
        opening_expiry_date: product.openingExpiryDate,
      }),
    )
    set((state) => ({ products: [...state.products, created] }))
    return created
  },

  updateProduct: async (id, patch) => {
    const unitId = patch.unit ? useUnitStore.getState().getUnit(patch.unit)?.id : undefined
    const updated = toProduct(
      await api.put<ApiProduct>(`/products/${id}`, {
        name: patch.name,
        sku: patch.code,
        barcode: patch.barcode,
        qr_code: patch.qrCode,
        category_id: patch.categoryId,
        unit_id: unitId,
        low_stock_alert_qty: patch.lowStockLevel,
        expiry_controlled: patch.expiryTracking,
        status: patch.status,
      }),
    )
    set((state) => ({ products: state.products.map((p) => (p.id === id ? updated : p)) }))
  },

  setProductStatus: async (id, status) => {
    const updated = toProduct(await api.patch<ApiProduct>(`/products/${id}/status`, { status }))
    set((state) => ({ products: state.products.map((p) => (p.id === id ? updated : p)) }))
  },

  addPriceHistoryEntry: async (entry) => {
    await api.post(`/products/${entry.productId}/price-history`, {
      purchase_cost: entry.purchaseCost,
      customer_price: entry.customerPrice,
      retailer_price: entry.retailerPrice,
      effective_from: entry.effectiveDate,
      note: entry.note,
    })
    // The product's cached current_* price changed — refresh it and its history cache.
    const updated = toProduct(await api.get<ApiProduct>(`/products/${entry.productId}`))
    set((state) => ({ products: state.products.map((p) => (p.id === entry.productId ? updated : p)) }))
    await get().fetchPriceHistory(entry.productId)
  },
}))
