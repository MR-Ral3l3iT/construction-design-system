'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FolderOpen, ArrowLeft } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { FilesContent } from './FilesContent'
import { AllFilesContent } from './AllFilesContent'

function FilesPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)

  return (
    <div>
      <PageHeader
        icon={FolderOpen}
        title="ไฟล์และเอกสาร"
        subtitle={
          projectId > 0 ? 'จัดการไฟล์แนบและเอกสารของโครงการ' : 'เลือกโครงการเพื่อดูและจัดการไฟล์'
        }
        actions={
          projectId > 0 ? (
            <Link href="/admin/files">
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
            <Link href="/admin/files" className="hover:text-primary-600">
              ไฟล์และเอกสาร
            </Link>
            <span>/</span>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียดโครงการ
            </Link>
            <span>/</span>
            <span>ไฟล์</span>
          </div>
          <FilesContent projectId={projectId} />
        </>
      ) : (
        <AllFilesContent />
      )}
    </div>
  )
}

export default function FilesPage() {
  return (
    <Suspense>
      <FilesPageInner />
    </Suspense>
  )
}
