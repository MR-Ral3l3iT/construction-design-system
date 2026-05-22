'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ArrowLeft } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { ProjectPickerPanel } from '@/components/shared/ProjectPickerPanel'
import { PlansContent } from './PlansContent'

function PlansPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="แผนงานโครงการ"
        subtitle="จัดการขั้นตอนและความคืบหน้าของโครงการ"
        actions={
          projectId > 0 ? (
            <Link href="/admin/plans">
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
            <span>แผนงานโครงการ</span>
          </div>
          <PlansContent projectId={projectId} />
        </>
      ) : (
        <ProjectPickerPanel title="เลือกโครงการ — แผนงานโครงการ" />
      )}
    </div>
  )
}

export default function PlansPage() {
  return (
    <Suspense>
      <PlansPageInner />
    </Suspense>
  )
}
