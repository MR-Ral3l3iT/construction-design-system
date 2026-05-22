'use client'

import { Suspense } from 'react'
import { use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FileText, ArrowLeft, Printer } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { EstimateDetailContent } from './EstimateDetailContent'

interface Props {
  params: Promise<{ id: string }>
}

function EstimateDetailPageInner({ estimateId }: { estimateId: number }) {
  const searchParams = useSearchParams()
  const projectId = parseInt(searchParams.get('projectId') ?? '0', 10)

  const backHref = projectId > 0 ? `/admin/estimates?projectId=${projectId}` : '/admin/estimates'

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/estimates" className="hover:text-primary-600">
          ใบประเมิน
        </Link>
        {projectId > 0 && (
          <>
            <span>/</span>
            <Link
              href={`/admin/estimates?projectId=${projectId}`}
              className="hover:text-primary-600"
            >
              รายการใบประเมิน
            </Link>
          </>
        )}
        <span>/</span>
        <span>รายละเอียด</span>
      </div>
      <PageHeader
        icon={FileText}
        title="รายละเอียดใบประเมิน"
        subtitle="รายการและมูลค่าใบเสนอราคา"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/print/estimates/${estimateId}`, '_blank')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sidebar px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sidebar-hover"
            >
              <Printer className="h-4 w-4" />
              Export PDF
            </button>
            <Link href={backHref}>
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                ย้อนกลับ
              </Button>
            </Link>
          </div>
        }
      />
      <EstimateDetailContent id={estimateId} projectId={projectId} />
    </div>
  )
}

export default function EstimateDetailPage({ params }: Props) {
  const { id } = use(params)
  const estimateId = parseInt(id, 10)

  return (
    <Suspense>
      <EstimateDetailPageInner estimateId={estimateId} />
    </Suspense>
  )
}
