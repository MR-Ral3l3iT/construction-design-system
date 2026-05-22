import type { Metadata } from 'next'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { CustomerDetail } from './CustomerDetail'

export const metadata: Metadata = { title: 'รายละเอียดลูกค้า' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const customerId = parseInt(id, 10)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/customers" className="hover:text-primary-600">
          จัดการลูกค้า
        </Link>
        <span>/</span>
        <span>รายละเอียด</span>
      </div>
      <PageHeader icon={Users} title="รายละเอียดลูกค้า" subtitle="ข้อมูลและโครงการของลูกค้า" />
      <CustomerDetail id={customerId} />
    </div>
  )
}
