import clsx from 'clsx'
import type { DataTableColumn } from '@/components/common/DataTable'

interface ReportTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  keyField: (row: T) => string
  totals?: React.ReactNode[]
  emptyMessage?: string
  /** When given, every row becomes clickable — action buttons inside a row's own cells must
   *  call e.stopPropagation() so clicking them doesn't also trigger this. */
  onRowClick?: (row: T) => void
}

export function ReportTable<T>({
  columns,
  rows,
  keyField,
  totals,
  emptyMessage = 'No data for the selected filters.',
  onRowClick,
}: ReportTableProps<T>) {
  return (
    <div className="overflow-auto rounded border border-border bg-panel">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel-alt">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={{ width: col.width }}
                className={clsx(
                  'border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint',
                  col.align === 'right' && 'text-right',
                  col.align === 'center' && 'text-center',
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-ink-faint">
                {emptyMessage}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={keyField(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx('border-b border-border last:border-b-0', onRowClick && 'cursor-pointer hover:bg-panel-alt')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx('px-3 py-2 text-ink', col.align === 'right' && 'text-right', col.align === 'center' && 'text-center')}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {totals && rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-border-strong bg-panel-alt font-semibold">
              {totals.map((t, idx) => (
                <td key={idx} className={clsx('px-3 py-2 text-ink', columns[idx]?.align === 'right' && 'text-right')}>
                  {t}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
