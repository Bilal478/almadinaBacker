import { create } from 'zustand'
import type { Batch } from '@/types'
import { api, getAll } from '@/lib/api'
import { useProductStore } from '@/store/productStore'

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

export type AdjustmentType = 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'EXPIRY'

interface InventoryState {
  batches: Batch[]
  loading: boolean
  fetchAll: () => Promise<void>
  /** No supplier involved — a manual correction to what the system thinks is on the shelf.
   *  ADJUSTMENT_IN needs no batchId (a fresh "found stock" batch is created); the other three
   *  types remove stock from a specific existing batch and require one. */
  adjustStock: (input: { productId: string; movementType: AdjustmentType; quantity: number; reason: string; batchId?: string }) => Promise<void>
  updateExpiry: (batchId: string, expiryDate: string | null) => Promise<void>
}

export const useInventoryStore = create<InventoryState>((set) => ({
  batches: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const batches = await getAll<ApiInventoryBatch>('/inventory')
    set({ batches: batches.map(toBatch), loading: false })
  },

  adjustStock: async (input) => {
    await api.post('/inventory/adjustment', {
      product_id: input.productId,
      batch_id: input.batchId || undefined,
      quantity: input.quantity,
      movement_type: input.movementType,
      reason: input.reason,
    })
    await Promise.all([useInventoryStore.getState().fetchAll(), useProductStore.getState().fetchAll()])
  },

  updateExpiry: async (batchId, expiryDate) => {
    await api.patch(`/inventory/batches/${batchId}/expiry`, { expiry_date: expiryDate })
    await useInventoryStore.getState().fetchAll()
  },
}))
