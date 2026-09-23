import { DataTable } from '@/components/common/DataTable'
import { StatusBadge, type BadgeTone } from '@/components/common/StatusBadge'
import { formatCurrency, formatDate } from '@/lib/format'
import type { LedgerRow } from '@/store/supplierStore'

const TYPE_LABEL: Record<LedgerRow['type'], string> = {
  opening: 'Opening Balance',
  purchase: 'Purchase',
  payment: 'Payment',
  return: 'Return',
  adjustment: 'Adjustment',
}

const TYPE_TONE: Record<LedgerRow['type'], BadgeTone> = {
  opening: 'neutral',
  purchase: 'danger',
  payment: 'success',
  return: 'info',
  adjustment: 'info',
}

export function LedgerTable({ rows }: { rows: LedgerRow[] }) {
  return (
    <DataTable<LedgerRow>
      keyField={(r) => r.id}
      rows={rows}
      emptyMessage="No ledger transactions yet."
      columns={[
        { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
        { key: 'reference', header: 'Reference', render: (r) => r.reference },
        {
          key: 'description',
          header: 'Description',
          render: (r) => (
            <div className="flex items-center gap-1.5">
              <StatusBadge tone={TYPE_TONE[r.type]}>{TYPE_LABEL[r.type]}</StatusBadge>
              <span className="text-ink-soft">{r.description}</span>
            </div>
          ),
        },
        { key: 'debit', header: 'Debit', align: 'right', render: (r) => (r.debit ? formatCurrency(r.debit) : <span className="text-ink-faint">—</span>) },
        { key: 'credit', header: 'Credit', align: 'right', render: (r) => (r.credit ? formatCurrency(r.credit) : <span className="text-ink-faint">—</span>) },
        { key: 'balance', header: 'Balance', align: 'right', render: (r) => <span className="font-bold text-ink">{formatCurrency(r.balance)}</span> },
      ]}
    />
  )
}
