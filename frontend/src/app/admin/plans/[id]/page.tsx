'use client'

import { use } from 'react'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { PlanDetailContent } from './PlanDetailContent'

interface Props {
  params: Promise<{ id: string }>
}

function PlanDetailPageInner({ planId }: { planId: number }) {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="รายละเอียดแผนงาน"
        subtitle="จัดการงานและความคืบหน้า"
      />
      <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
        {projectId > 0 && (
          <>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <Link href={`/admin/plans?projectId=${projectId}`} className="hover:text-primary-600">
              แผนงาน
            </Link>
            <span>/</span>
          </>
        )}
        <span>รายละเอียด</span>
      </div>
      <PlanDetailContent planId={planId} />
    </div>
  )
}

export default function PlanDetailPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense>
      <PlanDetailPageInner planId={parseInt(id, 10)} />
    </Suspense>
  )
}
