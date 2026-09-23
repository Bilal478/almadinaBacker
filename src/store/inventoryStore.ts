import { create } from 'zustand'
import type { Batch } from '@/types'
import { getAll } from '@/lib/api'

interface ApiInventoryBatch {
  id: number
  product_id: number
  supplier_id: number | null
  batch_number: string
  purchase_id: number | null
  purchase_date: string
  expiry_date: string | null
  unit_cost: string | number
  original_quantity: string | number
  remaining_quantity: string | number
  supplier?: { name: string } | null
}

function toBatch(b: ApiInventoryBatch): Batch {
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

interface InventoryState {
  batches: Batch[]
  loading: boolean
  fetchAll: () => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set) => ({
  batches: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const batches = await getAll<ApiInventoryBatch>('/inventory')
    set({ batches: batches.map(toBatch), loading: false })
  },
}))
