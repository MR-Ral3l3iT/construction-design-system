'use client'

import { Suspense, use } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Pencil, ArrowLeft } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { DesignTaskDetailContent } from './DesignTaskDetailContent'

interface Props {
  params: Promise<{ id: string }>
}

function DesignTaskDetailInner({ taskId }: { taskId: number }) {
  const searchParams = useSearchParams()
  const projectId = parseInt(searchParams.get('projectId') ?? '0', 10)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/design-tasks" className="hover:text-primary-600">
          งานออกแบบ
        </Link>
        <span>/</span>
        {projectId > 0 ? (
          <>
            <Link
              href={`/admin/design-tasks?projectId=${projectId}`}
              className="hover:text-primary-600"
            >
              รายการงานออกแบบ
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span>รายละเอียด</span>
      </div>
      <PageHeader
        icon={Pencil}
        title="รายละเอียดงานออกแบบ"
        subtitle="ข้อมูล สถานะ และการอนุมัติงาน"
        actions={
          <Link
            href={
              projectId > 0 ? `/admin/design-tasks?projectId=${projectId}` : '/admin/design-tasks'
            }
          >
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              กลับ
            </Button>
          </Link>
        }
      />
      <DesignTaskDetailContent id={taskId} projectId={projectId} />
    </div>
  )
}

export default function DesignTaskDetailPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense>
      <DesignTaskDetailInner taskId={parseInt(id, 10)} />
    </Suspense>
  )
}
