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
  /** Characters the printer's built-in font fits on one line. null = the usual value for the
   *  paper width (see defaultCharsPerLine). Needed because 80mm printers genuinely differ — some
   *  fit 48, many only 42 — and sending more than the printer fits makes it wrap every row. */
  charsPerLine: number | null
}

const DEFAULT_SETTINGS: PrinterSettings = { enabled: false, printerName: null, paperWidth: '80mm', charsPerLine: null }

export function defaultCharsPerLine(paperWidth: PaperWidth): number {
  return paperWidth === '80mm' ? 42 : 32
}

export function effectiveCharsPerLine(settings: Pick<PrinterSettings, 'paperWidth' | 'charsPerLine'>): number {
  return settings.charsPerLine ?? defaultCharsPerLine(settings.paperWidth)
}

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
    const { enabled, printerName, paperWidth, charsPerLine } = { ...get(), ...patch }
    persist({ enabled, printerName, paperWidth, charsPerLine })
    set(patch)
  },
}))
