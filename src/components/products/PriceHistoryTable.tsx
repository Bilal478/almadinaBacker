import { useShallow } from 'zustand/react/shallow'
import { DataTable } from '@/components/common/DataTable'
import { useProductStore } from '@/store/productStore'
import { formatCurrency, formatDate } from '@/lib/format'
import type { PriceHistoryEntry } from '@/types'

export function PriceHistoryTable({ productId }: { productId: string }) {
  const entries = useProductStore(useShallow((s) => s.getPriceHistoryFor(productId)))

  return (
    <DataTable<PriceHistoryEntry>
      keyField={(e) => e.id}
      rows={entries}
      emptyMessage="No price history recorded yet."
      columns={[
        {
          key: 'effectiveDate',
          header: 'Effective Date',
          render: (e) => (
            <div className="flex items-center gap-1.5">
              {formatDate(e.effectiveDate)}
              {entries[0]?.id === e.id && (
                <span className="rounded bg-success-bg px-1 py-0.5 text-[10px] font-semibold text-success">CURRENT</span>
              )}
            </div>
          ),
        },
        { key: 'purchaseCost', header: 'Purchase Cost', align: 'right', render: (e) => formatCurrency(e.purchaseCost) },
        { key: 'customerPrice', header: 'Selling Price', align: 'right', render: (e) => formatCurrency(e.customerPrice) },
        { key: 'changedBy', header: 'Changed By', render: (e) => e.changedBy },
        { key: 'note', header: 'Note', render: (e) => <span className="text-ink-faint">{e.note ?? '—'}</span> },
      ]}
    />
  )
}
