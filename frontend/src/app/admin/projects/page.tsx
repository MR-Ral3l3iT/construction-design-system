import type { Metadata } from 'next'
import { FolderKanban } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { ProjectsContent } from './ProjectsContent'

export const metadata: Metadata = { title: 'จัดการโครงการ' }

export default function ProjectsPage() {
  return (
    <div>
      <PageHeader icon={FolderKanban} title="จัดการโครงการ" subtitle="รายการโครงการทั้งหมดในระบบ" />
      <ProjectsContent />
    </div>
  )
}
