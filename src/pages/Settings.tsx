import { useEffect, useState } from 'react'
import { Button } from '@/components/common/Button'
import { useSettingsStore, type BusinessSettings } from '@/store/settingsStore'
import { useUiStore } from '@/store/uiStore'
import { ApiError } from '@/lib/api'

const EMPTY: BusinessSettings = {
  storeName: '',
  address: '',
  phone: '',
  email: '',
  taxId: '',
  currencyCode: 'PKR',
  currencySymbol: 'Rs.',
  lowStockAlertDefault: 10,
  receiptFooter: '',
}

export function SettingsPage() {
  const pushToast = useUiStore((s) => s.pushToast)
  const settings = useSettingsStore((s) => s.settings)
  const save = useSettingsStore((s) => s.save)
  const [form, setForm] = useState<BusinessSettings>(EMPTY)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (settings) setForm(settings)
  }, [settings])

  function set<K extends keyof BusinessSettings>(key: K, value: BusinessSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    if (!form.storeName.trim()) {
      pushToast('error', 'Store name is required.')
      return
    }
    setSaving(true)
    try {
      await save(form)
      pushToast('success', 'Settings saved. New receipts will use these details.')
    } catch (e) {
      pushToast('error', e instanceof ApiError ? e.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3">
      <Section title="Store Information" hint="Printed at the top of every receipt/invoice.">
        <Field label="Store Name" value={form.storeName} onChange={(v) => set('storeName', v)} span2 />
        <Field label="Address" value={form.address} onChange={(v) => set('address', v)} span2 />
        <Field label="Phone" value={form.phone} onChange={(v) => set('phone', v)} />
        <Field label="Email" value={form.email} onChange={(v) => set('email', v)} />
        <Field label="Tax / NTN ID (optional)" value={form.taxId} onChange={(v) => set('taxId', v)} />
      </Section>

      <Section title="Currency">
        <Field label="Currency Code" value={form.currencyCode} onChange={(v) => set('currencyCode', v)} />
        <Field label="Currency Symbol (shown on prices)" value={form.currencySymbol} onChange={(v) => set('currencySymbol', v)} />
      </Section>

      <Section title="Inventory Defaults">
        <Field
          label="Default Low Stock Alert Quantity"
          value={String(form.lowStockAlertDefault)}
          onChange={(v) => set('lowStockAlertDefault', Number(v) || 0)}
          type="number"
        />
      </Section>

      <Section title="Receipt Settings">
        <Field label="Receipt Footer Message" value={form.receiptFooter} onChange={(v) => set('receiptFooter', v)} span2 />
      </Section>

      <div className="flex justify-end">
        <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Settings'}
        </Button>
      </div>
    </div>
  )
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-border bg-panel p-4">
      <div className="mb-3">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        {hint && <div className="text-[11px] text-ink-faint">{hint}</div>}
      </div>
      <div className="grid grid-cols-2 gap-3">{children}</div>
    </div>
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
