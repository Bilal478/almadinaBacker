import { useSettingsStore } from '@/store/settingsStore'

/** The number part only — no currency symbol — e.g. "1,234.50" or "-1,234.50". */
export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100
  const sign = rounded < 0 ? '-' : ''
  const abs = Math.abs(rounded)
  const parts = abs.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${sign}${parts[0]}.${parts[1]}`
}

export function formatCurrency(amount: number): string {
  const symbol = useSettingsStore.getState().settings?.currencySymbol ?? 'Rs.'
  // Sign goes before the symbol ("-Rs. 5.00"), not between symbol and number — formatAmount's
  // own leading sign would otherwise land in the wrong place, so pull it out here. Computed
  // from the ROUNDED value, not the raw one, so e.g. -0.001 (rounds to 0.00) isn't shown as
  // "-Rs. 0.00".
  const rounded = Math.round(amount * 100) / 100
  const sign = rounded < 0 ? '-' : ''
  return `${sign}${symbol} ${formatAmount(Math.abs(rounded))}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

// Kilogram/Litre are the two "bulk, fractional" units this app seeds by default — selling
// 0.3 kg of something is correct math, but "300 g" is what a customer actually reads on a
// receipt. Anything not in this map (pcs, dozen, box…) has no natural smaller unit, so it's
// left as-is.
const SUB_UNITS: Record<string, { symbol: string; factor: number }> = {
  kg: { symbol: 'g', factor: 1000 },
  ltr: { symbol: 'ml', factor: 1000 },
}

/** Formats a quantity for display, switching to the natural smaller unit under 1 (0.3 kg
 *  becomes "300 g", 0.3 dozen stays "0.3 dozen" — there's no smaller everyday unit for that). */
export function formatQuantity(qty: number, unitSymbol: string): string {
  const sub = SUB_UNITS[unitSymbol.toLowerCase()]
  if (sub && qty > 0 && qty < 1) {
    return `${Math.round(qty * sub.factor)} ${sub.symbol}`
  }
  return `${formatNumber(qty)} ${unitSymbol}`
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
