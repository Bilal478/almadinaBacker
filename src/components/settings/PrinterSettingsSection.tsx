import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { usePrinterSettingsStore, defaultCharsPerLine } from '@/store/printerSettingsStore'
import { listPrinters, isQzConnected } from '@/lib/qzTray'
import { useUiStore } from '@/store/uiStore'

const selectClass =
  'w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'

/**
 * Deliberately separate from the shared BusinessSettings form/save button above it — this is
 * hardware config for THIS specific till (localStorage only, see printerSettingsStore.ts), so
 * it saves itself immediately on every change rather than waiting for "Save Settings".
 */
export function PrinterSettingsSection() {
  const { enabled, printerName, paperWidth, charsPerLine, update } = usePrinterSettingsStore()
  const pushToast = useUiStore((s) => s.pushToast)
  const [printers, setPrinters] = useState<string[]>([])
  const [detecting, setDetecting] = useState(false)

  async function handleDetect() {
    setDetecting(true)
    try {
      const found = await listPrinters()
      setPrinters(found)
      if (found.length === 0) {
        pushToast('warning', 'QZ Tray is running but found no printers. Check it\'s connected and turned on.')
      } else {
        pushToast('success', `Found ${found.length} printer(s).`)
        if (!printerName) update({ printerName: found[0] })
      }
    } catch {
      pushToast(
        'error',
        "Couldn't reach QZ Tray on this device. Install it from qz.io and make sure it's running, then try again.",
      )
    } finally {
      setDetecting(false)
    }
  }

  return (
    <div className="rounded border border-border bg-panel p-4">
      <div className="mb-3">
        <div className="text-[13px] font-semibold text-ink">Direct Printing (This Device Only)</div>
        <div className="text-[11px] text-ink-faint">
          Sends receipts straight to the printer as real text via{' '}
          <a href="https://qz.io" target="_blank" rel="noreferrer" className="underline">
            QZ Tray
          </a>{' '}
          instead of the browser's print dialog — pure black, no faint/gray edges. Requires QZ Tray installed and
          running on this till. This setting only applies to this device, not your whole business.
        </div>
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
        <input type="checkbox" checked={enabled} onChange={(e) => update({ enabled: e.target.checked })} />
        Enable direct printing on this device
      </label>

      {enabled && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Paper Width</label>
            <select value={paperWidth} onChange={(e) => update({ paperWidth: e.target.value as '58mm' | '80mm' })} className={selectClass}>
              <option value="80mm">80mm</option>
              <option value="58mm">58mm</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Printer</label>
            <div className="flex gap-1.5">
              <select value={printerName ?? ''} onChange={(e) => update({ printerName: e.target.value || null })} className={selectClass}>
                <option value="">Select a printer…</option>
                {printerName && !printers.includes(printerName) && <option value={printerName}>{printerName}</option>}
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleDetect}
                disabled={detecting}
                title="Detect printers via QZ Tray"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border-strong text-ink-soft hover:bg-panel-alt disabled:opacity-50"
              >
                <RefreshCw size={14} className={detecting ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          <div className="col-span-2">
            <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Characters Per Line</label>
            <select
              value={charsPerLine ?? ''}
              onChange={(e) => update({ charsPerLine: e.target.value ? Number(e.target.value) : null })}
              className={selectClass}
            >
              <option value="">Default for {paperWidth} ({defaultCharsPerLine(paperWidth)})</option>
              {[32, 42, 48].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <div className="mt-1 text-[11px] text-ink-faint">
              If receipt lines wrap onto a second line, pick a smaller number. If there's an empty margin on the right,
              pick a larger one.
            </div>
          </div>

          <div className="col-span-2 text-[11px] text-ink-faint">
            QZ Tray: {isQzConnected() ? 'Connected' : 'Not connected yet — click the detect button to connect.'}
          </div>
        </div>
      )}
    </div>
  )
}
