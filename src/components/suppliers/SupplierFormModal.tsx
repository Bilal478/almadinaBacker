import { useEffect, useMemo, useState } from 'react'
import { Modal } from '@/components/common/Modal'
import { Button } from '@/components/common/Button'
import { useSupplierStore } from '@/store/supplierStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'
import type { Supplier } from '@/types'

interface FormState {
  name: string
  phone: string
  address: string
  supplierTypeId: string
  status: 'active' | 'inactive'
  openingBalance: string
}

export function SupplierFormModal({ open, supplier, onClose }: { open: boolean; supplier: Supplier | null; onClose: () => void }) {
  const allSupplierTypes = useSupplierStore((s) => s.supplierTypes)
  const supplierTypes = useMemo(() => allSupplierTypes.filter((t) => t.status === 'active'), [allSupplierTypes])
  const addSupplier = useSupplierStore((s) => s.addSupplier)
  const updateSupplier = useSupplierStore((s) => s.updateSupplier)
  const pushToast = useUiStore((s) => s.pushToast)
  const isEdit = !!supplier

  const [form, setForm] = useState<FormState>({
    name: '',
    phone: '',
    address: '',
    supplierTypeId: supplierTypes[0]?.id ?? '',
    status: 'active',
    openingBalance: '0',
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name,
        phone: supplier.phone,
        address: supplier.address,
        supplierTypeId: supplier.supplierTypeId,
        status: supplier.status,
        openingBalance: String(supplier.openingBalance),
      })
    } else {
      setForm({ name: '', phone: '', address: '', supplierTypeId: supplierTypes[0]?.id ?? '', status: 'active', openingBalance: '0' })
    }
  }, [supplier, open, supplierTypes])

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return
    if (!form.name.trim() || !form.phone.trim()) {
      pushToast('error', 'Supplier name and phone are required.')
      return
    }
    setSubmitting(true)
    try {
      if (isEdit && supplier) {
        await updateSupplier(supplier.id, {
          name: form.name,
          phone: form.phone,
          address: form.address,
          supplierTypeId: form.supplierTypeId,
          status: form.status,
        })
        pushToast('success', 'Supplier updated.')
      } else {
        await addSupplier({
          name: form.name,
          phone: form.phone,
          address: form.address,
          supplierTypeId: form.supplierTypeId,
          status: form.status,
          openingBalance: Number(form.openingBalance) || 0,
        })
        pushToast('success', 'Supplier added.')
      }
      onClose()
    } catch (err) {
      pushToast('error', err instanceof ApiError ? err.message : 'Failed to save supplier.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={isEdit ? 'Edit Supplier' : 'Add Supplier'}
      onClose={onClose}
      width="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Supplier'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
        <Field label="Supplier Name" value={form.name} onChange={(v) => set('name', v)} span2 />
        <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Supplier Type</label>
          <select
            value={form.supplierTypeId}
            onChange={(e) => set('supplierTypeId', e.target.value)}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {supplierTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <Field label="Address" value={form.address} onChange={(v) => set('address', v)} span2 />
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value as 'active' | 'inactive')}
            className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {!isEdit && <Field label="Opening Balance" value={form.openingBalance} onChange={(v) => set('openingBalance', v)} type="number" />}
      </form>
    </Modal>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  span2,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  span2?: boolean
}) {
  return (
    <div className={span2 ? 'col-span-2' : undefined}>
      <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}
