'use client'

import { type LucideIcon, AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  icon?: LucideIcon
  dismissible?: boolean
  onDismiss?: () => void
  children: React.ReactNode
  className?: string
}

const variantConfig: Record<AlertVariant, { icon: LucideIcon; styles: string; iconColor: string }> =
  {
    info: {
      icon: Info,
      styles: 'border-sky-200 bg-sky-50 text-sky-800',
      iconColor: 'text-sky-500',
    },
    success: {
      icon: CheckCircle2,
      styles: 'border-green-200 bg-green-50 text-green-800',
      iconColor: 'text-green-500',
    },
    warning: {
      icon: AlertTriangle,
      styles: 'border-amber-200 bg-amber-50 text-amber-800',
      iconColor: 'text-amber-500',
    },
    error: {
      icon: AlertCircle,
      styles: 'border-red-200 bg-red-50 text-red-800',
      iconColor: 'text-red-500',
    },
  }

export function Alert({
  variant = 'info',
  title,
  icon,
  dismissible,
  onDismiss,
  children,
  className,
}: AlertProps) {
  const [dismissed, setDismissed] = useState(false)
  const { icon: DefaultIcon, styles, iconColor } = variantConfig[variant]
  const Icon = icon ?? DefaultIcon

  if (dismissed) return null

  return (
    <div role="alert" className={cn('flex gap-3 rounded-xl border p-4', styles, className)}>
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconColor)} aria-hidden />
      <div className="flex-1 min-w-0">
        {title && <p className="mb-0.5 text-sm font-semibold">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
      {dismissible && (
        <button
          onClick={() => {
            setDismissed(true)
            onDismiss?.()
          }}
          className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 transition-opacity"
          aria-label="ปิด"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
