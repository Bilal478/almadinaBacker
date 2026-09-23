import { useEffect } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'

interface ModalProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg' | 'xl'
  footer?: React.ReactNode
}

const WIDTHS: Record<NonNullable<ModalProps['width']>, string> = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
}

export function Modal({ open, title, subtitle, onClose, children, width = 'md', footer }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-navy-900/40 p-4">
      <div className={clsx('flex max-h-[90vh] w-full flex-col rounded-md border border-border bg-panel shadow-xl', WIDTHS[width])}>
        <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <div>
            <h2 className="text-[14px] font-semibold text-ink">{title}</h2>
            {subtitle && <p className="text-xs text-ink-faint">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="rounded p-1 text-ink-faint hover:bg-panel-alt hover:text-ink"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-border px-4 py-2.5">{footer}</div>}
      </div>
    </div>
  )
}
