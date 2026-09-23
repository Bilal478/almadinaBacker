let counter = 1000

export function nextId(prefix: string): string {
  counter += 1
  return `${prefix}-${counter}`
}

export function nextInvoiceNo(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  counter += 1
  return `INV-${y}${m}-${String(counter).slice(-5)}`
}

export function nextPurchaseNo(): string {
  const d = new Date()
  const y = d.getFullYear()
  counter += 1
  return `PO-${y}-${String(counter).slice(-5)}`
}
