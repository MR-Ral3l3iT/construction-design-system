'use client'

import { Users } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { TeamContent } from './TeamContent'

export default function TeamPage() {
  return (
    <div>
      <PageHeader
        icon={Users}
        title="ทีมงานและสิทธิ์"
        subtitle="จัดการผู้ใช้งาน บทบาท และสิทธิ์การเข้าถึง"
      />
      <TeamContent />
    </div>
  )
}
