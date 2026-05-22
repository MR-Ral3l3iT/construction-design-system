'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ArrowLeft, Printer } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { BOQDetailContent } from './BOQDetailContent'

interface Props {
  params: Promise<{ id: string }>
}

function BOQDetailInner({ boqId }: { boqId: number }) {
  const searchParams = useSearchParams()
  const projectId = parseInt(searchParams.get('projectId') ?? '0', 10)

  const backHref = projectId > 0 ? `/admin/boq?projectId=${projectId}` : '/admin/boq'

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/boq" className="hover:text-primary-600">
          BOQ
        </Link>
        {projectId > 0 && (
          <>
            <span>/</span>
            <Link href={`/admin/boq?projectId=${projectId}`} className="hover:text-primary-600">
              รายการ BOQ
            </Link>
          </>
        )}
        <span>/</span>
        <span>รายละเอียด</span>
      </div>
      <PageHeader
        icon={ClipboardList}
        title="รายละเอียด BOQ"
        subtitle="หมวดหมู่ รายการ และมูลค่า"
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.open(`/print/boq/${boqId}`, '_blank')}
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
      <BOQDetailContent id={boqId} projectId={projectId} />
    </div>
  )
}

export default function BOQDetailPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense>
      <BOQDetailInner boqId={parseInt(id, 10)} />
    </Suspense>
  )
}
