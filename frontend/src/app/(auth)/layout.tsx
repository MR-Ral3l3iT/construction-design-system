import { QueryProvider } from '@/providers/query-provider'
import { ToastProvider } from '@/providers/toast-provider'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  )
}
