'use client'

import { use, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useQuotationPreview, type IssueQuotationPayload } from '@/hooks/useDocuments'
import { QuotationTemplate } from '@/components/print/QuotationTemplate'

/**
 * ตัวอย่างใบเสนอราคาจากร่าง — template เดียวกับฉบับจริง ยอดคำนวณที่ backend แบบเดียวกัน
 * แต่ไม่บันทึกและไม่ออกเลข · ตั้งค่าภาษีผ่าน query เช่น ?vatPercent=7&whtRateId=2&validDays=30
 */
function readParams(sp: URLSearchParams): IssueQuotationPayload {
  const num = (k: string) => (sp.get(k) ? Number(sp.get(k)) : undefined)
  return {
    vatPercent: num('vatPercent'),
    whtRateId: num('whtRateId'),
    validDays: num('validDays'),
    documentDate: sp.get('documentDate') || undefined,
    note: sp.get('note') || undefined,
  }
}

function QuotationPreview({ estimateId }: { estimateId: number }) {
  const sp = useSearchParams()
  const { data: doc, isLoading, error } = useQuotationPreview(estimateId, readParams(sp))

  const center: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  }
  if (isLoading) return <div style={center}>กำลังโหลด...</div>
  if (error || !doc) return <div style={center}>ไม่พบใบประเมิน</div>

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
          background: '#7c2d12',
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => window.print()}
          style={{
            background: '#ea580c',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🖨️ พิมพ์ตัวอย่าง
        </button>
        <button
          onClick={() => window.close()}
          style={{
            background: 'transparent',
            color: '#fed7aa',
            border: '1px solid #fdba74',
            padding: '8px 16px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          ✕ ปิด
        </button>
        <span style={{ color: '#fed7aa', fontSize: 12 }}>
          ตัวอย่างจากร่าง — ยังไม่ได้ออกเอกสาร ไม่มีเลขที่
          {doc.warnings.map((w) => ` · ⚠ ${w}`)}
        </span>
      </div>
      <div className="no-print" style={{ height: 20 }} />
      <QuotationTemplate doc={doc} copyLabel="ตัวอย่าง" />
    </>
  )
}

export default function QuotationPreviewPage({
  params,
}: {
  params: Promise<{ estimateId: string }>
}) {
  const { estimateId } = use(params)
  return (
    <Suspense>
      <QuotationPreview estimateId={parseInt(estimateId, 10)} />
    </Suspense>
  )
}
