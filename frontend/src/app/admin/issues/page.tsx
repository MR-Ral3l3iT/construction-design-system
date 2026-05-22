'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { Button, PageHeader } from '@construction/ui'
import { AllIssuesContent } from './AllIssuesContent'
import { IssuesContent } from './IssuesContent'

function IssuesPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={AlertTriangle}
        title="ปัญหาและอุปสรรค"
        subtitle={
          projectId > 0 ? 'ติดตามและจัดการปัญหาในโครงการ' : 'เลือกโครงการเพื่อดูและจัดการปัญหา'
        }
        actions={
          projectId > 0 ? (
            <Link href="/admin/issues">
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
            <Link href="/admin/issues" className="hover:text-primary-600">
              ปัญหาและอุปสรรค
            </Link>
            <span>/</span>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <span>ปัญหา</span>
          </div>
          <IssuesContent projectId={projectId} />
        </>
      ) : (
        <AllIssuesContent />
      )}
    </div>
  )
}

export default function IssuesPage() {
  return (
    <Suspense>
      <IssuesPageInner />
    </Suspense>
  )
}
