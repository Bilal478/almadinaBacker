export function FilterBar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-end gap-2 rounded border border-border bg-panel p-2.5">{children}</div>
}

export function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</label>
      {children}
    </div>
  )
}

export const selectClass =
  'rounded border border-border-strong bg-panel px-2 py-1.5 text-sm text-ink outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500'

export const inputClass = selectClass
