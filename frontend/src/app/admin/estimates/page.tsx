'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowLeft } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { EstimatesContent } from './EstimatesContent'
import { AllEstimatesContent } from './AllEstimatesContent'

function EstimatesPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={FileText}
        title="ใบประเมินราคา"
        subtitle="จัดการใบเสนอราคาและใบประเมินโครงการ"
        actions={
          projectId > 0 ? (
            <Link href="/admin/estimates">
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
            <span>ใบประเมิน</span>
          </div>
          <EstimatesContent projectId={projectId} />
        </>
      ) : (
        <AllEstimatesContent />
      )}
    </div>
  )
}

export default function EstimatesPage() {
  return (
    <Suspense>
      <EstimatesPageInner />
    </Suspense>
  )
}
