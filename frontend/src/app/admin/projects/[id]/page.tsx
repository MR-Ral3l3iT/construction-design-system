import type { Metadata } from 'next'
import Link from 'next/link'
import { FolderKanban } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { ProjectDetail } from './ProjectDetail'

export const metadata: Metadata = { title: 'รายละเอียดโครงการ' }

interface Props {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params
  const projectId = parseInt(id, 10)

  return (
    <div>
      <div className="mb-2 flex items-center gap-1 text-sm text-gray-500">
        <Link href="/admin/projects" className="hover:text-primary-600">
          จัดการโครงการ
        </Link>
        <span>/</span>
        <span>รายละเอียด</span>
      </div>
      <PageHeader
        icon={FolderKanban}
        title="รายละเอียดโครงการ"
        subtitle="ข้อมูลโครงการ ทีมงาน และความคืบหน้า"
      />
      <ProjectDetail id={projectId} />
    </div>
  )
}
