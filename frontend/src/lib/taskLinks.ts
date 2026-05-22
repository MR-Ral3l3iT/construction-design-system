/**
 * TASK_LINKS — config สำหรับ shortcut chip ที่แสดงในแต่ละ task
 * ถ้าชื่องานตรงกับ pattern จะแสดง chip พร้อม link ไปยังเมนูที่กำหนด
 *
 * ปรับ pattern ได้ที่นี่ที่เดียว — PlansContent และ PlanSettingsContent ใช้ชุดเดียวกัน
 */

export interface TaskLinkConfig {
  key: string
  label: string
  pattern: RegExp
  /** รับ projectId แล้วคืน URL */
  href: (projectId: number) => string
  badgeCls: string
}

export const TASK_LINKS: TaskLinkConfig[] = [
  {
    key: 'boq',
    label: 'BOQ',
    pattern: /\bboq\b|ถอด\s*boq|เจรจาราคา|เสนอราคาก่อสร้าง/i,
    href: (pid) => `/admin/boq?projectId=${pid}`,
    badgeCls: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  },
  {
    key: 'estimate',
    label: 'ใบเสนอราคา',
    pattern: /ใบเสนอราคา|ใบประเมินราคา|เสนอราคาออกแบบ|ประเมินงบประมาณ/i,
    href: (pid) => `/admin/estimates?projectId=${pid}`,
    badgeCls: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
  },
]

/** คืน list ของ links ที่ title ตรงกับ pattern */
export function matchTaskLinks(title: string): TaskLinkConfig[] {
  return TASK_LINKS.filter((l) => l.pattern.test(title))
}
