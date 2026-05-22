import type { Metadata, Viewport } from 'next'
import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { ClientShell } from './ClientShell'

export const metadata: Metadata = {
  title: { template: '%s | ติดตามโครงการ', default: 'ติดตามโครงการ' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'ติดตามโครงการ',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0284c7',
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <ClientShell>{children}</ClientShell>
      </ToastProvider>
    </QueryProvider>
  )
}
