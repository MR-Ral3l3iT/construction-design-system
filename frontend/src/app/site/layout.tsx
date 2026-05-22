import type { Metadata } from 'next'
import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/providers/toast-provider'
import { SiteShell } from './SiteShell'

export const metadata: Metadata = {
  title: { template: '%s | Site Portal', default: 'Site Portal' },
  manifest: '/manifest.json',
  themeColor: '#f97316',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Site Portal' },
  viewport: { width: 'device-width', initialScale: 1, maximumScale: 1 },
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>
        <SiteShell>{children}</SiteShell>
      </ToastProvider>
    </QueryProvider>
  )
}
