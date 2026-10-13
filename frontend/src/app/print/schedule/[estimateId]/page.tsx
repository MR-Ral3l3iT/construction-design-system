'use client'

import { use, Suspense } from 'react'
import { useSchedulePrint } from '@/hooks/useEstimates'
import { ScheduleSheet } from '@/components/print/ScheduleSheet'

/**
 * พิมพ์แผนงานแยก — schedule ล่าสุดของใบประเมิน (แก้ได้หลังเซ็นใบเสนอราคา)
 * ฉบับตอนเซ็นอยู่ในหน้าแนบท้ายของใบเสนอราคา
 */
function thaiDate(d: string) {
  return new Date(d).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SchedulePrint({ estimateId }: { estimateId: number }) {
  const { data, isLoading, error } = useSchedulePrint(estimateId)
  const center: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  }
  if (isLoading) return <div style={center}>กำลังโหลด...</div>
  if (error || !data) return <div style={center}>ไม่พบใบประเมิน</div>

  const reference = data.quotation
    ? `แนบท้ายใบเสนอราคา ${data.quotation.code}`
    : `ใบประเมิน: ${data.title}`
  const edition =
    data.scheduleRevision > 0 && data.scheduleUpdatedAt
      ? `ปรับปรุงครั้งที่ ${data.scheduleRevision} · ${thaiDate(data.scheduleUpdatedAt)}`
      : data.quotation
        ? `ฉบับตามใบเสนอราคา · ${thaiDate(data.quotation.documentDate)}`
        : 'ฉบับร่าง'

  return (
    <>
      <div
        className="no-print"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: '#0a1628',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: '#0891b2',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🖨️ พิมพ์แผนงาน
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: 'transparent',
            color: '#94a3b8',
            border: '1px solid #475569',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ✕ ปิด
        </button>
        <span style={{ color: '#64748b', fontSize: 12 }}>{edition}</span>
      </div>
      <div className="no-print" style={{ height: 20 }} />
      <ScheduleSheet
        phases={data.phases}
        sellerName={data.sellerName}
        sellerLogoUrl={data.sellerLogoUrl}
        reference={reference}
        edition={edition}
        partyName={data.partyName}
        projectName={data.projectName}
      />
    </>
  )
}

export default function SchedulePrintPage({ params }: { params: Promise<{ estimateId: string }> }) {
  const { estimateId } = use(params)
  return (
    <Suspense>
      <SchedulePrint estimateId={parseInt(estimateId, 10)} />
    </Suspense>
  )
}
