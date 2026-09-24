import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/common/Button'
import { LedgerTable } from '@/components/suppliers/LedgerTable'
import { PaymentFormModal } from '@/components/suppliers/PaymentFormModal'
import { useSupplierStore } from '@/store/supplierStore'
import { formatCurrency } from '@/lib/format'

export function SupplierPaymentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const suppliers = useSupplierStore((s) => s.suppliers)
  const purchases = useSupplierStore((s) => s.purchases)
  const payments = useSupplierStore((s) => s.payments)
  const fetchSuppliers = useSupplierStore((s) => s.fetchAll)
  const getLedger = useSupplierStore((s) => s.getLedger)
  const fetchLedger = useSupplierStore((s) => s.fetchLedger)
  const getOutstanding = useSupplierStore((s) => s.getOutstanding)

  const supplierId = searchParams.get('supplierId') || suppliers[0]?.id || ''
  const supplier = suppliers.find((s) => s.id === supplierId)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  useEffect(() => {
    fetchSuppliers()
  }, [fetchSuppliers])

  useEffect(() => {
    if (supplierId) fetchLedger(supplierId)
  }, [supplierId, fetchLedger])

  const ledger = useMemo(() => (supplierId ? getLedger(supplierId) : []), [supplierId, getLedger])

  const totalPurchases = purchases.filter((p) => p.supplierId === supplierId).reduce((s, p) => s + p.totalAmount, 0)
  const totalPayments = payments.filter((p) => p.supplierId === supplierId).reduce((s, p) => s + p.amount, 0)
  const totalAdjustments = ledger
    .filter((r) => r.type === 'return' || r.type === 'adjustment')
    .reduce((s, r) => s + (r.credit - r.debit), 0)
  const outstanding = supplier ? getOutstanding(supplier.id) : 0

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-medium text-ink-soft">Supplier</label>
          <select
            value={supplierId}
            onChange={(e) => setSearchParams({ supplierId: e.target.value })}
            className="rounded border border-border-strong bg-panel px-2 py-1.5 text-sm outline-none focus:border-brand-500"
          >
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <Button variant="primary" onClick={() => setPaymentModalOpen(true)} disabled={!supplier}>
          <Plus size={15} /> Record Payment
        </Button>
      </div>

      {supplier && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <SummaryTile label="Opening Balance" value={formatCurrency(supplier.openingBalance)} />
            <SummaryTile label="Purchases" value={formatCurrency(totalPurchases)} tone="danger" />
            <SummaryTile label="Payments" value={formatCurrency(totalPayments)} tone="success" />
            <SummaryTile label="Returns / Adjustments" value={formatCurrency(totalAdjustments)} tone="info" />
            <SummaryTile label="Outstanding Balance" value={formatCurrency(outstanding)} tone={outstanding > 0 ? 'danger' : 'success'} emphasize />
          </div>

          <div className="min-h-0 flex-1">
            <LedgerTable rows={ledger} />
          </div>
        </>
      )}

      <PaymentFormModal open={paymentModalOpen} supplier={supplier ?? null} onClose={() => setPaymentModalOpen(false)} />
    </div>
  )
}

function SummaryTile({
  label,
  value,
  tone,
  emphasize,
}: {
  label: string
  value: string
  tone?: 'success' | 'danger' | 'info'
  emphasize?: boolean
}) {
  const toneClass = tone === 'success' ? 'text-success' : tone === 'danger' ? 'text-danger' : tone === 'info' ? 'text-info' : 'text-ink'
  return (
    <div className={`rounded border p-3 ${emphasize ? 'border-brand-500 bg-brand-50' : 'border-border bg-panel'}`}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`text-[16px] font-bold ${toneClass}`}>{value}</div>
    </div>
  )
}
