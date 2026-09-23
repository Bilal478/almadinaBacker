import { Check } from 'lucide-react'
import clsx from 'clsx'
import type { PermissionKey } from '@/types'
import { PERMISSION_GROUPS } from '@/data/permissions'

interface PermissionMatrixProps {
  selected: PermissionKey[]
  onToggle: (key: PermissionKey) => void
  readOnly?: boolean
}

export function PermissionMatrix({ selected, onToggle, readOnly }: PermissionMatrixProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {PERMISSION_GROUPS.map((group) => (
        <div key={group.group} className="rounded border border-border">
          <div className="border-b border-border bg-panel-alt px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            {group.group}
          </div>
          <div className="divide-y divide-border">
            {group.items.map((item) => {
              const checked = selected.includes(item.key)
              return (
                <button
                  key={item.key}
                  type="button"
                  disabled={readOnly}
                  onClick={() => onToggle(item.key)}
                  className={clsx(
                    'flex w-full items-center justify-between px-3 py-1.5 text-left text-sm hover:bg-panel-alt disabled:cursor-default',
                    checked ? 'text-ink' : 'text-ink-faint',
                  )}
                >
                  <span>{item.label}</span>
                  <span
                    className={clsx(
                      'flex h-4 w-4 items-center justify-center rounded border',
                      checked ? 'border-brand-600 bg-brand-600 text-white' : 'border-border-strong bg-panel',
                    )}
                  >
                    {checked && <Check size={12} strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
