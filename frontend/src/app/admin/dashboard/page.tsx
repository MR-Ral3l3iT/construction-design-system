import type { Metadata } from 'next'
import { LayoutDashboard } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { DashboardContent } from './DashboardContent'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <div>
      <PageHeader icon={LayoutDashboard} title="Dashboard" subtitle="ภาพรวมงานทั้งหมดของบริษัท" />
      <DashboardContent />
    </div>
  )
}
