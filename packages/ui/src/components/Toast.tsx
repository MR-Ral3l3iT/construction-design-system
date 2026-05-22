'use client'

import { AlertCircle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import { useEffect } from 'react'
import { cn } from '../lib/utils'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  variant?: ToastVariant
  title: string
  message?: string
  duration?: number
  onDismiss: (id: string) => void
}

const variantConfig: Record<ToastVariant, { icon: typeof CheckCircle2; styles: string }> = {
  success: { icon: CheckCircle2, styles: 'border-green-200 bg-green-50 text-green-800' },
  error: { icon: XCircle, styles: 'border-red-200 bg-red-50 text-red-800' },
  warning: { icon: AlertCircle, styles: 'border-amber-200 bg-amber-50 text-amber-800' },
  info: { icon: Info, styles: 'border-sky-200 bg-sky-50 text-sky-800' },
}

export function Toast({
  id,
  variant = 'info',
  title,
  message,
  duration = 4000,
  onDismiss,
}: ToastProps) {
  const { icon: Icon, styles } = variantConfig[variant]

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timer)
  }, [id, duration, onDismiss])

  return (
    <div
      role="alert"
      className={cn('flex w-80 items-start gap-3 rounded-xl border p-4 shadow-md', styles)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{title}</p>
        {message && <p className="mt-0.5 text-xs opacity-80">{message}</p>}
      </div>
      <button
        onClick={() => onDismiss(id)}
        className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 transition-opacity"
        aria-label="ปิด"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export interface ToastContainerProps {
  toasts: ToastProps[]
  onDismiss: (id: string) => void
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
