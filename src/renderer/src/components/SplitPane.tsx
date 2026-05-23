import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/cn'

interface Props {
  ratio: number
  onRatioChange: (ratio: number) => void
  left: React.ReactNode
  right: React.ReactNode
  showLeft?: boolean
  showRight?: boolean
}

export function SplitPane({
  ratio,
  onRatioChange,
  left,
  right,
  showLeft = true,
  showRight = true
}: Props): React.ReactElement {
  const containerRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    document.body.style.cursor = 'col-resize'
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent): void => {
      if (!draggingRef.current || !containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const next = (e.clientX - rect.left) / rect.width
      onRatioChange(next)
    }
    const onUp = (): void => {
      if (draggingRef.current) {
        draggingRef.current = false
        document.body.style.cursor = ''
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onRatioChange])

  if (!showLeft && !showRight) return <div />
  if (showLeft && !showRight) return <div className="h-full w-full">{left}</div>
  if (!showLeft && showRight) return <div className="h-full w-full">{right}</div>

  const leftPct = Math.max(10, Math.min(90, ratio * 100))

  return (
    <div ref={containerRef} className="relative flex h-full w-full">
      <div style={{ width: `${leftPct}%` }} className="h-full min-w-0">
        {left}
      </div>
      <div
        onMouseDown={handleMouseDown}
        className={cn(
          'group relative w-px shrink-0 cursor-col-resize bg-subtle',
          'before:absolute before:inset-y-0 before:-left-1 before:-right-1 before:content-[""]',
          'hover:bg-accent/60'
        )}
        style={{ backgroundColor: 'var(--surface-border)' }}
      />
      <div style={{ width: `${100 - leftPct}%` }} className="h-full min-w-0">
        {right}
      </div>
    </div>
  )
}
