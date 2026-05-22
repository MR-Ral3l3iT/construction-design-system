'use client'

import { use, useEffect, useRef, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { usePaymentById, PaymentMilestone } from '@/hooks/usePayments'
import { useEstimatesByProject, useEstimate, EstimateItem } from '@/hooks/useEstimates'

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

function docCode(payment: PaymentMilestone, isReceipt: boolean) {
  const base =
    isReceipt && payment.paidDate ? new Date(payment.paidDate) : new Date(payment.createdAt)
  const y = base.getFullYear()
  const m = String(base.getMonth() + 1).padStart(2, '0')
  const day = String(base.getDate()).padStart(2, '0')
  const seq = String(payment.id).padStart(3, '0')
  return `${isReceipt ? 'RC' : 'IV'}${y}${m}${day}${seq}`
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

function BillingDoc({
  payment,
  copyLabel,
  pagesPerCopy,
  estimateItems,
  isReceipt,
}: {
  payment: PaymentMilestone
  copyLabel: string
  pagesPerCopy: number
  estimateItems: EstimateItem[]
  isReceipt: boolean
}) {
  const subtotal = Number(payment.amount)
  const vat = Math.round(subtotal * VAT_RATE * 100) / 100
  const grandTotal = subtotal + vat
  const wht = Math.round(subtotal * WHT_RATE * 100) / 100
  const netPayable = grandTotal - wht
  const customer = payment.project?.customer
  const code = docCode(payment, isReceipt)
  const issueDate = thaiDate(isReceipt && payment.paidDate ? payment.paidDate : payment.createdAt)
  const dueDate = payment.dueDate ? thaiDate(payment.dueDate) : '-'

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
                  fontSize: 28,
                  fontWeight: 700,
                  color: '#0a1628',
                  letterSpacing: 2,
                  marginBottom: 4,
                }}
              >
                {isReceipt ? 'ใบเสร็จรับเงิน' : 'ใบวางบิล'}
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
                    <td style={{ fontWeight: 600 }}>{code}</td>
                  </tr>
                  <tr>
                    <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>วันที่:</td>
                    <td>{issueDate}</td>
                  </tr>
                  {isReceipt ? (
                    <tr>
                      <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                        วันที่ชำระ:
                      </td>
                      <td style={{ fontWeight: 600, color: '#16a34a' }}>
                        {payment.paidDate ? thaiDate(payment.paidDate) : '-'}
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                        ครบกำหนด:
                      </td>
                      <td
                        style={{
                          fontWeight: dueDate !== '-' ? 600 : 400,
                          color: dueDate !== '-' ? '#b45309' : '#888',
                        }}
                      >
                        {dueDate}
                      </td>
                    </tr>
                  )}
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

      {/* PROJECT */}
      <div style={{ marginBottom: 10, fontSize: 12 }}>
        <span style={{ color: '#555' }}>ชื่องาน : </span>
        <span style={{ fontWeight: 600 }}>{payment.project?.name || '-'}</span>
      </div>

      {/* BILLING TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...S.thDark, textAlign: 'center', width: 36 }}>ลำดับ</th>
            <th style={{ ...S.thDark, textAlign: 'left' }}>รายการงาน</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 140 }}>จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          {/* งวดเงินที่วางบิล */}
          <tr style={{ background: '#f0f9ff' }}>
            <td colSpan={2} style={{ ...S.td, fontWeight: 700, color: '#0a1628' }}>
              {payment.title}
              {payment.description && (
                <span style={{ fontWeight: 400, color: '#555', fontSize: 11.5, marginLeft: 8 }}>
                  ({payment.description})
                </span>
              )}
            </td>
            <td style={{ ...S.td, textAlign: 'right', fontWeight: 700 }}>{fmt(subtotal)}</td>
          </tr>
          {/* รายละเอียดขอบเขตงาน */}
          {estimateItems.map((item, idx) => (
            <tr key={item.id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ ...S.td, textAlign: 'center', fontSize: 12, color: '#888' }}>
                {idx + 1}
              </td>
              <td style={{ ...S.td, fontSize: 12 }} colSpan={2}>
                <div style={{ fontWeight: 500 }}>{item.name}</div>
                {item.description && (
                  <div
                    style={{ color: '#888', fontSize: 11, whiteSpace: 'pre-line', marginTop: 2 }}
                  >
                    {item.description}
                  </div>
                )}
              </td>
            </tr>
          ))}
          {estimateItems.length === 0 && (
            <tr>
              <td
                colSpan={3}
                style={{ ...S.td, height: 80, color: '#ccc', textAlign: 'center', fontSize: 12 }}
              >
                —
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* TOTALS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
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

      {/* PAYMENT INFO */}
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: 4,
          padding: '10px 14px',
          fontSize: 12,
          marginBottom: 24,
          background: '#f8fafc',
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 6, color: '#0a1628' }}>ช่องทางการชำระเงิน</div>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ paddingRight: 16, color: '#555', whiteSpace: 'nowrap' }}>ธนาคาร:</td>
              <td style={{ fontWeight: 500 }}>กสิกรไทย (KBANK) สาขาเซนทรัลรัตนาธิเบศร์</td>
            </tr>
            <tr>
              <td style={{ color: '#555', whiteSpace: 'nowrap' }}>ประเภทบัญชี:</td>
              <td style={{ fontWeight: 500 }}>ออมทรัพย์</td>
            </tr>
            <tr>
              <td style={{ color: '#555', whiteSpace: 'nowrap' }}>ชื่อบัญชี:</td>
              <td style={{ fontWeight: 500 }}>บริษัท ฃวด จำกัด</td>
            </tr>
            <tr>
              <td style={{ color: '#555', whiteSpace: 'nowrap' }}>เลขที่บัญชี:</td>
              <td style={{ fontWeight: 700, letterSpacing: 1 }}>124-8-42852-6</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PAYMENT METHOD — ใบเสร็จเท่านั้น */}
      {isReceipt && (
        <div style={{ marginTop: 60, marginBottom: 24, fontSize: 13 }}>
          <span style={{ fontWeight: 600, marginRight: 12 }}>ชำระเงินโดย :</span>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginRight: 24,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#111' }}
            />
            โอนเงิน
          </label>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              marginRight: 24,
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#111' }}
            />
            เงินสด
          </label>
          <label
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
          >
            <input
              type="checkbox"
              style={{ width: 15, height: 15, cursor: 'pointer', accentColor: '#111' }}
            />
            เช็คธนาคาร
          </label>
        </div>
      )}

      {/* SIGNATURES */}
      {isReceipt ? (
        /* ใบเสร็จ — ลายเซ็นเดียว (ผู้รับเงิน) */
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: isReceipt ? 0 : 60 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%' }} />
              <td style={{ width: '50%', textAlign: 'center' }}>
                <div
                  style={{
                    borderTop: '1px solid #555',
                    display: 'inline-block',
                    width: 200,
                    paddingTop: 6,
                    marginBottom: 4,
                  }}
                />
                <div style={{ fontWeight: 500 }}>ผู้รับเงิน</div>
                <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>วันที่ {issueDate}</div>
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        /* ใบวางบิล — สองลายเซ็น */
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 60 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', textAlign: 'center' }}>
                <div
                  style={{
                    borderTop: '1px solid #555',
                    display: 'inline-block',
                    width: 200,
                    paddingTop: 6,
                    marginBottom: 4,
                  }}
                />
                <div style={{ fontWeight: 500 }}>ผู้รับใบวางบิล</div>
                <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>
                  วันที่ ............................................
                </div>
              </td>
              <td style={{ width: '50%', textAlign: 'center' }}>
                <div
                  style={{
                    borderTop: '1px solid #555',
                    display: 'inline-block',
                    width: 200,
                    paddingTop: 6,
                    marginBottom: 4,
                  }}
                />
                <div style={{ fontWeight: 500 }}>ผู้วางบิล</div>
                <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>วันที่ {issueDate}</div>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Screen-only page number */}
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

function BillingPrint({ paymentId }: { paymentId: number }) {
  const searchParams = useSearchParams()
  const autoprint = searchParams.get('autoprint') === '1'
  const isReceipt = searchParams.get('type') === 'receipt'
  const { data: payment, isLoading } = usePaymentById(paymentId)
  const projectId = payment?.project?.id ?? 0
  const { data: estimatesData } = useEstimatesByProject(projectId)
  const approvedEstimate = estimatesData?.data?.find((e) => e.status === 'APPROVED')
  const { data: estimateDetail } = useEstimate(approvedEstimate?.id ?? 0)
  const estimateItems = estimateDetail?.items ?? []

  const [pagesPerCopy, setPagesPerCopy] = useState(1)
  const copyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!copyRef.current || !payment) return
    const h = copyRef.current.scrollHeight
    setPagesPerCopy(Math.max(1, Math.ceil(h / A4_PX)))
  }, [payment, estimateItems])

  useEffect(() => {
    if (autoprint && payment) {
      const t = setTimeout(() => window.print(), 600)
      return () => clearTimeout(t)
    }
  }, [autoprint, payment])

  if (isLoading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        กำลังโหลด...
      </div>
    )
  if (!payment)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        ไม่พบข้อมูลงวดเงิน
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
        {payment.project?.id && (
          <a
            href={`/admin/payments?projectId=${payment.project.id}`}
            style={{
              background: 'transparent',
              color: '#94a3b8',
              border: '1px solid #475569',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            ← ย้อนกลับ
          </a>
        )}
        <span style={{ color: '#64748b', fontSize: 12 }}>
          {isReceipt ? 'ใบเสร็จรับเงิน' : 'ใบวางบิล'} — พิมพ์ออก 2 ชุด: ต้นฉบับ + สำเนา
        </span>
      </div>

      <div className="no-print" style={{ height: 20 }} />

      {/* ต้นฉบับ — break-after: page forces สำเนา onto its own page */}
      <div ref={copyRef} style={{ breakAfter: 'page' }}>
        <BillingDoc
          payment={payment}
          copyLabel="ต้นฉบับ"
          pagesPerCopy={pagesPerCopy}
          estimateItems={estimateItems}
          isReceipt={isReceipt}
        />
      </div>

      {/* สำเนา */}
      <BillingDoc
        payment={payment}
        copyLabel="สำเนา"
        pagesPerCopy={pagesPerCopy}
        estimateItems={estimateItems}
        isReceipt={isReceipt}
      />
    </>
  )
}

interface Props {
  params: Promise<{ id: string }>
}

export default function BillingPrintPage({ params }: Props) {
  const { id } = use(params)
  const paymentId = parseInt(id, 10)
  return (
    <Suspense>
      <BillingPrint paymentId={paymentId} />
    </Suspense>
  )
}
