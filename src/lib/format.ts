import { useSettingsStore } from '@/store/settingsStore'

export function formatCurrency(amount: number): string {
  const symbol = useSettingsStore.getState().settings?.currencySymbol ?? 'Rs.'
  const rounded = Math.round(amount * 100) / 100
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${symbol} ${parts[0]}.${parts[1]}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return `${formatDate(iso)}  ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
}

export function formatTime(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
