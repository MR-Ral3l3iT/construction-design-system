'use client'

import { use, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useEstimate, Estimate } from '@/hooks/useEstimates'

const VAT_RATE = 0.07
const WHT_RATE = 0.03

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

const S: Record<string, React.CSSProperties> = {
  page: {
    width: 794,
    minHeight: 1123,
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
}

function EstimateDoc({
  estimate,
  copyLabel,
  pagesPerCopy,
}: {
  estimate: Estimate
  copyLabel: string
  pagesPerCopy: number
}) {
  const subtotal = Number(estimate.totalAmount)
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100
  const grandTotal = subtotal + vat
  const wht = Math.round(subtotal * WHT_RATE * 100) / 100
  const netPayable = grandTotal - wht
  const customer = estimate.project?.customer
  const dateStr = thaiDate(estimate.createdAt)

  const customerAddress = [
    customer?.address,
    customer?.subdistrict ? `ต.${customer.subdistrict}` : null,
    customer?.district ? `อ.${customer.district}` : null,
    customer?.province,
    customer?.postcode,
  ]
    .filter(Boolean)
    .join(' ')

  const installments = estimate.installments ?? []

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
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#0a1628',
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                ใบเสนอราคา
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
                    <td style={{ fontWeight: 600 }}>{estimate.code}</td>
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
            <td style={{ width: '50%', verticalAlign: 'top', paddingRight: 16 }}>
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
            <td style={{ width: '50%', verticalAlign: 'top' }}>
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
                    <td style={{ color: '#555', paddingRight: 6, whiteSpace: 'nowrap' }}>โทร:</td>
                    <td>{customer?.phone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '1px solid #ccc', marginBottom: 8 }} />

      {/* Project */}
      <div style={{ marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: '#555' }}>ชื่องาน : </span>
        <span style={{ fontWeight: 600 }}>{estimate.project?.name}</span>
      </div>

      {/* ITEMS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...S.thDark, textAlign: 'center', width: 36 }}>ลำดับ</th>
            <th style={{ ...S.thDark, textAlign: 'left' }}>รายการ</th>
            <th style={{ ...S.thDark, textAlign: 'center', width: 60 }}>จำนวน</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 100 }}>ราคา/หน่วย</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 80 }}>ค่าแรง</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 110 }}>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {(estimate.items ?? []).map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...S.td, textAlign: 'center' }}>{idx + 1}</td>
              <td style={S.td}>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                {item.description && (
                  <div
                    style={{ color: '#555', fontSize: 11.5, whiteSpace: 'pre-line', marginTop: 2 }}
                  >
                    {item.description}
                  </div>
                )}
              </td>
              <td style={{ ...S.td, textAlign: 'center' }}>
                {item.quantity}
                {item.unit && (
                  <span style={{ marginLeft: 3, color: '#888', fontSize: 11 }}>{item.unit}</span>
                )}
              </td>
              <td style={{ ...S.td, textAlign: 'right' }}>{fmt(Number(item.unitPrice))}</td>
              <td style={{ ...S.td, textAlign: 'right', color: '#888' }}>-</td>
              <td style={{ ...S.td, textAlign: 'right', fontWeight: 500 }}>
                {fmt(Number(item.totalPrice))}
              </td>
            </tr>
          ))}
          {(estimate.items ?? []).length === 0 && (
            <tr>
              <td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#888', padding: 20 }}>
                ไม่มีรายการ
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          marginBottom: installments.length ? 12 : 20,
        }}
      >
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', paddingTop: 6, fontSize: 12, paddingRight: 16 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                }}
              >
                <span style={{ color: '#555', whiteSpace: 'nowrap' }}>รวมจำนวนเงินทั้งสิ้น</span>
                <span style={{ fontWeight: 600 }}>{bahtText(netPayable)}</span>
              </div>
              <div style={{ color: '#888', fontSize: 11, marginTop: 2 }}>(ตัวอักษร)</div>
            </td>
            <td style={{ width: 290, verticalAlign: 'top' }}>
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
                    { label: 'รวมราคา', value: fmt(subtotal), bold: false, highlight: false },
                    {
                      label: 'ภาษีมูลค่าเพิ่ม (7%)',
                      value: fmt(vat),
                      bold: false,
                      highlight: false,
                    },
                    {
                      label: 'รวมจำนวนเงินทั้งสิ้น',
                      value: fmt(grandTotal),
                      bold: true,
                      highlight: false,
                    },
                    { label: 'หัก ณ ที่จ่าย (3%)', value: fmt(wht), bold: false, highlight: false },
                    {
                      label: 'จำนวนเงินที่ต้องชำระ',
                      value: fmt(netPayable),
                      bold: true,
                      highlight: true,
                    },
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

      {/* INSTALLMENTS */}
      {installments.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#0a1628' }}>
            รอบจ่ายเงิน
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...S.thDark, textAlign: 'center', width: 48, fontSize: 12 }}>
                  งวดที่
                </th>
                <th style={{ ...S.thDark, textAlign: 'left', fontSize: 12 }}>รายละเอียด</th>
                <th style={{ ...S.thDark, textAlign: 'right', width: 72, fontSize: 12 }}>%</th>
                <th style={{ ...S.thDark, textAlign: 'right', width: 140, fontSize: 12 }}>
                  ยอดชำระสุทธิ
                </th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const base = Number(inst.amount)
                const instVat = Math.round(base * VAT_RATE * 100) / 100
                const instWht = Math.round(base * WHT_RATE * 100) / 100
                const instNet = base + instVat - instWht
                return (
                  <tr key={inst.id}>
                    <td style={{ ...S.td, textAlign: 'center' }}>{inst.installmentNo}</td>
                    <td style={S.td}>{inst.description}</td>
                    <td style={{ ...S.td, textAlign: 'right' }}>
                      {Number(inst.percentage).toFixed(2)}%
                    </td>
                    <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>{fmt(instNet)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SIGNATURES */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 80 }}>
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
              <div style={{ fontWeight: 500 }}>ผู้อนุมัติราคา</div>
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

      {/* Screen-only page number — print version handled by CSS @page margin box */}
      <div
        className="no-print"
        style={{
          position: 'absolute',
          bottom: 10,
          right: 16,
          fontSize: 11,
          color: '#aaa',
        }}
      >
        {copyLabel} 1/{pagesPerCopy}
      </div>
    </div>
  )
}

const A4_PX = 1123

function EstimatePrint({ estimateId }: { estimateId: number }) {
  const searchParams = useSearchParams()
  const autoprint = searchParams.get('autoprint') === '1'
  const { data: estimate, isLoading } = useEstimate(estimateId)
  const [pagesPerCopy, setPagesPerCopy] = useState(1)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!copyRef.current || !estimate) return
    const h = copyRef.current.scrollHeight
    setPagesPerCopy(Math.max(1, Math.ceil(h / A4_PX)))
  }, [estimate])

  useEffect(() => {
    if (autoprint && estimate) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [autoprint, estimate])

  if (isLoading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        กำลังโหลด...
      </div>
    )
  if (!estimate)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        ไม่พบใบประเมิน
      </div>
    )

  return (
    <>
      {/* TOOLBAR */}
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
          พิมพ์ออก 2 ชุด: ต้นฉบับ + สำเนา — เลือก &quot;Save as PDF&quot; เพื่อดาวน์โหลด
        </span>
      </div>

      {/* Screen spacer for toolbar */}
      <div className="no-print" style={{ height: 20 }} />

      {/* ต้นฉบับ — break-after: page forces สำเนา onto its own page */}
      <div ref={copyRef} style={{ breakAfter: 'page' }}>
        <EstimateDoc estimate={estimate} copyLabel="ต้นฉบับ" pagesPerCopy={pagesPerCopy} />
      </div>

      {/* สำเนา */}
      <EstimateDoc estimate={estimate} copyLabel="สำเนา" pagesPerCopy={pagesPerCopy} />
    </>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default function EstimatePrintPage({ params }: Props) {
  const { id } = use(params)
  const estimateId = parseInt(id, 10)
  return (
    <Suspense>
      <EstimatePrint estimateId={estimateId} />
    </Suspense>
  )
}
