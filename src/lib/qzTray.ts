import qz from 'qz-tray'
import { api } from '@/lib/api'

// Signed with this bakery's own certificate (created once per server by `php artisan
// qz:certificate`; the private key never leaves the backend). Unsigned, QZ Tray treats the POS
// as an "anonymous" site and asks Allow/Block on every connection — it won't remember "Allow"
// for anonymous sites. Signed, the cashier ticks "Remember this decision" once per till. If the
// server has no certificate yet, or signing fails, it falls back to unsigned (prompting) mode
// rather than blocking printing.
qz.security.setCertificatePromise((resolve: (cert?: string) => void) => {
  api
    .get<{ certificate: string | null }>('/qz/certificate')
    .then((res) => resolve(res.certificate ?? undefined))
    .catch(() => resolve())
})
qz.security.setSignatureAlgorithm('SHA512')
qz.security.setSignaturePromise((toSign: string) => (resolve: (signature?: string) => void) => {
  api
    .post<{ signature: string | null }>('/qz/sign', { request: toSign })
    .then((res) => resolve(res.signature ?? undefined))
    .catch(() => resolve())
})

let connecting: Promise<void> | null = null

/** Connects once, reused across calls — QZ Tray itself only allows one active connection
 *  per browser tab anyway. Never throws for "already connected". */
export async function connectQz(): Promise<void> {
  if (qz.websocket.isActive()) return
  if (!connecting) {
    connecting = qz.websocket.connect().finally(() => {
      connecting = null
    })
  }
  return connecting
}

/** Opens the QZ Tray connection in the background so the first receipt doesn't pay the
 *  multi-second connect cost while the cashier waits. Failures are ignored here — printing
 *  itself reconnects and falls back to the browser dialog if QZ Tray is unreachable. */
export function warmUpQz(): void {
  connectQz().catch(() => {})
}

export function isQzConnected(): boolean {
  return qz.websocket.isActive()
}

/** Lists every printer QZ Tray can see on this machine (USB, serial, network, shared). */
export async function listPrinters(): Promise<string[]> {
  await connectQz()
  const result = await qz.printers.find()
  return Array.isArray(result) ? result : [result]
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** Sends a pre-built ESC/POS byte stream straight to the named printer — no browser print
 *  dialog, no rendering-to-bitmap step, so no antialiasing for the printer to dither into gray. */
export async function printRawEscPos(printerName: string, bytes: Uint8Array): Promise<void> {
  await connectQz()
  const config = qz.configs.create(printerName)
  await qz.print(config, [
    { type: 'raw', format: 'command', flavor: 'base64', data: toBase64(bytes), options: { language: 'ESCPOS' } },
  ])
}
