'use client'

import { use, useMemo, useEffect, useRef, useCallback, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useBOQ, BOQ, BOQItem } from '@/hooks/useBOQ'

const VAT_RATE = 0.07
const MGMT_RATE = 0.1

// A4 landscape: 297mm × 210mm → 1123 × 794px at 96dpi
const A4_W = 1123
const A4_PX = 794

// Inner usable height: 794 - 45(12mm @page bottom margin) - 76(top pad) - 76(bot pad) - 20(safety) = 577
const PAGE_INNER = 577

// Content width for measurement: 1123 - 2×20mm padding (2×76 = 152) = 971
const CONTENT_WIDTH = 971

// Conservative fixed section heights (px)
const FH = {
  companyHeader: 120,
  docTitle: 36,
  hrTop: 20,
  boqInfo: 72,
  hrBot: 18,
  tableHeader: 78,
  footer: 215,
}

const FIRST_FIXED =
  FH.companyHeader + FH.docTitle + FH.hrTop + FH.boqInfo + FH.hrBot + FH.tableHeader
const FIRST_ROW_AVAIL = PAGE_INNER - FIRST_FIXED
const MID_ROW_AVAIL = PAGE_INNER - FH.tableHeader
const LAST_ROW_AVAIL = MID_ROW_AVAIL - FH.footer
const LAST_FIRST_ROW_AVAIL = FIRST_ROW_AVAIL - FH.footer

// ─── Types ────────────────────────────────────────────────────────────────────

type RowType =
  | { type: 'cat'; name: string }
  | { type: 'sub'; name: string; subIdx: number }
  | { type: 'item'; item: BOQItem; subIdx: number; itemIdx: number }
  | { type: 'subtotal'; subName: string; total: number; subIdx: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat('th-TH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
}
function fmtInt(n: number) {
  return new Intl.NumberFormat('th-TH', { maximumFractionDigits: 0 }).format(n)
}
function thaiDate(dateStr: string) {
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear() + 543}`
}

function buildAllRows(boq: BOQ): RowType[] {
  const rows: RowType[] = []
  let subIdx = 0
  for (const cat of boq.categories ?? []) {
    rows.push({ type: 'cat', name: cat.name })
    for (const sub of cat.subCategories ?? []) {
      subIdx++
      rows.push({ type: 'sub', name: sub.name, subIdx })
      let itemIdx = 0
      let subTotal = 0
      for (const item of sub.items ?? []) {
        itemIdx++
        rows.push({ type: 'item', item, subIdx, itemIdx })
        subTotal += Number(item.totalPrice)
      }
      if (itemIdx > 0) {
        rows.push({ type: 'subtotal', subName: sub.name, total: subTotal, subIdx })
      }
    }
  }
  return rows
}

// Fallback estimate (used only while measurement is pending)
function estimateRowH(row: RowType): number {
  if (row.type === 'cat') return 44
  if (row.type === 'sub') return 40
  if (row.type === 'subtotal') return 36
  let h = 54 // conservative: assume 2-line name
  if (row.item.description) h += 22
  if (row.item.remark) h += 22
  return h
}

function paginateWithHeights(allRows: RowType[], heights: number[]): RowType[][] {
  if (allRows.length === 0) return [[]]

  const pages: RowType[][] = []
  let page: RowType[] = []
  let used = 0

  for (let i = 0; i < allRows.length; i++) {
    const h = heights[i] ?? estimateRowH(allRows[i])
    const avail = pages.length === 0 ? FIRST_ROW_AVAIL : MID_ROW_AVAIL
    if (used + h > avail && page.length > 0) {
      pages.push(page)
      page = []
      used = 0
    }
    page.push(allRows[i])
    used += h
  }
  if (page.length > 0) pages.push(page)

  // Ensure footer fits on last page
  const lastIdx = pages.length - 1
  const footerAvail = lastIdx === 0 ? LAST_FIRST_ROW_AVAIL : LAST_ROW_AVAIL
  const lastPageBaseIdx = allRows.length - pages[lastIdx].length
  let usedLast = 0
  let splitAt = pages[lastIdx].length

  for (let i = 0; i < pages[lastIdx].length; i++) {
    usedLast += heights[lastPageBaseIdx + i] ?? estimateRowH(pages[lastIdx][i])
    if (usedLast > footerAvail) {
      splitAt = i
      break
    }
  }

  if (splitAt === 0 && pages[lastIdx].length > 0) {
    pages.push([])
  } else if (splitAt < pages[lastIdx].length) {
    const last = pages.pop()!
    pages.push(last.slice(0, splitAt))
    pages.push(last.slice(splitAt))
  }

  return pages
}

// ─── Hidden measurement table ─────────────────────────────────────────────────
// Renders all rows off-screen with exact same column widths & font to measure
// actual rendered heights, then calls onMeasured with the height array.

function MeasureTable({
  allRows,
  onMeasured,
}: {
  allRows: RowType[]
  onMeasured: (heights: number[]) => void
}) {
  const tbodyRef = useRef<HTMLTableSectionElement>(null)

  useEffect(() => {
    if (!tbodyRef.current) return
    const trs = tbodyRef.current.querySelectorAll('tr')
    const heights: number[] = []
    trs.forEach((tr, i) => {
      heights[i] = tr.getBoundingClientRect().height
    })
    onMeasured(heights)
  }, [allRows, onMeasured])

  return (
    <div
      style={{
        position: 'fixed',
        left: -9999,
        top: 0,
        width: CONTENT_WIDTH,
        visibility: 'hidden',
        pointerEvents: 'none',
        fontFamily: "'Prompt', 'Sarabun', sans-serif",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <colgroup>
          <col style={{ width: 38 }} />
          <col />
          <col style={{ width: 52 }} />
          <col style={{ width: 46 }} />
          <col style={{ width: 83 }} />
          <col style={{ width: 88 }} />
          <col style={{ width: 83 }} />
          <col style={{ width: 88 }} />
          <col style={{ width: 95 }} />
          <col style={{ width: 75 }} />
        </colgroup>
        <tbody ref={tbodyRef}>
          {allRows.map((row, i) => {
            if (row.type === 'cat')
              return (
                <tr key={i}>
                  <td style={{ padding: '5px 8px' }} />
                  <td colSpan={9} style={{ padding: '5px 8px', fontWeight: 600, fontSize: 13 }}>
                    {row.name}
                  </td>
                </tr>
              )
            if (row.type === 'sub')
              return (
                <tr key={i}>
                  <td style={{ padding: '5px 8px' }} />
                  <td colSpan={9} style={{ padding: '5px 8px', fontSize: 12, fontWeight: 600 }}>
                    {row.name}
                  </td>
                </tr>
              )
            if (row.type === 'subtotal')
              return (
                <tr key={i}>
                  <td colSpan={8} style={{ padding: '5px 8px', fontSize: 12 }} />
                  <td style={{ padding: '5px 8px', fontSize: 12, fontWeight: 600 }}>
                    {fmt(row.total)}
                  </td>
                  <td style={{ padding: '5px 8px' }} />
                </tr>
              )
            const { item } = row
            return (
              <tr key={i}>
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }}>
                  <div style={{ fontWeight: 500 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 11.5, marginTop: 2 }}>{item.description}</div>
                  )}
                </td>
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px' }} />
                <td style={{ padding: '5px 8px', fontSize: 11 }}>{item.remark ?? ''}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Shared table styles ──────────────────────────────────────────────────────

const thDark: React.CSSProperties = {
  border: '1px solid #1e293b',
  padding: '5px 8px',
  background: '#1e293b',
  color: 'white',
  fontWeight: 600,
}
const td: React.CSSProperties = {
  border: '1px solid #ddd',
  padding: '5px 8px',
  verticalAlign: 'top',
}
const tdCat: React.CSSProperties = {
  border: '1px solid #cbd5e1',
  padding: '5px 8px',
  background: '#f1f5f9',
  fontWeight: 600,
  verticalAlign: 'top',
}

function TableHead() {
  return (
    <thead>
      <tr>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'center', width: 38 }}>
          ลำดับ
        </th>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'left' }}>
          รายการ
        </th>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'center', width: 52 }}>
          จำนวน
        </th>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'center', width: 46 }}>
          หน่วย
        </th>
        <th colSpan={2} style={{ ...thDark, textAlign: 'center' }}>
          ค่าวัสดุ
        </th>
        <th colSpan={2} style={{ ...thDark, textAlign: 'center' }}>
          ค่าแรงงาน
        </th>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'center', width: 95, lineHeight: 1.3 }}>
          รวมค่าวัสดุ
          <br />
          และค่าแรงงาน
        </th>
        <th rowSpan={2} style={{ ...thDark, textAlign: 'center', width: 75 }}>
          หมายเหตุ
        </th>
      </tr>
      <tr>
        <th style={{ ...thDark, textAlign: 'center', width: 83, fontSize: 11 }}>ราคาต่อหน่วย</th>
        <th style={{ ...thDark, textAlign: 'center', width: 88, fontSize: 11 }}>จำนวนเงิน</th>
        <th style={{ ...thDark, textAlign: 'center', width: 83, fontSize: 11 }}>ราคาต่อหน่วย</th>
        <th style={{ ...thDark, textAlign: 'center', width: 88, fontSize: 11 }}>จำนวนเงิน</th>
      </tr>
    </thead>
  )
}

function TableRows({ rows }: { rows: RowType[] }) {
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={7} style={{ ...td, textAlign: 'center', color: '#888', padding: 20 }}>
          ไม่มีรายการ
        </td>
      </tr>
    )
  }
  return (
    <>
      {rows.map((row, i) => {
        if (row.type === 'cat')
          return (
            <tr key={`cat-${i}`}>
              <td style={{ ...tdCat, background: '#1e293b', color: 'white' }} />
              <td
                colSpan={9}
                style={{ ...tdCat, background: '#1e293b', color: 'white', fontSize: 13 }}
              >
                {row.name}
              </td>
            </tr>
          )
        if (row.type === 'sub')
          return (
            <tr key={`sub-${i}`}>
              <td style={{ ...tdCat, textAlign: 'center', fontWeight: 700 }}>{row.subIdx}.</td>
              <td colSpan={9} style={{ ...tdCat, fontSize: 12 }}>
                {row.name}
              </td>
            </tr>
          )
        if (row.type === 'subtotal')
          return (
            <tr key={`subtotal-${i}`}>
              <td
                colSpan={8}
                style={{
                  ...td,
                  background: '#f8fafc',
                  borderRight: 'none',
                  textAlign: 'right',
                  fontSize: 12,
                  color: '#475569',
                  paddingRight: 8,
                }}
              >
                รวม {row.subName}
              </td>
              <td
                style={{
                  ...td,
                  background: '#f8fafc',
                  borderLeft: 'none',
                  textAlign: 'right',
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                {fmt(row.total)}
              </td>
              <td style={{ ...td, background: '#f8fafc' }} />
            </tr>
          )
        const { item, subIdx, itemIdx } = row
        const matAmt = Number(item.quantity) * Number(item.materialPrice)
        const labAmt = Number(item.quantity) * Number(item.laborPrice)
        return (
          <tr key={`item-${item.id}`} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
            <td style={{ ...td, textAlign: 'center', fontSize: 11 }}>
              {subIdx}.{itemIdx}
            </td>
            <td style={td}>
              <div style={{ fontWeight: 500 }}>{item.name}</div>
              {item.description && (
                <div style={{ color: '#555', fontSize: 11.5, marginTop: 2 }}>
                  {item.description}
                </div>
              )}
            </td>
            <td style={{ ...td, textAlign: 'center' }}>{fmtInt(item.quantity)}</td>
            <td style={{ ...td, textAlign: 'center', color: '#666' }}>{item.unit ?? '-'}</td>
            <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(item.materialPrice))}</td>
            <td style={{ ...td, textAlign: 'right' }}>{fmt(matAmt)}</td>
            <td style={{ ...td, textAlign: 'right' }}>{fmt(Number(item.laborPrice))}</td>
            <td style={{ ...td, textAlign: 'right' }}>{fmt(labAmt)}</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 500 }}>
              {fmt(Number(item.totalPrice))}
            </td>
            <td style={{ ...td, fontSize: 11, color: '#b45309', fontStyle: 'italic' }}>
              {item.remark ?? ''}
            </td>
          </tr>
        )
      })}
    </>
  )
}

// ─── Single page component ────────────────────────────────────────────────────

interface BOQPageProps {
  boq: BOQ
  rows: RowType[]
  isFirst: boolean
  isLast: boolean
  pageNum: number
  totalPages: number
  copyLabel: string
  copyClass: string
}

function BOQPage({
  boq,
  rows,
  isFirst,
  isLast,
  pageNum,
  totalPages,
  copyLabel,
  copyClass,
}: BOQPageProps) {
  const dateStr = thaiDate(boq.createdAt)
  const baseCost = Number(boq.totalAmount)
  const mgmt = Math.round(baseCost * MGMT_RATE * 100) / 100
  const beforeVat = baseCost + mgmt
  const vat = Math.round(beforeVat * VAT_RATE * 100) / 100
  const grandTotal = beforeVat + vat

  return (
    <div
      className={`print-page ${copyClass} ${isLast ? '' : 'print-page-break'}`}
      style={{
        width: A4_W,
        height: A4_PX,
        margin: '0 auto',
        background: 'white',
        padding: '20mm 20mm 20mm',
        fontFamily: "'Prompt', 'Sarabun', sans-serif",
        fontSize: 13,
        lineHeight: 1.6,
        color: '#111',
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {/* ── FIRST PAGE ONLY: company header + BOQ info ── */}
      {isFirst && (
        <>
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
                    BOQ
                  </div>
                  <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>
                    Bill of Quantities
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
                        <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                          เลขที่:
                        </td>
                        <td style={{ fontWeight: 600 }}>{boq.code}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                          เวอร์ชัน:
                        </td>
                        <td>v{boq.version}</td>
                      </tr>
                      <tr>
                        <td style={{ paddingRight: 8, color: '#555', textAlign: 'right' }}>
                          วันที่:
                        </td>
                        <td>{dateStr}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          <div
            style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: 14,
              marginBottom: 6,
              letterSpacing: 0.5,
            }}
          >
            แบบแสดงรายการประมาณปริมาณวัสดุ ราคาค่าวัสดุ และค่าแรงงานงานก่อสร้าง
          </div>

          <hr style={{ borderTop: '2px solid #0a1628', marginBottom: 8 }} />

          <div style={{ marginBottom: 10, fontSize: 12 }}>
            <div style={{ marginBottom: 2 }}>
              <span style={{ color: '#555' }}>ชื่องาน : </span>
              <span style={{ fontWeight: 600 }}>{boq.title}</span>
            </div>
            {boq.project && (
              <div style={{ marginBottom: 2 }}>
                <span style={{ color: '#555' }}>โครงการ : </span>
                <span style={{ fontWeight: 600 }}>
                  {boq.project.code} — {boq.project.name}
                </span>
              </div>
            )}
            {boq.project?.customer && (
              <div>
                <span style={{ color: '#555' }}>เจ้าของโครงการ : </span>
                <span style={{ fontWeight: 600 }}>{boq.project.customer.name}</span>
                {boq.project.customer.phone && (
                  <span style={{ color: '#666', marginLeft: 8 }}>
                    โทร. {boq.project.customer.phone}
                  </span>
                )}
              </div>
            )}
          </div>

          <hr style={{ borderTop: '1px solid #ccc', marginBottom: 8 }} />
        </>
      )}

      {/* ── ALL PAGES: items table ── */}
      <div style={{ textAlign: 'right', fontSize: 11, color: '#555', marginBottom: 2 }}>
        หน่วย : บาท
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
        <TableHead />
        <tbody>
          <TableRows rows={rows} />
        </tbody>
      </table>

      {/* ── LAST PAGE ONLY: footer ── */}
      {isLast && (
        <table
          style={{ width: '100%', borderCollapse: 'collapse', marginTop: 10, breakInside: 'avoid' }}
        >
          <tbody>
            <tr>
              {/* ── Left: cost summary + grand total ── */}
              <td
                style={{
                  verticalAlign: 'top',
                  paddingRight: 24,
                  width: '40%',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 6, color: '#0a1628' }}>
                  สรุปต้นทุน
                </div>
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
                      { label: 'ค่าวัสดุ *', value: Number(boq.materialCost) },
                      { label: 'ค่าแรงงาน **', value: Number(boq.laborCost) },
                      { label: 'ค่า Overhead', value: Number(boq.overheadCost) },
                      { label: 'กำไร (Profit)', value: Number(boq.profit) },
                      { label: `รวมต้นทุน`, value: baseCost },
                    ].map((r) => (
                      <tr key={r.label}>
                        <td
                          style={{
                            padding: '3px 10px',
                            borderBottom: '1px solid #eee',
                            color: '#555',
                          }}
                        >
                          {r.label}
                        </td>
                        <td
                          style={{
                            padding: '3px 10px',
                            textAlign: 'right',
                            borderBottom: '1px solid #eee',
                          }}
                        >
                          {fmt(r.value)}
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td
                        style={{
                          padding: '3px 10px',
                          borderBottom: '1px solid #eee',
                          color: '#444',
                        }}
                      >
                        ค่าดำเนินการ {(MGMT_RATE * 100).toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '3px 10px',
                          textAlign: 'right',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {fmt(mgmt)}
                      </td>
                    </tr>
                    <tr>
                      <td
                        style={{
                          padding: '3px 10px',
                          borderBottom: '1px solid #eee',
                          color: '#444',
                        }}
                      >
                        ภาษีมูลค่าเพิ่ม {(VAT_RATE * 100).toFixed(2)}%
                      </td>
                      <td
                        style={{
                          padding: '3px 10px',
                          textAlign: 'right',
                          borderBottom: '1px solid #eee',
                        }}
                      >
                        {fmt(vat)}
                      </td>
                    </tr>
                    <tr style={{ background: '#f0f9ff' }}>
                      <td style={{ padding: '5px 10px', fontWeight: 700 }}>
                        รวมราคางานก่อสร้างทั้งสิ้น
                      </td>
                      <td
                        style={{
                          padding: '5px 10px',
                          textAlign: 'right',
                          fontWeight: 700,
                          fontSize: 13,
                        }}
                      >
                        {fmt(grandTotal)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* ── Middle: remarks ── */}
              <td
                style={{
                  verticalAlign: 'top',
                  paddingRight: 24,
                  width: '35%',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: 8,
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>หมายเหตุ</div>
                <div style={{ fontSize: 11, color: '#444', lineHeight: 1.75 }}>
                  <div>* ค่าวัสดุ อ้างอิงจากราคากลางของกระทรวงพาณิชย์ หรือตัวแทนจำหน่าย</div>
                  <div>** ค่าแรงงาน อ้างอิงจากกระทรวงการคลัง</div>
                  <div>
                    *** ผู้คำนวณราคาเป็นเพียงผู้ดำเนินการหาค่าวัสดุ และค่าแรงงานตามราคาตลาด ณ
                    วันที่ออกเอกสารนี้เท่านั้น
                  </div>
                  <div>**** แบบแปลนไม่ระบุรายละเอียดหรือจำนวน จะไม่ถูกนำมาคิดในราคาประเมินนี้</div>
                </div>
              </td>

              {/* ── Right: signatures ── */}
              <td style={{ verticalAlign: 'bottom', width: '25%', borderTop: '1px solid #cbd5e1' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    <tr>
                      <td style={{ textAlign: 'center', paddingTop: 48 }}>
                        <div
                          style={{
                            borderTop: '1px solid #555',
                            display: 'inline-block',
                            width: 140,
                            marginBottom: 6,
                          }}
                        />
                        <div style={{ fontWeight: 500, fontSize: 12 }}>ผู้จัดทำ BOQ</div>
                        <div style={{ marginTop: 6, color: '#555', fontSize: 11 }}>
                          วันที่ ................................
                        </div>
                      </td>
                      <td style={{ textAlign: 'center', paddingTop: 48 }}>
                        <div
                          style={{
                            borderTop: '1px solid #555',
                            display: 'inline-block',
                            width: 140,
                            marginBottom: 6,
                          }}
                        />
                        <div style={{ fontWeight: 500, fontSize: 12 }}>ผู้อนุมัติ</div>
                        <div style={{ marginTop: 6, color: '#555', fontSize: 11 }}>
                          วันที่ {dateStr}
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {/* Page label — screen preview only */}
      <div
        className="no-print"
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          background: '#0284c7',
          color: 'white',
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 10px',
          borderRadius: 4,
          letterSpacing: 0.5,
          pointerEvents: 'none',
        }}
      >
        {copyLabel} — หน้า {pageNum} / {totalPages}
      </div>
    </div>
  )
}

// ─── Print controller ─────────────────────────────────────────────────────────

function BOQPrint({ boqId }: { boqId: number }) {
  const searchParams = useSearchParams()
  const autoprint = searchParams.get('autoprint') === '1'
  const { data: boq, isLoading } = useBOQ(boqId)

  const [measuredHeights, setMeasuredHeights] = useState<number[] | null>(null)

  const allRows = useMemo(() => (boq ? buildAllRows(boq) : []), [boq])

  // Reset measurement whenever BOQ data changes
  useEffect(() => {
    setMeasuredHeights(null)
  }, [boq])

  const handleMeasured = useCallback((h: number[]) => setMeasuredHeights(h), [])

  const pages = useMemo(() => {
    if (!boq || !measuredHeights) return []
    return paginateWithHeights(allRows, measuredHeights)
  }, [boq, allRows, measuredHeights])

  useEffect(() => {
    if (autoprint && boq && pages.length > 0) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [autoprint, boq, pages])

  if (isLoading)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        กำลังโหลด...
      </div>
    )
  if (!boq)
    return (
      <div
        style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}
      >
        ไม่พบ BOQ
      </div>
    )

  const totalPages = pages.length
  const isMeasuring = measuredHeights === null

  return (
    <>
      {/* Measurement pass — off-screen, hidden */}
      {boq && <MeasureTable allRows={allRows} onMeasured={handleMeasured} />}

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
          disabled={isMeasuring}
          style={{
            background: isMeasuring ? '#334155' : '#0891b2',
            color: 'white',
            border: 'none',
            padding: '8px 20px',
            borderRadius: 6,
            cursor: isMeasuring ? 'default' : 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🖨️ {isMeasuring ? 'กำลังคำนวณหน้า...' : 'พิมพ์ / บันทึก PDF'}
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
        {!isMeasuring && (
          <>
            <span style={{ color: '#64748b', fontSize: 12 }}>
              พิมพ์ออก 2 ชุด: ต้นฉบับ + สำเนา — เลือก &quot;Save as PDF&quot; เพื่อดาวน์โหลด
            </span>
            <span
              style={{
                marginLeft: 'auto',
                background: '#1e293b',
                color: '#94a3b8',
                fontSize: 11,
                padding: '4px 12px',
                borderRadius: 4,
                border: '1px solid #334155',
              }}
            >
              {totalPages} หน้า / ชุด &nbsp;·&nbsp; {totalPages * 2} หน้ารวม
            </span>
          </>
        )}
      </div>

      <div className="no-print" style={{ height: 20 }} />

      {/* Pages — render only after measurement */}
      {!isMeasuring && (
        <>
          {pages.map((pageRows, i) => (
            <BOQPage
              key={`orig-${i}`}
              boq={boq}
              rows={pageRows}
              isFirst={i === 0}
              isLast={i === totalPages - 1}
              pageNum={i + 1}
              totalPages={totalPages}
              copyLabel="ต้นฉบับ"
              copyClass="copy-orig"
            />
          ))}

          <div className="page-break" />

          {pages.map((pageRows, i) => (
            <BOQPage
              key={`sane-${i}`}
              boq={boq}
              rows={pageRows}
              isFirst={i === 0}
              isLast={i === totalPages - 1}
              pageNum={i + 1}
              totalPages={totalPages}
              copyLabel="สำเนา"
              copyClass="copy-sane"
            />
          ))}
        </>
      )}
    </>
  )
}

// ─── Entry point ──────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>
}

export default function BOQPrintPage({ params }: Props) {
  const { id } = use(params)
  const boqId = parseInt(id, 10)
  return (
    <Suspense>
      <BOQPrint boqId={boqId} />
    </Suspense>
  )
}
