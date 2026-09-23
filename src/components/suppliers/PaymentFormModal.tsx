import { useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useSupplierStore } from '@/store/supplierStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { PaymentMethod, Supplier } from '@/types'

const METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'other']

export function PaymentFormModal({ open, supplier, onClose }: { open: boolean; supplier: Supplier | null; onClose: () => void }) {
  const addSupplierPayment = useSupplierStore((s) => s.addSupplierPayment)
  const pushToast = useUiStore((s) => s.pushToast)

  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setAmount('')
    setMethod('cash')
    setDate(new Date().toISOString().slice(0, 10))
    setReference('')
    setNotes('')
  }

  async function handleSubmit() {
    if (submitting || !supplier) return
    const value = Number(amount)
    if (!value || value <= 0) {
      pushToast('error', 'Enter a valid payment amount.')
      return
    }
    setSubmitting(true)
    try {
      await addSupplierPayment({
        supplierId: supplier.id,
        amount: value,
        method,
        date,
        reference: reference || `PAY-${Date.now().toString().slice(-6)}`,
        notes: notes || undefined,
      })
      pushToast('success', `Payment of ${value} recorded for ${supplier.name}.`)
      reset()
      onClose()
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to record payment.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title="Record Supplier Payment"
      subtitle={supplier?.name}
      onClose={onClose}
      width="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : 'Save Payment'}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Amount</label>
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Payment Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {m.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Reference</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Optional"
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
        <div className="col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Notes</label>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </Modal>
  )
}
