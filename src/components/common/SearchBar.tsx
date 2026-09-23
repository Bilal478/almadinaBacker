import { Search } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  autoFocus?: boolean
}

export function SearchBar({ value, onChange, placeholder = 'Search...', className, autoFocus }: SearchBarProps) {
  return (
    <div className={`relative ${className ?? ''}`}>
      <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded border border-border-strong bg-panel py-1.5 pl-8 pr-2.5 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
      />
    </div>
  )
}
