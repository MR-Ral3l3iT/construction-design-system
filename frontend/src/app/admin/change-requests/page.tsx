'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { GitBranch } from 'lucide-react'
import { PageHeader, Alert } from '@construction/ui'
import { ChangeRequestsContent } from './ChangeRequestsContent'

function ChangeRequestsPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={GitBranch}
        title="คำขอเปลี่ยนแปลง"
        subtitle="จัดการการเปลี่ยนแปลงขอบเขตและงบประมาณ"
      />
      {projectId > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <span>คำขอเปลี่ยนแปลง</span>
          </div>
          <ChangeRequestsContent projectId={projectId} />
        </>
      ) : (
        <Alert variant="warning" title="กรุณาเลือกโครงการ">
          เข้าถึงหน้านี้ผ่านรายละเอียดโครงการ หรือระบุ <code>?projectId=X</code> ใน URL
        </Alert>
      )}
    </div>
  )
}

export default function ChangeRequestsPage() {
  return (
    <Suspense>
      <ChangeRequestsPageInner />
    </Suspense>
  )
}
