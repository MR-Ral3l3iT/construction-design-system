'use client'

import React, { use, useEffect, useRef, useState, Suspense } from 'react'
import { useSubQuotationById, type SubQuotationDetail } from '@/hooks/useSubQuotation'

const A4_PX = 1123

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}

function thaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`
}

function bahtText(amount: number): string {
  const ones = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
  const tens = [
    '',
    'สิบ',
    'ยี่สิบ',
    'สามสิบ',
    'สี่สิบ',
    'ห้าสิบ',
    'หกสิบ',
    'เจ็ดสิบ',
    'แปดสิบ',
    'เก้าสิบ',
  ]
  const places = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน']
  if (amount === 0) return 'ศูนย์บาทถ้วน'
  const intPart = Math.floor(amount)
  const decPart = Math.round((amount - intPart) * 100)
  function convertInt(n: number): string {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    const digits = String(n).split('').map(Number)
    return digits.reduce((acc, d, i) => {
      if (d === 0) return acc
      const placeIdx = digits.length - 1 - i
      const digitWord =
        placeIdx === 1 && d === 1
          ? 'สิบ'
          : placeIdx === 1 && d === 2
            ? 'ยี่สิบ'
            : placeIdx === 1
              ? tens[d]
              : ones[d]
      return acc + digitWord + (placeIdx > 1 || placeIdx === 0 ? places[placeIdx] : '')
    }, '')
  }
  let result = convertInt(intPart) + 'บาท'
  if (decPart > 0) result += convertInt(decPart) + 'สตางค์'
  else result += 'ถ้วน'
  return result
}

const MILESTONE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'รอชำระ',
  BILLED: 'วางบิลแล้ว',
  PAID: 'ชำระแล้ว',
  OVERDUE: 'เกินกำหนด',
}

const S: Record<string, React.CSSProperties> = {
  page: {
    width: 794,
    minHeight: A4_PX,
    margin: '0 auto',
    background: 'white',
    padding: '20mm 14mm 14mm',
    fontFamily: "'Prompt', 'Sarabun', sans-serif",
    fontSize: 13,
    lineHeight: 1.6,
    color: '#111',
    boxSizing: 'border-box',
    position: 'relative',
  },
  thDark: {
    border: '1px solid #1e293b',
    padding: '5px 8px',
    background: '#1e293b',
    color: 'white',
    fontWeight: 600,
  },
  td: { border: '1px solid #ddd', padding: '5px 8px', verticalAlign: 'top' },
  tdShade: {
    border: '1px solid #ddd',
    padding: '5px 8px',
    verticalAlign: 'top',
    background: '#f8fafc',
  },
}

function SubQuotationDoc({
  sq,
  copyLabel,
  pagesPerCopy,
}: {
  sq: SubQuotationDetail
  copyLabel: string
  pagesPerCopy: number
}) {
  const customer = sq.quotation.project?.customer
  const amount = Number(sq.amount)
  const dateStr = thaiDate(sq.createdAt)

  const customerAddress = [
    customer?.address,
    customer?.subdistrict ? `ต.${customer.subdistrict}` : null,
    customer?.district ? `อ.${customer.district}` : null,
    customer?.province,
    customer?.postcode,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="print-page" style={S.page}>
      {/* HEADER */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '55%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/uat-logo.svg"
                  alt="Logo"
                  style={{ width: 40, height: 44, objectFit: 'contain' }}
                />
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                  บริษัท ฃวด จำกัด
                  <br />
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#555' }}>
                    (สำนักงานใหญ่)
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
                <div>101/24 ซอยสุขาภิบาล5 ซอย5 แขวงท่าแร้ง เขตบางเขน กรุงเทพมหานคร</div>
                <div>โทรศัพท์: 086-6449565 e-mail : uat.arch@gmail.com</div>
                <div>เลขประจำตัวผู้เสียภาษี 0105564177133</div>
              </div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 700,
                  color: '#0a1628',
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                ใบเสนอราคางานย่อย
              </div>
              <div
                style={{
                  display: 'inline-block',
                  border: '1.5px solid #0a1628',
                  padding: '1px 14px',
                  fontSize: 11,
                  marginBottom: 8,
                  borderRadius: 2,
                }}
              >
                {copyLabel}
              </div>
              <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>เลขที่:</td>
                    <td style={{ fontWeight: 600 }}>{sq.code}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                      อ้างอิง QT:
                    </td>
                    <td style={{ fontWeight: 500 }}>{sq.quotation.code}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>วันที่:</td>
                    <td>{dateStr}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '2px solid #0a1628', marginBottom: 8 }} />

      {/* CUSTOMER INFO */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: 12 }}>
        <tbody>
          <tr>
            <td style={{ width: '55%', verticalAlign: 'top', paddingRight: 16 }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td
                      style={{
                        color: '#555',
                        paddingRight: 6,
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                      }}
                    >
                      ลูกค้า :
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {customer?.companyName || customer?.name || '-'}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        color: '#555',
                        paddingRight: 6,
                        whiteSpace: 'nowrap',
                        verticalAlign: 'top',
                      }}
                    >
                      ที่อยู่ :
                    </td>
                    <td>{customerAddress || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 6, whiteSpace: 'nowrap' }}>
                      เลขประจำตัวผู้เสียภาษี :
                    </td>
                    <td>{customer?.taxId || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ width: '45%', verticalAlign: 'top' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 6, whiteSpace: 'nowrap' }}>
                      ผู้ติดต่อ :
                    </td>
                    <td>{customer?.name || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 6, whiteSpace: 'nowrap' }}>
                      email :
                    </td>
                    <td>{customer?.email || '-'}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#555', paddingRight: 6, whiteSpace: 'nowrap' }}>โทร :</td>
                    <td>{customer?.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '1px solid #ccc', marginBottom: 8 }} />

      {/* PROJECT + WORK INFO */}
      <div style={{ marginBottom: 10, fontSize: 12 }}>
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: '#555' }}>ชื่องานย่อย : </span>
          <span style={{ fontWeight: 600 }}>{sq.title}</span>
        </div>
        <div style={{ marginBottom: 2 }}>
          <span style={{ color: '#555' }}>โครงการ : </span>
          <span style={{ fontWeight: 600 }}>
            {sq.quotation.project.code} — {sq.quotation.project.name}
          </span>
        </div>
        <div>
          <span style={{ color: '#555' }}>อ้างอิงใบเสนอราคา : </span>
          <span style={{ fontWeight: 500 }}>
            {sq.quotation.code} — {sq.quotation.title}
          </span>
        </div>
        {sq.description && (
          <div style={{ marginTop: 4, color: '#444' }}>
            <span style={{ color: '#555' }}>รายละเอียด : </span>
            {sq.description}
          </div>
        )}
      </div>

      {/* หน่วย */}
      <div style={{ textAlign: 'right', fontSize: 11, color: '#555', marginBottom: 2 }}>
        หน่วย : บาท
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4, fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ ...S.thDark, textAlign: 'center', width: 40 }}>ลำดับ</th>
            <th style={{ ...S.thDark, textAlign: 'left' }}>รายการ</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 160 }}>จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ ...S.tdShade, textAlign: 'center' }}>1.</td>
            <td style={S.tdShade}>
              <div style={{ fontWeight: 600 }}>{sq.title}</div>
              {sq.description && (
                <div style={{ color: '#555', fontSize: 11, marginTop: 2 }}>{sq.description}</div>
              )}
            </td>
            <td style={{ ...S.tdShade, textAlign: 'right', fontWeight: 600 }}>{fmt(amount)}</td>
          </tr>
          {/* งวดเงินที่ผูกไว้ */}
          {sq.paymentMilestones.length > 0 && (
            <>
              <tr>
                <td
                  colSpan={3}
                  style={{
                    ...S.td,
                    background: '#f1f5f9',
                    fontWeight: 600,
                    fontSize: 11,
                    color: '#475569',
                  }}
                >
                  งวดเงินที่เกี่ยวข้อง
                </td>
              </tr>
              {sq.paymentMilestones.map((m, i) => (
                <tr key={m.id}>
                  <td style={{ ...S.td, textAlign: 'center', color: '#888', fontSize: 11 }}>
                    {i + 1}
                  </td>
                  <td style={{ ...S.td, fontSize: 12 }}>
                    {m.title}
                    <span style={{ marginLeft: 8, fontSize: 11, color: '#888' }}>
                      ({MILESTONE_STATUS_LABEL[m.status] ?? m.status})
                      {m.dueDate && ` · ครบกำหนด ${thaiDate(m.dueDate)}`}
                    </span>
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontSize: 12 }}>
                    {fmt(Number(m.amount))}
                  </td>
                </tr>
              ))}
            </>
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', paddingTop: 6, paddingRight: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span style={{ color: '#555', whiteSpace: 'nowrap' }}>รวมจำนวนเงินทั้งสิ้น</span>
                <span style={{ fontWeight: 600 }}>{bahtText(amount)}</span>
              </div>
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>(ตัวอักษร)</div>
              <div style={{ marginTop: 10, fontSize: 11, color: '#555', lineHeight: 1.75 }}>
                <div>• ราคานี้เป็นส่วนหนึ่งของใบเสนอราคา {sq.quotation.code}</div>
                <div>• ระยะเวลาและเงื่อนไขตามที่ตกลงในสัญญาหลัก</div>
              </div>
            </td>
            <td style={{ width: 260, verticalAlign: 'top' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #ddd',
                  fontSize: 12,
                }}
              >
                <tbody>
                  {[
                    { label: 'มูลค่างานย่อย', value: fmt(amount), bold: false, highlight: false },
                    {
                      label: 'งบรวมใบเสนอราคา',
                      value: fmt(Number(sq.quotation.totalAmount)),
                      bold: false,
                      highlight: false,
                    },
                    { label: 'รวมทั้งสิ้น', value: fmt(amount), bold: true, highlight: true },
                  ].map((row) => (
                    <tr
                      key={row.label}
                      style={{ background: row.highlight ? '#f0f9ff' : undefined }}
                    >
                      <td
                        style={{
                          padding: '4px 10px',
                          borderBottom: '1px solid #eee',
                          fontWeight: row.bold ? 700 : 400,
                        }}
                      >
                        {row.label}
                      </td>
                      <td
                        style={{
                          padding: '4px 10px',
                          textAlign: 'right',
                          borderBottom: '1px solid #eee',
                          fontWeight: row.bold ? 700 : 400,
                          fontSize: row.highlight ? 14 : 13,
                        }}
                      >
                        {row.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* SIGNATURES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 60 }}>
        <tbody>
          <tr>
            <td style={{ width: '50%', textAlign: 'center', paddingTop: 60 }}>
              <div
                style={{
                  borderTop: '1px solid #555',
                  display: 'inline-block',
                  width: 200,
                  paddingTop: 6,
                  marginBottom: 4,
                }}
              />
              <div style={{ fontWeight: 500 }}>ผู้อนุมัติ / ลูกค้า</div>
              <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>
                วันที่ ............................................
              </div>
            </td>
            <td style={{ width: '50%', textAlign: 'center', paddingTop: 60 }}>
              <div
                style={{
                  borderTop: '1px solid #555',
                  display: 'inline-block',
                  width: 200,
                  paddingTop: 6,
                  marginBottom: 4,
                }}
              />
              <div style={{ fontWeight: 500 }}>ผู้เสนอราคา</div>
              <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>วันที่ {dateStr}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <div
        className="no-print"
        style={{ position: 'absolute', bottom: 10, right: 16, fontSize: 11, color: '#aaa' }}
      >
        {copyLabel} 1/{pagesPerCopy}
      </div>
    </div>
  )
}

function SubQuotationPrint({ sqId }: { sqId: number }) {
  const { data: sq, isLoading } = useSubQuotationById(sqId)
  const [pagesPerCopy, setPagesPerCopy] = useState(1)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!copyRef.current || !sq) return
    setPagesPerCopy(Math.max(1, Math.ceil(copyRef.current.scrollHeight / A4_PX)))
  }, [sq])

  useEffect(() => {
    if (sq) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [sq])

  if (isLoading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        กำลังโหลด...
      </div>
    )
  if (!sq)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        ไม่พบข้อมูล
      </div>
    )

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
          {sq.code} — {sq.title} · พิมพ์ออก 2 ชุด: ต้นฉบับ + สำเนา
        </span>
      </div>

      <div className="no-print" style={{ height: 20 }} />

      <div ref={copyRef} style={{ breakAfter: 'page' }}>
        <SubQuotationDoc sq={sq} copyLabel="ต้นฉบับ" pagesPerCopy={pagesPerCopy} />
      </div>
      <SubQuotationDoc sq={sq} copyLabel="สำเนา" pagesPerCopy={pagesPerCopy} />
    </>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default function SubQuotationPrintPage({ params }: Props) {
  const { id } = use(params)
  return (
    <Suspense>
      <SubQuotationPrint sqId={parseInt(id, 10)} />
    </Suspense>
  )
}
