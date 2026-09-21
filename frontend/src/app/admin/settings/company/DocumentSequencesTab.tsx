'use client'

import { Alert, Badge, Card, Table } from '@construction/ui'
import type { TableColumn } from '@construction/ui'
import { LoadingState } from '@/components/shared/LoadingState'
import { useDocumentSequences, type DocumentSequenceStatus } from '@/hooks/useAccountingSettings'

const columns: TableColumn<DocumentSequenceStatus>[] = [
  {
    key: 'label',
    header: 'ประเภทเอกสาร',
    render: (r) => (
      <div className="flex items-center gap-2">
        <Badge variant="default">{r.prefix}</Badge>
        <span>{r.label}</span>
      </div>
    ),
  },
  {
    key: 'issuedCount',
    header: 'ออกไปแล้วเดือนนี้',
    width: '160px',
    render: (r) => (
      <span className={r.issuedCount > 0 ? 'text-gray-800' : 'text-gray-400'}>
        {r.issuedCount} ใบ
      </span>
    ),
  },
  {
    key: 'nextNumber',
    header: 'เลขถัดไป',
    width: '180px',
    render: (r) => <span className="font-mono font-medium text-gray-800">{r.nextNumber}</span>,
  },
  {
    key: 'capacity',
    header: 'เพดานเดือนนี้',
    width: '140px',
    render: (r) => {
      const max = Math.pow(10, r.digits) - 1
      const nearLimit = r.issuedCount > max * 0.8
      return (
        <span className={nearLimit ? 'text-amber-600 font-medium' : 'text-gray-400'}>
          {r.issuedCount} / {max}
        </span>
      )
    },
  },
]

export function DocumentSequencesTab() {
  const { data, isLoading } = useDocumentSequences()

  if (isLoading) return <LoadingState />

  const period = data?.[0]?.period
  const periodLabel = period ? `25${Number(period.slice(0, 2)) + 43}/${period.slice(2)}` : ''

  return (
    <div className="space-y-4">
      <Alert variant="warning" title="เลขที่เอกสารแก้ย้อนหลังไม่ได้">
        รูปแบบคือ <span className="font-mono">{'{ประเภท}{ปี}{เดือน}{ลำดับ 3 หลัก}'}</span>{' '}
        เริ่มนับใหม่ทุกเดือน เลขจะถูกจ่ายตอนยืนยันเอกสารเท่านั้น — เอกสารฉบับร่างยังไม่กินเลข
        และเลขของเอกสารที่ยกเลิก จะไม่ถูกนำกลับมาใช้ซ้ำ เพื่อให้ลำดับต่อเนื่องตามที่สรรพากรกำหนด
      </Alert>

      <p className="text-sm text-gray-500">
        งวดปัจจุบัน: <span className="font-medium text-gray-700">{periodLabel || '—'}</span>
      </p>

      <Card padding="none">
        <Table columns={columns} data={data ?? []} keyExtractor={(r) => r.docType} />
      </Card>
    </div>
  )
}
