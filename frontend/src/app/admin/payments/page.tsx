'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, ArrowLeft } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { PaymentsContent } from './PaymentsContent'
import { AllPaymentsContent } from './AllPaymentsContent'

function PaymentsPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={CreditCard}
        title="งวดเงิน"
        subtitle="จัดการงวดเงินและสถานะการชำระ"
        actions={
          projectId > 0 ? (
            <Link href="/admin/payments">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                ย้อนกลับ
              </Button>
            </Link>
          ) : undefined
        }
      />
      {projectId > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
            <Link href="/admin/projects" className="hover:text-primary-600">
              โครงการ
            </Link>
            <span>/</span>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <span>งวดเงิน</span>
          </div>
          <PaymentsContent projectId={projectId} />
        </>
      ) : (
        <AllPaymentsContent />
      )}
    </div>
  )
}

export default function PaymentsPage() {
  return (
    <Suspense>
      <PaymentsPageInner />
    </Suspense>
  )
}
