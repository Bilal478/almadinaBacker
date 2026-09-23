import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from 'lucide-react'
import { useUiStore, type ToastKind } from '@/store/uiStore'
import clsx from 'clsx'

const ICONS: Record<ToastKind, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const CLASSES: Record<ToastKind, string> = {
  success: 'bg-success-bg text-success border-success/30',
  error: 'bg-danger-bg text-danger border-danger/30',
  warning: 'bg-warning-bg text-warning border-warning/30',
  info: 'bg-info-bg text-info border-info/30',
}

export function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  const dismiss = useUiStore((s) => s.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-[200] flex w-80 flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={clsx('flex items-start gap-2 rounded border px-3 py-2 text-sm shadow-md', CLASSES[t.kind])}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">{t.message}</div>
            <button onClick={() => dismiss(t.id)} className="text-current/60 hover:text-current">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
