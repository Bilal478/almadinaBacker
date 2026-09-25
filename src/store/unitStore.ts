import { create } from 'zustand'
import type { UnitOfMeasure } from '@/types'
import { api, getAll } from '@/lib/api'

interface ApiUnit {
  id: number
  name: string
  symbol: string
  status: UnitOfMeasure['status']
  decimal_allowed: boolean
}

function normalize(u: ApiUnit): UnitOfMeasure {
  return { id: String(u.id), code: u.symbol, name: u.name, status: u.status, decimalAllowed: u.decimal_allowed }
}

interface UnitState {
  units: UnitOfMeasure[]
  loading: boolean
  fetchAll: () => Promise<void>
  getUnit: (code: string) => UnitOfMeasure | undefined
  addUnit: (unit: { code: string; name: string; decimalAllowed?: boolean }) => Promise<UnitOfMeasure>
  updateUnit: (id: string, patch: { code: string; name: string; decimalAllowed?: boolean }) => Promise<UnitOfMeasure>
  setUnitStatus: (id: string, status: UnitOfMeasure['status']) => Promise<UnitOfMeasure>
}

export const useUnitStore = create<UnitState>((set, get) => ({
  units: [],
  loading: false,

  fetchAll: async () => {
    set({ loading: true })
    const units = await getAll<ApiUnit>('/units')
    set({ units: units.map(normalize), loading: false })
  },

  getUnit: (code) => get().units.find((u) => u.code === code),

  addUnit: async (unit) => {
    const created = normalize(
      await api.post<ApiUnit>('/units', { name: unit.name, symbol: unit.code, decimal_allowed: unit.decimalAllowed ?? false }),
    )
    set((state) => ({ units: [...state.units, created] }))
    return created
  },

  updateUnit: async (id, patch) => {
    const updated = normalize(
      await api.put<ApiUnit>(`/units/${id}`, { name: patch.name, symbol: patch.code, decimal_allowed: patch.decimalAllowed ?? false }),
    )
    set((state) => ({ units: state.units.map((u) => (u.id === id ? updated : u)) }))
    return updated
  },

  setUnitStatus: async (id, status) => {
    const updated = normalize(await api.patch<ApiUnit>(`/units/${id}/status`, { status }))
    set((state) => ({ units: state.units.map((u) => (u.id === id ? updated : u)) }))
    return updated
  },
}))
