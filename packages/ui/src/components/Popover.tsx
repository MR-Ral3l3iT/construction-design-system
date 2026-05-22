'use client'

import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

type PopoverPlacement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'bottom-start'
  | 'bottom-end'
  | 'top-start'
  | 'top-end'

interface PopoverContextValue {
  open: boolean
  setOpen: (v: boolean) => void
}

const PopoverContext = createContext<PopoverContextValue>({ open: false, setOpen: () => {} })

export interface PopoverProps {
  children: React.ReactNode
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

export function Popover({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
}: PopoverProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen

  function setOpen(v: boolean) {
    if (!isControlled) setUncontrolledOpen(v)
    onOpenChange?.(v)
  }

  return (
    <PopoverContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block">{children}</div>
    </PopoverContext.Provider>
  )
}

export interface PopoverTriggerProps {
  children: React.ReactElement
  asChild?: boolean
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  const { open, setOpen } = useContext(PopoverContext)
  return (
    <span onClick={() => setOpen(!open)} style={{ display: 'contents' }}>
      {children}
    </span>
  )
}

const placementStyles: Record<PopoverPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  'bottom-start': 'top-full left-0 mt-2',
  'bottom-end': 'top-full right-0 mt-2',
  'top-start': 'bottom-full left-0 mb-2',
  'top-end': 'bottom-full right-0 mb-2',
}

export interface PopoverContentProps {
  placement?: PopoverPlacement
  className?: string
  children: React.ReactNode
  closeOnClickOutside?: boolean
}

export function PopoverContent({
  placement = 'bottom-start',
  className,
  children,
  closeOnClickOutside = true,
}: PopoverContentProps) {
  const { open, setOpen } = useContext(PopoverContext)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!closeOnClickOutside) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.closest('[data-popover-root]')?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, closeOnClickOutside, setOpen])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, setOpen])

  if (!open) return null

  return (
    <div
      ref={ref}
      data-popover-root
      className={cn(
        'absolute z-30 rounded-xl bg-white shadow-lg ring-1 ring-gray-200',
        'animate-in fade-in-0 zoom-in-95 duration-100',
        placementStyles[placement],
        className,
      )}
    >
      {children}
    </div>
  )
}
