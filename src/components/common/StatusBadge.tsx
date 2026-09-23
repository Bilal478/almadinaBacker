import clsx from 'clsx'

export type BadgeTone = 'success' | 'danger' | 'warning' | 'info' | 'neutral'

const TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success border-success/30',
  danger: 'bg-danger-bg text-danger border-danger/30',
  warning: 'bg-warning-bg text-warning border-warning/30',
  info: 'bg-info-bg text-info border-info/30',
  neutral: 'bg-panel-alt text-ink-soft border-border-strong/60',
}

export function StatusBadge({ tone, children }: { tone: BadgeTone; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  )
}

export function statusToneFromActive(active: boolean): BadgeTone {
  return active ? 'success' : 'neutral'
}
