import type { Sale } from '@/types'
import type { BusinessSettings } from '@/store/settingsStore'
import { usePrinterSettingsStore } from '@/store/printerSettingsStore'
import { buildReceiptEscPos } from '@/lib/receiptEscPos'
import { printRawEscPos } from '@/lib/qzTray'

export type PrintMethod = 'direct' | 'browser'

export interface PrintResult {
  method: PrintMethod
  /** Set only when direct printing was configured but failed and it fell back to the browser
   *  dialog — the caller can surface this so the fallback isn't a silent surprise. */
  fallbackReason?: string
}

/**
 * Tries direct ESC/POS printing via QZ Tray first (silent, no dialog, pure black — see
 * receiptEscPos.ts for why); falls back to the browser's print dialog if direct printing
 * isn't configured on this till or the printer/QZ Tray isn't reachable right now. The caller
 * only needs to know which path actually happened — 'browser' still needs the existing
 * `afterprint` listener to know when printing is done, 'direct' already knows it's done by
 * the time this resolves.
 */
export async function printReceipt(sale: Sale, settings: BusinessSettings | null): Promise<PrintResult> {
  const { enabled, printerName, paperWidth } = usePrinterSettingsStore.getState()

  if (enabled && printerName) {
    try {
      const columns = paperWidth === '80mm' ? 48 : 32
      const bytes = buildReceiptEscPos(sale, settings, columns)
      await printRawEscPos(printerName, bytes)
      return { method: 'direct' }
    } catch (err) {
      console.error('Direct print failed, falling back to the browser print dialog:', err)
      window.print()
      return { method: 'browser', fallbackReason: err instanceof Error ? err.message : 'Direct printing failed' }
    }
  }

  window.print()
  return { method: 'browser' }
}
