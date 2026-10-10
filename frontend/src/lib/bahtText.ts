const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า']
const PLACES = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน']

/** อ่านเลข 0–999,999 (ไม่รวมคำว่าศูนย์) */
function readGroup(n: number): string {
  const digits = String(n).split('').map(Number)
  return digits
    .map((d, i) => {
      const place = digits.length - 1 - i
      if (d === 0) return ''
      if (place === 1 && d === 1) return 'สิบ'
      if (place === 1 && d === 2) return 'ยี่สิบ'
      // หลักหน่วยเป็น 1 และมีหลักอื่นอยู่ด้วย อ่านว่า "เอ็ด" เช่น 21 = ยี่สิบเอ็ด, 101 = หนึ่งร้อยเอ็ด
      if (place === 0 && d === 1 && digits.length > 1) return 'เอ็ด'
      return DIGITS[d] + PLACES[place]
    })
    .join('')
}

/** อ่านจำนวนเต็มไม่จำกัดหลัก — แบ่งทีละล้าน */
function readInteger(n: number): string {
  if (n < 1_000_000) return readGroup(n)
  const millions = Math.floor(n / 1_000_000)
  const rest = n % 1_000_000
  return readInteger(millions) + 'ล้าน' + (rest > 0 ? readGroup(rest) : '')
}

/**
 * จำนวนเงินเป็นตัวอักษรภาษาไทยแบบที่ใช้บนเอกสาร
 * เช่น 1,250.50 → หนึ่งพันสองร้อยห้าสิบบาทห้าสิบสตางค์
 */
export function bahtText(amount: number): string {
  // ทำงานในหน่วยสตางค์เพื่อเลี่ยงทศนิยมของ float เช่น 0.29 * 100 = 28.999...
  const totalSatang = Math.round(Math.abs(amount) * 100)
  const baht = Math.floor(totalSatang / 100)
  const satang = totalSatang % 100

  if (baht === 0 && satang === 0) return 'ศูนย์บาทถ้วน'

  const sign = amount < 0 ? 'ลบ' : ''
  const bahtPart = baht > 0 ? readInteger(baht) + 'บาท' : ''
  const satangPart = satang > 0 ? readGroup(satang) + 'สตางค์' : 'ถ้วน'
  return sign + bahtPart + satangPart
}
