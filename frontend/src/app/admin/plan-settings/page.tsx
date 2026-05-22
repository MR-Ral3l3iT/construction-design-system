'use client'

import { Settings2 } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { PlanSettingsContent } from './PlanSettingsContent'

export default function PlanSettingsPage() {
  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="ตั้งค่าแผนงาน"
        subtitle="จัดการ Template แผนงานและขั้นตอนการทำงาน"
      />
      <PlanSettingsContent />
    </div>
  )
}
