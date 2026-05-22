import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  ClipboardList,
  Handshake,
  CreditCard,
  CalendarDays,
  HardHat,
  AlertTriangle,
  GitBranch,
  Files,
  ShieldCheck,
  Pencil,
  Settings2,
} from 'lucide-react'
import type { SidebarSection } from '@construction/ui'

export const adminNavSections: SidebarSection[] = [
  {
    items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
    ],
  },
  {
    title: 'งานขายและโครงการ',
    items: [
      { key: 'customers', label: 'ลูกค้า / Lead', icon: Users, href: '/admin/customers' },
      { key: 'projects', label: 'โครงการ', icon: FolderKanban, href: '/admin/projects' },
      { key: 'estimates', label: 'ใบประเมินราคา', icon: FileText, href: '/admin/estimates' },
    ],
  },
  {
    title: 'งานออกแบบและก่อสร้าง',
    items: [
      { key: 'design-tasks', label: 'งานออกแบบ', icon: Pencil, href: '/admin/design-tasks' },
      { key: 'boq', label: 'BOQ', icon: ClipboardList, href: '/admin/boq' },
      { key: 'contracts', label: 'สัญญา', icon: Handshake, href: '/admin/contracts' },
      { key: 'payments', label: 'งวดเงิน', icon: CreditCard, href: '/admin/payments' },
      { key: 'plans', label: 'แผนงาน', icon: CalendarDays, href: '/admin/plans' },
      {
        key: 'daily-reports',
        label: 'รายงานประจำวัน',
        icon: HardHat,
        href: '/admin/daily-reports',
      },
    ],
  },
  {
    title: 'ติดตามงาน',
    items: [
      { key: 'issues', label: 'ปัญหา', icon: AlertTriangle, href: '/admin/issues' },
      { key: 'files', label: 'ไฟล์และเอกสาร', icon: Files, href: '/admin/files' },
    ],
  },
  {
    title: 'ระบบ',
    items: [
      { key: 'team', label: 'ทีมและสิทธิ์', icon: ShieldCheck, href: '/admin/team' },
      {
        key: 'plan-settings',
        label: 'ตั้งค่าแผนงาน',
        icon: Settings2,
        href: '/admin/plan-settings',
      },
    ],
  },
]
