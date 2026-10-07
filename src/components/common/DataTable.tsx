import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import clsx from 'clsx'
import { TopScrollContainer } from '@/components/common/TopScrollContainer'

export interface DataTableColumn<T> {
  key: string
  header: string
  align?: 'left' | 'right' | 'center'
  width?: string
  render: (row: T) => React.ReactNode
  /** Enables click-to-sort on this column — returns the raw comparable value (not the rendered
   *  JSX) for the given row. Omit for columns with no sensible sort (e.g. Actions). */
  sortValue?: (row: T) => string | number | boolean | null | undefined
}

export type SortDir = 'asc' | 'desc'

/** Shared sort state + comparator for DataTable and ReportTable — click a column to sort by it
 *  ascending, click again to flip to descending; clicking a different column resets to ascending. */
export function useSortableRows<T>(rows: T[], columns: DataTableColumn<T>[]) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  function toggleSort(key: string) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedRows = useMemo(() => {
    const col = sortKey ? columns.find((c) => c.key === sortKey) : undefined
    if (!col?.sortValue) return rows

    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      // Missing values always sort last, regardless of direction — a "4th cheapest" item with
      // no price shouldn't jump to the top just because the column is sorted descending.
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string' || typeof bv === 'string') return String(av).localeCompare(String(bv)) * dir
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [rows, columns, sortKey, sortDir])

  return { sortedRows, sortKey, sortDir, toggleSort }
}

export function SortableHeaderCell<T>({
  col,
  sortKey,
  sortDir,
  onSort,
  className,
}: {
  col: DataTableColumn<T>
  sortKey: string | null
  sortDir: SortDir
  onSort: (key: string) => void
  className?: string
}) {
  const alignRight = col.align === 'right'
  const alignCenter = col.align === 'center'

  if (!col.sortValue) {
    return (
      <th
        style={{ width: col.width }}
        className={clsx(className, alignRight && 'text-right', alignCenter && 'text-center', !alignRight && !alignCenter && 'text-left')}
      >
        {col.header}
      </th>
    )
  }

  const active = sortKey === col.key
  return (
    <th
      style={{ width: col.width }}
      className={clsx(className, alignRight && 'text-right', alignCenter && 'text-center', !alignRight && !alignCenter && 'text-left')}
    >
      <button
        type="button"
        onClick={() => onSort(col.key)}
        className={clsx(
          'inline-flex select-none items-center gap-1 hover:text-ink',
          alignRight && 'flex-row-reverse',
        )}
      >
        {col.header}
        {active ? (
          sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
        ) : (
          <ArrowUpDown size={11} className="opacity-30" />
        )}
      </button>
    </th>
  )
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  keyField: (row: T) => string
  onRowClick?: (row: T) => void
  emptyMessage?: string
}

export function DataTable<T>({ columns, rows, keyField, onRowClick, emptyMessage = 'No records found.' }: DataTableProps<T>) {
  const { sortedRows, sortKey, sortDir, toggleSort } = useSortableRows(rows, columns)

  return (
    <TopScrollContainer className="rounded border border-border bg-panel">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-panel-alt">
          <tr>
            {columns.map((col) => (
              <SortableHeaderCell
                key={col.key}
                col={col}
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={toggleSort}
                className="border-b border-border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint"
              />
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedRows.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-8 text-center text-sm text-ink-faint">
                {emptyMessage}
              </td>
            </tr>
          )}
          {sortedRows.map((row) => (
            <tr
              key={keyField(row)}
              onClick={() => onRowClick?.(row)}
              className={clsx('border-b border-border last:border-b-0', onRowClick && 'cursor-pointer hover:bg-brand-50')}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={clsx(
                    'px-3 py-2 text-ink',
                    col.align === 'right' && 'text-right',
                    col.align === 'center' && 'text-center',
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </TopScrollContainer>
  )
}
