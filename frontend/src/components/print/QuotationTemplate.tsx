import { bahtText } from '@/lib/bahtText'
import type { ItemLine } from '@/lib/descLines'
import type { DocumentPrintData } from '@/hooks/useDocuments'

/**
 * template ใบเสนอราคา — ใช้ร่วมกันระหว่างฉบับจริง (print/document) และตัวอย่างจากร่าง
 * (print/quotation-preview) เพื่อให้ preview หน้าตาเหมือนฉบับที่ออกจริงทุกอย่าง
 * ยอดทุกตัวมาจาก backend ห้ามคำนวณเงินที่นี่ (docs/billing-accounting-spec.md §12)
 */

const fmt = (v: string | number) =>
  new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    Number(v),
  )

const pct = (rate: string) => `${Number((Number(rate) * 100).toFixed(2))}%`

function thaiDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('th-TH', {
    timeZone: 'Asia/Bangkok',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
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
    fontSize: 12,
  },
  td: { border: '1px solid #ddd', padding: '5px 8px', verticalAlign: 'top' },
  label: { color: '#555', paddingRight: 6, whiteSpace: 'nowrap', verticalAlign: 'top' },
  sectionTitle: { fontWeight: 600, fontSize: 12, marginBottom: 4, color: '#0a1628' },
}

const STATUS_STAMP: Record<string, string> = {
  VOIDED: 'ยกเลิก',
  SUPERSEDED: 'ฉบับที่ถูกแทนแล้ว',
  PREVIEW: 'ตัวอย่าง',
}

/** บรรทัดรายละเอียด — ระยะเยื้องคือ space หน้าข้อความ ใช้ pre-wrap ให้คงไว้ */
function ItemLines({ item }: { item: DocumentPrintData['items'][number] }) {
  const lines: ItemLine[] =
    item.lines ?? (item.description ? item.description.split('\n').map((text) => ({ text })) : [])
  if (lines.length === 0) return null
  return (
    <div style={{ marginTop: 2 }}>
      {lines.map((l, i) => (
        <div
          key={i}
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: 11.5,
            fontWeight: l.bold ? 700 : 400,
            color: l.highlight ? '#dc2626' : l.bold ? '#111' : '#444',
          }}
        >
          {l.text}
        </div>
      ))}
    </div>
  )
}

export function QuotationTemplate({
  doc,
  copyLabel,
}: {
  doc: DocumentPrintData
  copyLabel: string
}) {
  const hasVat = Number(doc.vatAmount) > 0
  const hasWht = Number(doc.whtAmount) > 0
  const stamp = STATUS_STAMP[doc.status]
  const totalWeeks = Math.max(1, ...doc.schedule.map((p) => p.startWeek + p.durationWeeks - 1))

  const summary = [
    { label: 'รวมราคา', value: doc.baseAmount },
    ...(hasVat ? [{ label: `ภาษีมูลค่าเพิ่ม (${pct(doc.vatRate)})`, value: doc.vatAmount }] : []),
    { label: 'รวมจำนวนเงินทั้งสิ้น', value: doc.grandTotal, bold: true },
    ...(hasWht
      ? [
          { label: `หัก ณ ที่จ่าย (${pct(doc.whtRate)})`, value: doc.whtAmount },
          { label: 'จำนวนเงินที่ต้องชำระ', value: doc.netAmount, bold: true, highlight: true },
        ]
      : []),
  ]

  return (
    <div className="print-page" style={S.page}>
      {stamp && (
        <div
          style={{
            position: 'absolute',
            top: '40%',
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 72,
            fontWeight: 700,
            color: 'rgba(220, 38, 38, 0.18)',
            transform: 'rotate(-20deg)',
            pointerEvents: 'none',
          }}
        >
          {stamp}
        </div>
      )}

      {/* HEADER */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', width: '55%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={doc.sellerLogoUrl || '/uat-logo.svg'}
                  alt="Logo"
                  style={{ width: 40, height: 44, objectFit: 'contain' }}
                />
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                  {doc.sellerName}
                  <br />
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#555' }}>
                    (
                    {doc.sellerBranchCode === '00000'
                      ? 'สำนักงานใหญ่'
                      : `สาขา ${doc.sellerBranchCode}`}
                    )
                  </span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#444', lineHeight: 1.8 }}>
                {doc.sellerAddress && <div>{doc.sellerAddress}</div>}
                {doc.sellerContact && <div>{doc.sellerContact}</div>}
                {doc.sellerTaxId && <div>เลขประจำตัวผู้เสียภาษี {doc.sellerTaxId}</div>}
              </div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#0a1628', letterSpacing: 2 }}>
                ใบเสนอราคา
              </div>
              <div
                style={{
                  display: 'inline-block',
                  border: '1.5px solid #0a1628',
                  padding: '1px 14px',
                  fontSize: 11,
                  margin: '4px 0 8px',
                  borderRadius: 2,
                }}
              >
                {copyLabel}
              </div>
              <table style={{ marginLeft: 'auto', borderCollapse: 'collapse', fontSize: 12 }}>
                <tbody>
                  <tr>
                    <td style={{ ...S.label, textAlign: 'right' }}>เลขที่:</td>
                    <td style={{ fontWeight: 600 }}>
                      {doc.code ??
                        (doc.willRevise ? `${doc.willRevise}-R (ฉบับแก้ไข)` : 'ออกเลขเมื่อยืนยัน')}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...S.label, textAlign: 'right' }}>วันที่:</td>
                    <td>{thaiDate(doc.documentDate)}</td>
                  </tr>
                  {doc.dueDate && (
                    <tr>
                      <td style={{ ...S.label, textAlign: 'right' }}>ยืนราคาถึง:</td>
                      <td>{thaiDate(doc.dueDate)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '2px solid #0a1628', marginBottom: 8 }} />

      {/* CUSTOMER */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 6, fontSize: 12 }}>
        <tbody>
          <tr>
            <td style={{ width: '55%', verticalAlign: 'top', paddingRight: 16 }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={S.label}>ลูกค้า :</td>
                    <td style={{ fontWeight: 600 }}>{doc.partyName || '-'}</td>
                  </tr>
                  <tr>
                    <td style={S.label}>ที่อยู่ :</td>
                    <td>{doc.partyAddress || '-'}</td>
                  </tr>
                  <tr>
                    <td style={S.label}>เลขประจำตัวผู้เสียภาษี :</td>
                    <td>{doc.partyTaxId || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
            <td style={{ verticalAlign: 'top' }}>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td style={S.label}>ผู้ติดต่อ :</td>
                    <td>{doc.partyContact || doc.partyName || '-'}</td>
                  </tr>
                  <tr>
                    <td style={S.label}>email :</td>
                    <td>{doc.partyEmail || '-'}</td>
                  </tr>
                  <tr>
                    <td style={S.label}>โทร :</td>
                    <td>{doc.partyPhone || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '1px solid #ccc', marginBottom: 8 }} />

      {doc.projectName && (
        <div style={{ marginBottom: 10, fontSize: 12 }}>
          <span style={{ color: '#555' }}>ชื่องาน : </span>
          <span style={{ fontWeight: 600 }}>{doc.projectName}</span>
        </div>
      )}

      {/* ITEMS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <thead>
          <tr>
            <th style={{ ...S.thDark, textAlign: 'center', width: 36 }}>ลำดับ</th>
            <th style={{ ...S.thDark, textAlign: 'left' }}>รายการ</th>
            <th style={{ ...S.thDark, textAlign: 'center', width: 70 }}>จำนวน</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 100 }}>ราคา/หน่วย</th>
            <th style={{ ...S.thDark, textAlign: 'right', width: 110 }}>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, idx) => (
            <tr key={item.id}>
              <td style={{ ...S.td, textAlign: 'center', fontWeight: 600 }}>{idx + 1}</td>
              <td style={S.td}>
                <div style={{ fontWeight: 700, textDecoration: 'underline' }}>{item.name}</div>
                <ItemLines item={item} />
              </td>
              {item.isPriced ? (
                <>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {Number(item.quantity)}
                    {item.unit && (
                      <span style={{ marginLeft: 3, color: '#888', fontSize: 11 }}>
                        {item.unit}
                      </span>
                    )}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right' }}>{fmt(item.unitPrice)}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 500 }}>
                    {fmt(item.amount)}
                  </td>
                </>
              ) : (
                // หัวข้อหมวดที่ไม่มีราคา — เว้นว่างตามรูปแบบใบเสนอราคาเดิมใน Excel
                <>
                  <td style={S.td} />
                  <td style={S.td} />
                  <td style={S.td} />
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* TOTALS */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top', paddingTop: 6, fontSize: 12, paddingRight: 16 }}>
              <span style={{ color: '#555' }}>
                {hasWht ? 'จำนวนเงินที่ต้องชำระ' : 'รวมจำนวนเงินทั้งสิ้น'} :{' '}
              </span>
              <span style={{ fontWeight: 600 }}>
                ({bahtText(Number(hasWht ? doc.netAmount : doc.grandTotal))})
              </span>
              {doc.note && (
                <div style={{ marginTop: 8, color: '#444', whiteSpace: 'pre-wrap' }}>
                  <span style={{ color: '#555' }}>หมายเหตุ : </span>
                  {doc.note}
                </div>
              )}
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
                  {summary.map((row) => (
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
                        }}
                      >
                        {fmt(row.value)}
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
      {doc.installments.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' }}>
          <div style={S.sectionTitle}>งวดการจ่ายเงิน</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...S.thDark, textAlign: 'center', width: 56, whiteSpace: 'nowrap' }}>
                  งวดที่
                </th>
                <th style={{ ...S.thDark, textAlign: 'left' }}>รายละเอียด</th>
                <th style={{ ...S.thDark, textAlign: 'left', width: 130 }}>ระยะเวลา</th>
                <th style={{ ...S.thDark, textAlign: 'right', width: 56 }}>%</th>
                {/* % คิดจากยอดที่ลูกค้าจ่ายจริง จึงแสดงยอดชำระอย่างเดียว ไม่แสดงราคาก่อน VAT */}
                <th style={{ ...S.thDark, textAlign: 'right', width: 120 }}>
                  {hasWht ? 'ยอดชำระสุทธิ' : 'ยอดชำระ'}
                </th>
              </tr>
            </thead>
            <tbody>
              {doc.installments.map((inst) => (
                <tr key={inst.id}>
                  <td style={{ ...S.td, textAlign: 'center' }}>{inst.installmentNo}</td>
                  <td style={S.td}>{inst.description}</td>
                  <td style={S.td}>{inst.timingText || '-'}</td>
                  <td style={{ ...S.td, textAlign: 'right' }}>
                    {Number(inst.percentage).toFixed(2)}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontWeight: 600 }}>
                    {fmt(inst.netAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SCHEDULE */}
      {doc.schedule.length > 0 && (
        <div style={{ marginBottom: 14, breakInside: 'avoid' }}>
          <div style={S.sectionTitle}>Schedule แผนงาน (นับจากวันเริ่มงาน)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                <th style={{ ...S.thDark, textAlign: 'left', width: 200 }}>ช่วงงาน</th>
                <th style={{ ...S.thDark, textAlign: 'center', width: 90 }}>สัปดาห์ที่</th>
                <th style={{ ...S.thDark, textAlign: 'left' }}>ระยะเวลา ({totalWeeks} สัปดาห์)</th>
              </tr>
            </thead>
            <tbody>
              {doc.schedule.map((ph) => (
                <tr key={ph.id}>
                  <td style={S.td}>{ph.name}</td>
                  <td style={{ ...S.td, textAlign: 'center' }}>
                    {ph.durationWeeks > 1
                      ? `${ph.startWeek}–${ph.startWeek + ph.durationWeeks - 1}`
                      : ph.startWeek}
                  </td>
                  <td style={{ ...S.td, verticalAlign: 'middle' }}>
                    <div style={{ position: 'relative', height: 10, background: '#f1f5f9' }}>
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          height: 10,
                          background: '#0891b2',
                          left: `${((ph.startWeek - 1) / totalWeeks) * 100}%`,
                          width: `${(ph.durationWeeks / totalWeeks) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SIGNATURES */}
      <table
        style={{ width: '100%', borderCollapse: 'collapse', marginTop: 48, breakInside: 'avoid' }}
      >
        <tbody>
          <tr>
            {[
              {
                title: 'ผู้อนุมัติราคา',
                sub: 'วันที่ ............................................',
              },
              {
                title: 'ผู้เสนอราคา',
                sub: `${doc.sellerSignatureName ? `(${doc.sellerSignatureName}) ` : ''}วันที่ ${thaiDate(doc.documentDate)}`,
              },
            ].map((sig) => (
              <td key={sig.title} style={{ width: '50%', textAlign: 'center', paddingTop: 48 }}>
                <div
                  style={{
                    borderTop: '1px solid #555',
                    display: 'inline-block',
                    width: 200,
                    marginBottom: 4,
                  }}
                />
                <div style={{ fontWeight: 500 }}>{sig.title}</div>
                <div style={{ marginTop: 8, color: '#555', fontSize: 12 }}>{sig.sub}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
