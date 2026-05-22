'use client'

import { useRef, useState } from 'react'
import { cn } from '../lib/utils'

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right'

export interface TooltipProps {
  content: React.ReactNode
  placement?: TooltipPlacement
  delay?: number
  disabled?: boolean
  children: React.ReactElement
  className?: string
}

const placementStyles: Record<TooltipPlacement, { container: string; arrow: string }> = {
  top: {
    container: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    arrow: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800',
  },
  bottom: {
    container: 'top-full left-1/2 -translate-x-1/2 mt-2',
    arrow: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800',
  },
  left: {
    container: 'right-full top-1/2 -translate-y-1/2 mr-2',
    arrow: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800',
  },
  right: {
    container: 'left-full top-1/2 -translate-y-1/2 ml-2',
    arrow: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800',
  },
}

export function Tooltip({
  content,
  placement = 'top',
  delay = 300,
  disabled,
  children,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  function show() {
    if (disabled) return
    timer.current = setTimeout(() => setVisible(true), delay)
  }
  function hide() {
    clearTimeout(timer.current)
    setVisible(false)
  }

  return (
    <span
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-gray-800 px-2.5 py-1.5 text-xs text-white shadow-md',
            placementStyles[placement].container,
            className,
          )}
        >
          {content}
        </div>
      )}
    </span>
  )
}
