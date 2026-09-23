import { inputClass } from '@/components/common/FilterBar'

interface DateRangePickerProps {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
}

export function DateRangePicker({ from, to, onFromChange, onToChange }: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-1.5">
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={inputClass} />
      <span className="text-xs text-ink-faint">to</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={inputClass} />
    </div>
  )
}
