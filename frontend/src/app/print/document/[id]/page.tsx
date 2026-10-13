'use client'

import { use, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useDocumentPrintData } from '@/hooks/useDocuments'
import { QuotationTemplate } from '@/components/print/QuotationTemplate'

/**
 * หน้าพิมพ์เอกสารบัญชี — ยอดทุกตัวมาจาก /documents/:id/print-data ที่คำนวณด้วย Decimal แล้ว
 * หน้านี้แค่จัดรูปแบบ ห้ามคำนวณเงินเอง (docs/billing-accounting-spec.md §12)
 * Phase 2 รองรับ QUOTATION — ประเภทอื่นเพิ่ม template ตาม docType
 */

function DocumentPrint({ id }: { id: number }) {
  const searchParams = useSearchParams()
  const autoprint = searchParams.get('autoprint') === '1'
  const { data: doc, isLoading, error } = useDocumentPrintData(id)

  useEffect(() => {
    if (autoprint && doc) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [autoprint, doc])

  const center: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
  }
  if (isLoading) return <div style={center}>กำลังโหลด...</div>
  if (error || !doc) return <div style={center}>ไม่พบเอกสาร</div>
  if (doc.docType !== 'QUOTATION') {
    return <div style={center}>ยังไม่รองรับการพิมพ์เอกสารประเภทนี้</div>
  }

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
          🖨️ พิมพ์ / บันทึก PDF
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
        <span style={{ color: '#64748b', fontSize: 12 }}>
          {doc.code} · พิมพ์ออก 2 ชุด: ต้นฉบับ + สำเนา
          {doc.status === 'SUPERSEDED' &&
            doc.supersededBy &&
            ` · ถูกแทนด้วย ${doc.supersededBy.code}`}
        </span>
      </div>
      <div className="no-print" style={{ height: 20 }} />

      <div className="copy-qt-orig" style={{ breakAfter: 'page' }}>
        <QuotationTemplate doc={doc} copyLabel="ต้นฉบับ" />
      </div>
      <div className="copy-qt-sane">
        <QuotationTemplate doc={doc} copyLabel="สำเนา" />
      </div>
    </>
  )
}

export default function DocumentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense>
      <DocumentPrint id={parseInt(id, 10)} />
    </Suspense>
  )
}
