import { create } from 'zustand'
import { api } from '@/lib/api'

export interface BusinessSettings {
  storeName: string
  address: string
  phone: string
  email: string
  taxId: string
  currencyCode: string
  currencySymbol: string
  lowStockAlertDefault: number
  receiptFooter: string
}

interface ApiBusinessSetting {
  store_name: string
  address: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  currency_code: string
  currency_symbol: string
  low_stock_alert_default: number
  receipt_footer: string | null
}

function toSettings(s: ApiBusinessSetting): BusinessSettings {
  return {
    storeName: s.store_name,
    address: s.address ?? '',
    phone: s.phone ?? '',
    email: s.email ?? '',
    taxId: s.tax_id ?? '',
    currencyCode: s.currency_code,
    currencySymbol: s.currency_symbol,
    lowStockAlertDefault: s.low_stock_alert_default,
    receiptFooter: s.receipt_footer ?? '',
  }
}

interface SettingsState {
  settings: BusinessSettings | null
  loading: boolean
  fetch: () => Promise<void>
  save: (next: BusinessSettings) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: false,

  fetch: async () => {
    set({ loading: true })
    const data = await api.get<ApiBusinessSetting>('/settings')
    set({ settings: toSettings(data), loading: false })
  },

  save: async (next) => {
    const data = await api.put<ApiBusinessSetting>('/settings', {
      store_name: next.storeName,
      address: next.address || null,
      phone: next.phone || null,
      email: next.email || null,
      tax_id: next.taxId || null,
      currency_code: next.currencyCode,
      currency_symbol: next.currencySymbol,
      low_stock_alert_default: next.lowStockAlertDefault,
      receipt_footer: next.receiptFooter || null,
    })
    set({ settings: toSettings(data) })
  },
}))
