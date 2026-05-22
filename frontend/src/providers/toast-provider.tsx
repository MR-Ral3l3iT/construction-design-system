'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { ToastContainer } from '@construction/ui'
import type { ToastProps } from '@construction/ui'

type ToastInput = Omit<ToastProps, 'id' | 'onDismiss'>

interface ToastContextValue {
  toast: (input: ToastInput) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (input: ToastInput) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((prev) => [...prev, { ...input, id, onDismiss: dismiss }])
    },
    [dismiss],
  )

  const success = useCallback(
    (title: string, message?: string) => {
      toast({ variant: 'success', title, message })
    },
    [toast],
  )

  const error = useCallback(
    (title: string, message?: string) => {
      toast({ variant: 'error', title, message })
    },
    [toast],
  )

  return (
    <ToastContext.Provider value={{ toast, success, error }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
