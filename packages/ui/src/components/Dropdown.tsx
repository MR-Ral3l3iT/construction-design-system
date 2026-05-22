'use client'

import { type LucideIcon, Check, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '../lib/utils'

export interface DropdownItem {
  key: string
  label: string
  icon?: LucideIcon
  description?: string
  shortcut?: string
  disabled?: boolean
  danger?: boolean
  checked?: boolean
  onClick?: () => void
  children?: DropdownItem[]
}

export type DropdownSection = {
  title?: string
  items: DropdownItem[]
}

export interface DropdownMenuProps {
  trigger: React.ReactElement
  sections: DropdownSection[]
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
  className?: string
}

const placementStyles = {
  'bottom-start': 'top-full left-0 mt-1',
  'bottom-end': 'top-full right-0 mt-1',
  'top-start': 'bottom-full left-0 mb-1',
  'top-end': 'bottom-full right-0 mb-1',
}

export function DropdownMenu({
  trigger,
  sections,
  placement = 'bottom-start',
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    function keyHandler(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handler)
      document.addEventListener('keydown', keyHandler)
    }
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <span onClick={() => setOpen((p) => !p)} style={{ display: 'contents' }}>
        {trigger}
      </span>

      {open && (
        <div
          className={cn(
            'absolute z-40 min-w-48 rounded-xl bg-white py-1 shadow-lg ring-1 ring-gray-200',
            placementStyles[placement],
            className,
          )}
          role="menu"
        >
          {sections.map((section, si) => (
            <div key={si}>
              {si > 0 && <hr className="my-1 border-gray-100" />}
              {section.title && (
                <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </p>
              )}
              {section.items.map((item) => (
                <button
                  key={item.key}
                  role="menuitem"
                  disabled={item.disabled}
                  onClick={() => {
                    if (!item.disabled) {
                      item.onClick?.()
                      setOpen(false)
                    }
                  }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors',
                    item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50',
                    item.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {item.icon && (
                    <item.icon
                      className={cn(
                        'h-4 w-4 shrink-0',
                        item.danger ? 'text-red-500' : 'text-gray-400',
                      )}
                      aria-hidden
                    />
                  )}
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-gray-400">{item.description}</span>
                  )}
                  {item.shortcut && (
                    <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] text-gray-500">
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.checked && <Check className="h-3.5 w-3.5 text-primary-600" />}
                  {item.children && <ChevronRight className="h-3.5 w-3.5 text-gray-400" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
