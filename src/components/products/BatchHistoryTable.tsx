import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { DataTable } from '@/components/common/DataTable'
import { StatusBadge } from '@/components/common/StatusBadge'
import { useProductStore } from '@/store/productStore'
import { formatCurrency, formatDate, formatNumber } from '@/lib/format'
import type { Batch } from '@/types'

export function BatchHistoryTable({ productId }: { productId: string }) {
  const batchesAsc = useProductStore(useShallow((s) => s.getBatchesFor(productId)))
  const batches = useMemo(() => batchesAsc.slice().reverse(), [batchesAsc])

  return (
    <DataTable<Batch>
      keyField={(b) => b.id}
      rows={batches}
      emptyMessage="No purchase batches recorded yet."
      columns={[
        { key: 'batchNo', header: 'Batch No.', sortValue: (b) => b.batchNo, render: (b) => <span className="font-semibold text-ink">{b.batchNo}</span> },
        { key: 'supplier', header: 'Supplier', sortValue: (b) => b.supplierName, render: (b) => b.supplierName },
        { key: 'purchaseDate', header: 'Purchase Date', sortValue: (b) => b.purchaseDate, render: (b) => formatDate(b.purchaseDate) },
        { key: 'expiry', header: 'Expiry', sortValue: (b) => b.expiryDate ?? null, render: (b) => (b.expiryDate ? formatDate(b.expiryDate) : '—') },
        { key: 'cost', header: 'Cost / Unit', align: 'right', sortValue: (b) => b.cost, render: (b) => formatCurrency(b.cost) },
        { key: 'quantity', header: 'Purchased Qty', align: 'right', sortValue: (b) => b.quantity, render: (b) => formatNumber(b.quantity) },
        {
          key: 'remaining',
          header: 'Remaining',
          align: 'right',
          sortValue: (b) => b.remaining,
          render: (b) => (
            <div className="flex items-center justify-end gap-1.5">
              <span className="font-semibold">{formatNumber(b.remaining)}</span>
              {b.remaining === 0 ? (
                <StatusBadge tone="neutral">Depleted</StatusBadge>
              ) : b.remaining < b.quantity * 0.2 ? (
                <StatusBadge tone="warning">Low</StatusBadge>
              ) : null}
            </div>
          ),
        },
      ]}
    />
  )
}
