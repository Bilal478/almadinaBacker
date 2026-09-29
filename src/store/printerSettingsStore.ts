import { create } from 'zustand'

/**
 * Unlike every other store in this app, this one is genuinely per-till hardware config, not
 * shared business data — the printer physically plugged into THIS machine has nothing to do
 * with what's plugged into the counter next to it. It lives only in this browser's
 * localStorage and is never sent to the backend.
 */
const STORAGE_KEY = 'bakery-printer-settings'

export type PaperWidth = '58mm' | '80mm'

export interface PrinterSettings {
  /** Whether to attempt direct ESC/POS printing at all — off by default so nothing changes
   *  for a till until someone has actually installed QZ Tray and picked a printer. */
  enabled: boolean
  printerName: string | null
  paperWidth: PaperWidth
}

const DEFAULT_SETTINGS: PrinterSettings = { enabled: false, printerName: null, paperWidth: '80mm' }

function load(): PrinterSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

function persist(settings: PrinterSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // A private/locked-down browser profile can throw here — direct printing just won't
    // remember its config across reloads, which is a minor inconvenience, not a crash.
  }
}

interface PrinterSettingsState extends PrinterSettings {
  update: (patch: Partial<PrinterSettings>) => void
}

export const usePrinterSettingsStore = create<PrinterSettingsState>((set, get) => ({
  ...load(),
  update: (patch) => {
    const { enabled, printerName, paperWidth } = { ...get(), ...patch }
    persist({ enabled, printerName, paperWidth })
    set(patch)
  },
}))
