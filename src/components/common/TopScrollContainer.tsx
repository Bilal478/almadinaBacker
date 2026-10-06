import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'

interface TopScrollContainerProps {
  /** Classes for the scrolling body (border, background, etc.). */
  className?: string
  children: React.ReactNode
}

/** A horizontally scrollable box with a second, synced scrollbar pinned above it — so on a long
 *  listing you can scroll sideways from the top instead of hunting for the native scrollbar at the
 *  very bottom of the table. The top bar is sticky, so it stays reachable while scrolling down the
 *  page, and only renders when the content actually overflows. */
export function TopScrollContainer({ className, children }: TopScrollContainerProps) {
  const topRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [contentWidth, setContentWidth] = useState(0)
  const [overflowing, setOverflowing] = useState(false)

  useEffect(() => {
    const body = bodyRef.current
    if (!body) return
    const measure = () => {
      setContentWidth(body.scrollWidth)
      setOverflowing(body.scrollWidth > body.clientWidth + 1)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(body)
    if (body.firstElementChild) observer.observe(body.firstElementChild)
    return () => observer.disconnect()
  }, [])

  // Keep the top bar in step with the body when it first appears (e.g. after data loads).
  useEffect(() => {
    if (overflowing && topRef.current && bodyRef.current) topRef.current.scrollLeft = bodyRef.current.scrollLeft
  }, [overflowing])

  function syncFrom(source: HTMLDivElement | null, target: HTMLDivElement | null) {
    if (source && target && target.scrollLeft !== source.scrollLeft) target.scrollLeft = source.scrollLeft
  }

  return (
    <div>
      {overflowing && (
        <div
          ref={topRef}
          onScroll={() => syncFrom(topRef.current, bodyRef.current)}
          className="sticky top-0 z-20 mb-1 overflow-x-auto overflow-y-hidden rounded bg-app-bg"
          aria-hidden
        >
          <div style={{ width: contentWidth, height: 1 }} />
        </div>
      )}
      <div ref={bodyRef} onScroll={() => syncFrom(bodyRef.current, topRef.current)} className={clsx('overflow-auto', className)}>
        {children}
      </div>
    </div>
  )
}
