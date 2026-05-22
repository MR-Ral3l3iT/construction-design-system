import { Badge } from '@construction/ui'

type Variant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'outline'

const STATUS_MAP: Record<string, { label: string; variant: Variant }> = {
  // Project
  LEAD: { label: 'รับงานใหม่', variant: 'default' },
  ESTIMATING: { label: 'ประเมินราคา', variant: 'info' },
  DESIGNING: { label: 'ออกแบบ', variant: 'primary' },
  WAITING_APPROVAL: { label: 'รออนุมัติ', variant: 'warning' },
  BOQ: { label: 'BOQ', variant: 'info' },
  CONTRACT: { label: 'ทำสัญญา', variant: 'info' },
  CONSTRUCTION: { label: 'กำลังก่อสร้าง', variant: 'success' },
  HANDOVER: { label: 'ส่งมอบ', variant: 'success' },
  COMPLETED: { label: 'เสร็จสิ้น', variant: 'success' },
  CANCELLED: { label: 'ยกเลิก', variant: 'danger' },
  // Payment
  UNPAID: { label: 'ยังไม่ชำระ', variant: 'default' },
  PAID: { label: 'ชำระแล้ว', variant: 'success' },
  OVERDUE: { label: 'เกินกำหนด', variant: 'danger' },
  // Issue
  OPEN: { label: 'เปิด', variant: 'danger' },
  IN_PROGRESS: { label: 'กำลังดำเนินการ', variant: 'info' },
  RESOLVED: { label: 'แก้ไขแล้ว', variant: 'success' },
  CLOSED: { label: 'ปิด', variant: 'default' },
  // Lead
  NEW: { label: 'ใหม่', variant: 'info' },
  CONTACTED: { label: 'ติดต่อแล้ว', variant: 'primary' },
  INTERESTED: { label: 'สนใจ', variant: 'warning' },
  NEGOTIATING: { label: 'เจรจา', variant: 'warning' },
  CLOSED_WON: { label: 'ปิดได้', variant: 'success' },
  CLOSED_LOST: { label: 'ปิดไม่ได้', variant: 'danger' },
  // Construction task
  DONE: { label: 'เสร็จแล้ว', variant: 'success' },
  // Design task
  TODO: { label: 'รอดำเนินการ', variant: 'default' },
  WAITING_REVIEW: { label: 'รอรีวิว', variant: 'warning' },
  REVISION: { label: 'แก้ไข', variant: 'warning' },
  APPROVED: { label: 'อนุมัติ', variant: 'success' },
  // BOQ / Contract
  DRAFT: { label: 'ร่าง', variant: 'default' },
  REVIEW: { label: 'รีวิว', variant: 'warning' },
  LOCKED: { label: 'ล็อค', variant: 'info' },
  SENT: { label: 'ส่งแล้ว', variant: 'info' },
  REJECTED: { label: 'ปฏิเสธ', variant: 'danger' },
  ACTIVE: { label: 'ใช้งาน', variant: 'success' },
  TERMINATED: { label: 'ยกเลิกสัญญา', variant: 'danger' },
  EXPIRED: { label: 'หมดอายุ', variant: 'default' },
  // Daily update
  PUBLISHED: { label: 'เผยแพร่', variant: 'success' },
  // Change request
  REQUESTED: { label: 'ยื่นคำขอ', variant: 'info' },
  PENDING: { label: 'รอดำเนินการ', variant: 'warning' },
  IMPLEMENTED: { label: 'ดำเนินการแล้ว', variant: 'success' },
  // Issue priority
  LOW: { label: 'ต่ำ', variant: 'default' },
  MEDIUM: { label: 'ปานกลาง', variant: 'info' },
  HIGH: { label: 'สูง', variant: 'warning' },
  URGENT: { label: 'เร่งด่วน', variant: 'danger' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_MAP[status]
  if (!config) return <Badge variant="outline">{status}</Badge>
  return <Badge variant={config.variant}>{config.label}</Badge>
}
