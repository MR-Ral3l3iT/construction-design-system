/**
 * ช่องกรอกเงินแบบมี , คั่นหลักพัน — แปลงระหว่างข้อความที่แสดงกับค่าดิบที่ส่ง backend
 * ค่าดิบเป็น string ไม่ใช่ number เพื่อไม่ให้ทศนิยมเพี้ยนระหว่างพิมพ์ (เช่น "1000.10")
 */

/** ข้อความที่ผู้ใช้พิมพ์/วาง → ค่าดิบ เก็บเฉพาะตัวเลขและจุดแรก ทศนิยมไม่เกิน 2 ตำแหน่ง */
export function parseMoneyInput(text: string): string {
  const cleaned = text.replace(/[^\d.]/g, '')
  const [int = '', ...rest] = cleaned.split('.')
  const intPart = int.replace(/^0+(?=\d)/, '')
  if (rest.length === 0) return intPart
  return `${intPart || '0'}.${rest.join('').slice(0, 2)}`
}

/** ค่าดิบ → ข้อความแสดงผล "180000.5" → "180,000.5" (คงจุดท้ายไว้ระหว่างพิมพ์) */
export function formatMoneyInput(raw: string): string {
  if (raw === '') return ''
  const [int, dec] = raw.split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return dec === undefined ? grouped : `${grouped}.${dec}`
}

/**
 * ตำแหน่ง cursor หลังจัดรูปแบบใหม่ — นับจำนวนตัวเลข/จุดก่อน cursor เดิม แล้วหาตำแหน่งเดียวกัน
 * ในข้อความใหม่ ไม่งั้น cursor จะกระโดดไปท้ายทุกครั้งที่มี , เพิ่มหรือหาย
 */
export function caretAfterFormat(typed: string, caret: number, formatted: string): number {
  const significant = typed.slice(0, caret).replace(/[^\d.]/g, '').length
  let seen = 0
  for (let i = 0; i < formatted.length; i++) {
    if (seen === significant) return i
    if (/[\d.]/.test(formatted[i])) seen++
  }
  return formatted.length
}
