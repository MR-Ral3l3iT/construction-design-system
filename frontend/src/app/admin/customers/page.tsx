import type { Metadata } from 'next'
import { Users } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { CustomersContent } from './CustomersContent'

export const metadata: Metadata = { title: 'จัดการลูกค้า' }

export default function CustomersPage() {
  return (
    <div>
      <PageHeader icon={Users} title="จัดการลูกค้า" subtitle="รายการลูกค้าและสถานะ Lead ทั้งหมด" />
      <CustomersContent />
    </div>
  )
}
