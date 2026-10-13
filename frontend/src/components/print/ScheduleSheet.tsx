/**
 * แผ่น "แผนงาน" หนึ่งหน้า A4 — ใช้สองที่:
 * - หน้าแนบท้ายใบเสนอราคา (schedule ฉบับตอนออกเอกสาร จาก snapshot)
 * - หน้าพิมพ์แผนงานแยก print/schedule (schedule ล่าสุดหลังปรับปรุง)
 */

export interface SchedulePhaseRow {
  id: number
  name: string
  startWeek: number
  durationWeeks: number
}

interface Props {
  phases: SchedulePhaseRow[]
  sellerName: string | null
  sellerLogoUrl: string | null
  /** บรรทัดอ้างอิงใต้หัวเรื่อง เช่น "แนบท้ายใบเสนอราคา QT2610001" */
  reference: string
  /** ฉบับของแผนงาน เช่น "ตามใบเสนอราคา" หรือ "ปรับปรุงครั้งที่ 2 · 20 ต.ค. 2569" */
  edition: string
  partyName: string | null
  projectName: string | null
  copyLabel?: string
  /** หน้านี้ต่อจากหน้าอื่น — ขึ้นหน้าใหม่ตอนพิมพ์ */
  breakBefore?: boolean
}

const page: React.CSSProperties = {
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
}
const th: React.CSSProperties = {
  border: '1px solid #1e293b',
  padding: '5px 8px',
  background: '#1e293b',
  color: 'white',
  fontWeight: 600,
  fontSize: 12,
}
const td: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '6px 8px',
  verticalAlign: 'top',
}

export function ScheduleSheet({
  phases,
  sellerName,
  sellerLogoUrl,
  reference,
  edition,
  partyName,
  projectName,
  copyLabel,
  breakBefore,
}: Props) {
  const totalWeeks = Math.max(1, ...phases.map((p) => p.startWeek + p.durationWeeks - 1))
  const weeks = Array.from({ length: totalWeeks }, (_, i) => i + 1)

  return (
    <div className="print-page" style={{ ...page, ...(breakBefore && { breakBefore: 'page' }) }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
        <tbody>
          <tr>
            <td style={{ verticalAlign: 'top' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sellerLogoUrl || '/uat-logo.svg'}
                  alt="Logo"
                  style={{ width: 34, height: 38, objectFit: 'contain' }}
                />
                <div style={{ fontSize: 14, fontWeight: 700 }}>{sellerName}</div>
              </div>
            </td>
            <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#0a1628', letterSpacing: 1 }}>
                แผนงาน
              </div>
              {copyLabel && (
                <div
                  style={{
                    display: 'inline-block',
                    border: '1.5px solid #0a1628',
                    padding: '1px 14px',
                    fontSize: 11,
                    margin: '2px 0 4px',
                    borderRadius: 2,
                  }}
                >
                  {copyLabel}
                </div>
              )}
              <div style={{ fontSize: 12, color: '#555' }}>{reference}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#0a1628' }}>{edition}</div>
            </td>
          </tr>
        </tbody>
      </table>

      <hr style={{ borderTop: '2px solid #0a1628', marginBottom: 8 }} />

      <div style={{ fontSize: 12, marginBottom: 12 }}>
        {partyName && (
          <div>
            <span style={{ color: '#555' }}>ลูกค้า : </span>
            <span style={{ fontWeight: 600 }}>{partyName}</span>
          </div>
        )}
        {projectName && (
          <div>
            <span style={{ color: '#555' }}>ชื่องาน : </span>
            <span style={{ fontWeight: 600 }}>{projectName}</span>
          </div>
        )}
        <div style={{ color: '#555' }}>นับเป็นสัปดาห์จากวันเริ่มงาน</div>
      </div>

      {phases.length === 0 ? (
        <div style={{ textAlign: 'center', color: '#888', padding: 40 }}>ยังไม่มีแผนงาน</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'center', width: 36 }}>ลำดับ</th>
              <th style={{ ...th, textAlign: 'left', width: 190 }}>ช่วงงาน</th>
              <th style={{ ...th, textAlign: 'center', width: 70 }}>สัปดาห์ที่</th>
              {weeks.map((w) => (
                <th key={w} style={{ ...th, textAlign: 'center', padding: '5px 0', fontSize: 10 }}>
                  {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {phases.map((ph, idx) => (
              <tr key={ph.id}>
                <td style={{ ...td, textAlign: 'center' }}>{idx + 1}</td>
                <td style={td}>{ph.name}</td>
                <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                  {ph.durationWeeks > 1
                    ? `${ph.startWeek}–${ph.startWeek + ph.durationWeeks - 1}`
                    : ph.startWeek}
                </td>
                {weeks.map((w) => {
                  const on = w >= ph.startWeek && w < ph.startWeek + ph.durationWeeks
                  return (
                    <td
                      key={w}
                      style={{
                        ...td,
                        padding: 0,
                        verticalAlign: 'middle',
                        background: on ? '#0891b2' : undefined,
                      }}
                    />
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
