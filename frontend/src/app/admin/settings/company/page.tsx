'use client'

import { Building2 } from 'lucide-react'
import { PageHeader } from '@construction/ui'
import { CompanySettingsContent } from './CompanySettingsContent'

export default function CompanySettingsPage() {
  return (
    <div>
      <PageHeader
        icon={Building2}
        title="ตั้งค่าบัญชีและการเงิน"
        subtitle="ข้อมูลบริษัท บัญชีธนาคาร ผังบัญชี อัตราหัก ณ ที่จ่าย และเลขที่เอกสาร"
      />
      <CompanySettingsContent />
    </div>
  )
}
