import qz from 'qz-tray'

// Unsigned mode — no certificate authority, no signing service. QZ Tray will show its own
// "unsigned request" trust prompt the first time this browser profile connects (the user can
// tick "remember this decision" so it doesn't ask again); a paid signing certificate would
// suppress that prompt entirely, but isn't required for this to work.
qz.security.setCertificatePromise((resolve: () => void) => resolve())
qz.security.setSignaturePromise(() => (resolve: () => void) => resolve())

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
