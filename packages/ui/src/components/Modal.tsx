'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../lib/utils'

type ModalSize = 'sm' | 'md' | 'lg' | 'xl'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  size?: ModalSize
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

const sizeStyles: Record<ModalSize, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = 'md',
  children,
  footer,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    const scrollEls = document.querySelectorAll<HTMLElement>('main, [data-scroll-lock]')
    if (open) {
      document.body.style.overflow = 'hidden'
      scrollEls.forEach((el) => {
        el.dataset.prevOverflow = el.style.overflow
        el.style.overflow = 'hidden'
      })
    }
    return () => {
      document.body.style.overflow = ''
      scrollEls.forEach((el) => {
        el.style.overflow = el.dataset.prevOverflow ?? ''
        delete el.dataset.prevOverflow
      })
    }
  }, [open])

  if (!mounted || !open) return null

  return createPortal(
    <>
      {/* Backdrop — covers full viewport */}
      <div
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
        aria-hidden
      />

      {/* Scroll container — panel starts below navbar (3.5rem = h-14) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          overflowY: 'auto',
          overscrollBehavior: 'contain',
          paddingTop: '3.5rem',
          paddingLeft: '1rem',
          paddingRight: '1rem',
          paddingBottom: '1rem',
        }}
        role="dialog"
        aria-modal="true"
      >
        {/* Panel */}
        <div
          className={cn(
            'relative mx-auto w-full flex flex-col rounded-2xl bg-white shadow-xl ring-1 ring-gray-200',
            sizeStyles[size],
            className,
          )}
        >
          {/* Header */}
          {(title || description) && (
            <div className="shrink-0 border-b border-gray-100 px-6 py-4">
              {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            aria-label="ปิด"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>

          {/* Footer */}
          {footer && (
            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  )
}
