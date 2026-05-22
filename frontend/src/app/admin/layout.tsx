import type { Metadata } from 'next'
import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { AdminShell } from '@/components/admin/AdminShell'

export const metadata: Metadata = { title: { template: '%s | Admin', default: 'Admin' } }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <AdminShell>{children}</AdminShell>
      </ToastProvider>
    </QueryProvider>
  )
}
