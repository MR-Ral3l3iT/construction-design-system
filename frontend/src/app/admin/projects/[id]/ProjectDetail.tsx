'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  MapPin,
  Calendar,
  CalendarCheck2,
  DollarSign,
  X,
  UserPlus,
  ChevronRight,
  Pencil,
  Trash2,
  Save,
  Maximize2,
  Tag,
  User,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Activity,
  Download,
  Eye,
  FileScan,
  Zap,
  Calculator,
  PenTool,
  ListOrdered,
  FileCheck,
  Banknote,
  HardHat,
  ClipboardList,
  AlertCircle,
  RefreshCw,
  FolderOpen,
} from 'lucide-react'
import {
  Card,
  CardBody,
  Badge,
  Button,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Input,
  Select,
} from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { ConfirmModal } from '@/components/shared/ConfirmModal'
import { ProjectFormModal } from '../ProjectFormModal'
import { FilesContent } from '../../files/FilesContent'
import {
  useProject,
  useUpdateProjectStatus,
  useUpdateProjectProgress,
  useAddProjectMember,
  useRemoveProjectMember,
  useDeleteProject,
} from '@/hooks/useProjects'
import { useFilesByProject } from '@/hooks/useFiles'
import { useUsers } from '@/hooks/useUsers'
import { useToast } from '@/providers/toast-provider'

const TYPE_LABEL: Record<string, string> = {
  DESIGN_ONLY: 'ออกแบบ (DS)',
  CONSTRUCTION: 'ก่อสร้าง (CN)',
  TURNKEY: 'ออกแบบ + ก่อสร้าง (DC)',
}

const STATUS_OPTIONS = [
  { value: 'LEAD', label: 'รับงานใหม่' },
  { value: 'ESTIMATING', label: 'ประเมินราคา' },
  { value: 'DESIGNING', label: 'ออกแบบ' },
  { value: 'WAITING_APPROVAL', label: 'รออนุมัติ' },
  { value: 'BOQ', label: 'BOQ' },
  { value: 'CONTRACT', label: 'ทำสัญญา' },
  { value: 'CONSTRUCTION', label: 'ก่อสร้าง' },
  { value: 'HANDOVER', label: 'ส่งมอบ' },
  { value: 'COMPLETED', label: 'เสร็จสิ้น' },
  { value: 'CANCELLED', label: 'ยกเลิก' },
]

function formatCurrency(n: number | null | undefined) {
  if (n == null) return '-'
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const IMAGE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

async function downloadFile(url: string, filename: string) {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(url, '_blank')
  }
}

interface Props {
  id: number
}

export function ProjectDetail({ id }: Props) {
  const router = useRouter()
  const { success, error: toastError } = useToast()
  const { data: project, isLoading } = useProject(id)
  const { data: allFiles } = useFilesByProject(id)
  const updateStatus = useUpdateProjectStatus(id)
  const updateProgress = useUpdateProjectProgress(id)
  const addMember = useAddProjectMember(id)
  const removeMember = useRemoveProjectMember(id)
  const deleteMutation = useDeleteProject()

  const { data: usersData } = useUsers()
  const allUsers = usersData?.data ?? []

  const [activeTab, setActiveTab] = useState('overview')
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [removeMemberId, setRemoveMemberId] = useState<number | null>(null)
  const [newProgress, setNewProgress] = useState('')
  const [addUserId, setAddUserId] = useState('')
  const [addRoleName, setAddRoleName] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [fileModalCategory, setFileModalCategory] = useState<'PLAN' | 'IMAGE' | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }

  if (!project) return <p className="text-gray-500">ไม่พบข้อมูลโครงการ</p>

  const planFiles = (allFiles ?? []).filter((f) => f.category === 'PLAN')
  const imageFiles = (allFiles ?? []).filter((f) => f.category === 'IMAGE')
  const fileModalFiles = fileModalCategory === 'PLAN' ? planFiles : imageFiles
  const fileModalTitle = fileModalCategory === 'PLAN' ? 'แปลน / ไฟล์แนบ' : 'ภาพประกอบ'

  async function handleStatus(status: string) {
    try {
      await updateStatus.mutateAsync(status)
      success('อัปเดตสถานะสำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleProgress() {
    const val = parseInt(newProgress, 10)
    if (isNaN(val) || val < 0 || val > 100) return toastError('กรอกตัวเลข 0-100')
    try {
      await updateProgress.mutateAsync(val)
      success('อัปเดตความคืบหน้าสำเร็จ')
      setNewProgress('')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleAddMember() {
    const uid = parseInt(addUserId, 10)
    if (isNaN(uid) || uid < 1) return toastError('กรุณาเลือกผู้ใช้งาน')
    try {
      await addMember.mutateAsync({ userId: uid, roleName: addRoleName || undefined })
      success('เพิ่มสมาชิกสำเร็จ')
      setAddUserId('')
      setAddRoleName('')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  async function handleRemoveMember() {
    if (!removeMemberId) return
    try {
      await removeMember.mutateAsync(removeMemberId)
      success('ลบสมาชิกสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    } finally {
      setRemoveMemberId(null)
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(id)
      success('ลบโครงการสำเร็จ')
      router.push('/admin/projects')
    } catch {
      toastError('เกิดข้อผิดพลาดในการลบ')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-gray-400">{project.code}</p>
              <h2 className="text-xl font-semibold text-gray-900">{project.name}</h2>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline">{TYPE_LABEL[project.type] ?? project.type}</Badge>
                <StatusBadge status={project.status} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" icon={Pencil} onClick={() => setEditOpen(true)}>
                แก้ไข
              </Button>
              <Button variant="danger" size="sm" icon={Trash2} onClick={() => setDeleteOpen(true)}>
                ลบ
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={setActiveTab}>
        <TabList>
          <Tab value="overview">ภาพรวม</Tab>
          <Tab value="members" badge={project.members?.length}>
            ทีมงาน
          </Tab>
          <Tab value="files">ไฟล์และเอกสาร</Tab>
        </TabList>

        <TabPanel value="overview">
          <div className="space-y-4 pt-4">
            {/* Project Info Card */}
            <Card>
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
                  <div>
                    <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Tag className="h-3 w-3" /> ประเภท
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-gray-900">
                      {TYPE_LABEL[project.type] ?? project.type}
                    </dd>
                  </div>

                  {project.customer && (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <User className="h-3 w-3" /> ลูกค้า
                      </dt>
                      <dd className="mt-1 text-sm font-medium">
                        <Link
                          href={`/admin/customers/${project.customer.id}`}
                          className="text-primary-600 hover:underline"
                        >
                          {project.customer.name}
                        </Link>
                      </dd>
                    </div>
                  )}

                  {(project.addressLine || project.province) && (
                    <div className="col-span-2 sm:col-span-3">
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <MapPin className="h-3 w-3" /> สถานที่ตั้งโครงการ
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {[
                          project.addressLine,
                          project.subdistrict,
                          project.district,
                          project.province,
                          project.postcode,
                        ]
                          .filter(Boolean)
                          .join(' ')}
                      </dd>
                    </div>
                  )}

                  {project.areaSize != null && (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Maximize2 className="h-3 w-3" /> ขนาดพื้นที่
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {Number(project.areaSize).toLocaleString('th-TH')} ตร.ม.
                      </dd>
                    </div>
                  )}

                  {project.startDate && (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar className="h-3 w-3" /> วันเริ่มต้น
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(project.startDate).toLocaleDateString('th-TH')}
                      </dd>
                    </div>
                  )}

                  {project.endDate && (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <CalendarCheck2 className="h-3 w-3" /> วันสิ้นสุด
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(project.endDate).toLocaleDateString('th-TH')}
                      </dd>
                    </div>
                  )}

                  {(project.budgetMin != null || project.budgetMax != null) && (
                    <div>
                      <dt className="flex items-center gap-1.5 text-xs text-gray-500">
                        <DollarSign className="h-3 w-3" /> งบประมาณ
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {formatCurrency(project.budgetMin)} – {formatCurrency(project.budgetMax)}
                      </dd>
                    </div>
                  )}
                </dl>

                {project.description && (
                  <>
                    <hr className="my-4" />
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {project.description}
                    </p>
                  </>
                )}
              </CardBody>
            </Card>

            {/* Progress / Status / Documents — 3 columns */}
            <div className="grid gap-4 lg:grid-cols-3">
              {/* ความคืบหน้า */}
              <Card>
                <CardBody>
                  <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                    <Activity className="h-4 w-4 text-primary-500" /> ความคืบหน้า
                  </h3>
                  <div className="mb-3">
                    <span className="text-2xl font-bold text-primary-600">{project.progress}%</span>
                    <div className="mt-2 h-3 w-full rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full bg-primary-500 transition-all"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newProgress}
                      onChange={(e) => setNewProgress(e.target.value)}
                      placeholder="0-100"
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Save}
                      onClick={handleProgress}
                      loading={updateProgress.isPending}
                    >
                      อัปเดต
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* สถานะโครงการ */}
              <Card>
                <CardBody>
                  <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                    <Tag className="h-4 w-4 text-primary-500" /> สถานะโครงการ
                  </h3>
                  <Select
                    options={STATUS_OPTIONS}
                    value={project.status}
                    onChange={(e) => handleStatus(e.target.value)}
                  />
                  <div className="mt-3">
                    <StatusBadge status={project.status} />
                  </div>
                </CardBody>
              </Card>

              {/* เอกสารประกอบโครงการ */}
              <Card>
                <CardBody>
                  <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                    <Paperclip className="h-4 w-4 text-primary-500" /> เอกสารประกอบ
                  </h3>
                  <div className="space-y-2">
                    {/* ปุ่ม แปลน / ไฟล์แนบ */}
                    <button
                      onClick={() => setFileModalCategory('PLAN')}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <FileScan className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">แปลน / ไฟล์แนบ</p>
                        <p className="text-xs text-gray-500">{planFiles.length} ไฟล์</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    </button>

                    {/* ปุ่ม ภาพประกอบ */}
                    <button
                      onClick={() => setFileModalCategory('IMAGE')}
                      className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left transition-colors hover:border-primary-200 hover:bg-primary-50"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <ImageIcon className="h-5 w-5 text-primary-500" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">ภาพประกอบ</p>
                        <p className="text-xs text-gray-500">{imageFiles.length} ไฟล์</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                    </button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Quick Links */}
            <Card>
              <CardBody>
                <h3 className="mb-4 flex items-center gap-2 font-medium text-gray-900">
                  <Zap className="h-4 w-4 text-primary-500" /> ลิงก์ด่วน
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {[
                    {
                      label: 'ใบประเมิน',
                      href: `/admin/estimates?projectId=${id}`,
                      icon: Calculator,
                      iconColor: 'text-sky-500',
                      bgColor: 'bg-sky-50',
                      borderHover: 'hover:border-sky-200',
                      bgHover: 'hover:bg-sky-50',
                    },
                    {
                      label: 'งานออกแบบ',
                      href: `/admin/design-tasks?projectId=${id}`,
                      icon: PenTool,
                      iconColor: 'text-violet-500',
                      bgColor: 'bg-violet-50',
                      borderHover: 'hover:border-violet-200',
                      bgHover: 'hover:bg-violet-50',
                    },
                    {
                      label: 'BOQ',
                      href: `/admin/boq?projectId=${id}`,
                      icon: ListOrdered,
                      iconColor: 'text-orange-500',
                      bgColor: 'bg-orange-50',
                      borderHover: 'hover:border-orange-200',
                      bgHover: 'hover:bg-orange-50',
                    },
                    {
                      label: 'สัญญา',
                      href: `/admin/contracts?projectId=${id}`,
                      icon: FileCheck,
                      iconColor: 'text-green-500',
                      bgColor: 'bg-green-50',
                      borderHover: 'hover:border-green-200',
                      bgHover: 'hover:bg-green-50',
                    },
                    {
                      label: 'งวดเงิน',
                      href: `/admin/payments?projectId=${id}`,
                      icon: Banknote,
                      iconColor: 'text-emerald-500',
                      bgColor: 'bg-emerald-50',
                      borderHover: 'hover:border-emerald-200',
                      bgHover: 'hover:bg-emerald-50',
                    },
                    {
                      label: 'แผนงานก่อสร้าง',
                      href: `/admin/plans?projectId=${id}`,
                      icon: HardHat,
                      iconColor: 'text-amber-500',
                      bgColor: 'bg-amber-50',
                      borderHover: 'hover:border-amber-200',
                      bgHover: 'hover:bg-amber-50',
                    },
                    {
                      label: 'รายงานประจำวัน',
                      href: `/admin/daily-updates?projectId=${id}`,
                      icon: ClipboardList,
                      iconColor: 'text-blue-500',
                      bgColor: 'bg-blue-50',
                      borderHover: 'hover:border-blue-200',
                      bgHover: 'hover:bg-blue-50',
                    },
                    {
                      label: 'ปัญหา',
                      href: `/admin/issues?projectId=${id}`,
                      icon: AlertCircle,
                      iconColor: 'text-red-500',
                      bgColor: 'bg-red-50',
                      borderHover: 'hover:border-red-200',
                      bgHover: 'hover:bg-red-50',
                    },
                    {
                      label: 'คำขอเปลี่ยนแปลง',
                      href: `/admin/change-requests?projectId=${id}`,
                      icon: RefreshCw,
                      iconColor: 'text-purple-500',
                      bgColor: 'bg-purple-50',
                      borderHover: 'hover:border-purple-200',
                      bgHover: 'hover:bg-purple-50',
                    },
                    {
                      label: 'ไฟล์และเอกสาร',
                      href: `/admin/files?projectId=${id}`,
                      icon: FolderOpen,
                      iconColor: 'text-gray-500',
                      bgColor: 'bg-gray-100',
                      borderHover: 'hover:border-gray-300',
                      bgHover: 'hover:bg-gray-50',
                    },
                  ].map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`group flex flex-col items-center gap-2.5 rounded-xl border border-gray-100 bg-white p-4 text-center shadow-sm transition-all ${link.borderHover} ${link.bgHover} hover:shadow-md`}
                    >
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-xl ${link.bgColor} transition-transform group-hover:scale-110`}
                      >
                        <link.icon className={`h-5 w-5 ${link.iconColor}`} />
                      </div>
                      <span className="text-xs font-medium leading-tight text-gray-700 group-hover:text-gray-900">
                        {link.label}
                      </span>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="members">
          <div className="space-y-4 pt-4">
            <Card>
              <CardBody>
                <h3 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
                  <UserPlus className="h-4 w-4" /> เพิ่มสมาชิก
                </h3>
                <div className="flex gap-2">
                  <Select
                    options={[
                      { value: '', label: 'เลือกผู้ใช้งาน' },
                      ...allUsers
                        .filter((u) => !project.members?.some((m) => m.user.id === u.id))
                        .map((u) => ({ value: String(u.id), label: `${u.name} (${u.email})` })),
                    ]}
                    value={addUserId}
                    onChange={(e) => setAddUserId(e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="ตำแหน่ง / บทบาท"
                    value={addRoleName}
                    onChange={(e) => setAddRoleName(e.target.value)}
                    className="w-40"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    icon={UserPlus}
                    onClick={handleAddMember}
                    loading={addMember.isPending}
                  >
                    เพิ่ม
                  </Button>
                </div>
              </CardBody>
            </Card>

            {project.members && project.members.length > 0 ? (
              <Card>
                <CardBody>
                  <ul className="space-y-3">
                    {project.members.map((m) => (
                      <li key={m.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
                            {m.user.name.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{m.user.name}</p>
                            <p className="text-xs text-gray-500">{m.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {m.roleName && <Badge variant="outline">{m.roleName}</Badge>}
                          <Button variant="ghost" size="sm" onClick={() => setRemoveMemberId(m.id)}>
                            <X className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">ยังไม่มีสมาชิกในโครงการ</p>
            )}
          </div>
        </TabPanel>

        <TabPanel value="files">
          <div className="pt-4">
            <FilesContent projectId={id} />
          </div>
        </TabPanel>
      </Tabs>

      {/* File List Modal */}
      {fileModalCategory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          onClick={() => setFileModalCategory(null)}
        >
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="relative z-10 flex max-h-[85vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex shrink-0 items-center justify-between border-b px-5 py-4">
              <div className="flex items-center gap-2">
                {fileModalCategory === 'PLAN' ? (
                  <FileScan className="h-5 w-5 text-primary-500" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-primary-500" />
                )}
                <h2 className="font-semibold text-gray-900">{fileModalTitle}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {fileModalFiles.length} ไฟล์
                </span>
              </div>
              <button
                onClick={() => setFileModalCategory(null)}
                className="rounded-lg p-1.5 hover:bg-gray-100"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal body */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {fileModalFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Paperclip className="mb-3 h-12 w-12 text-gray-200" />
                  <p className="text-sm text-gray-400">ยังไม่มีไฟล์ในหมวดนี้</p>
                  <p className="mt-1 text-xs text-gray-300">เพิ่มได้เมื่อแก้ไขโครงการ</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {fileModalFiles.map((f) => {
                    const isImage = IMAGE_MIME.includes(f.mimeType ?? '')
                    return (
                      <li key={f.id} className="flex items-center gap-3 px-5 py-3">
                        {/* Thumbnail หรือ icon */}
                        {isImage ? (
                          <button
                            onClick={() => setLightboxUrl(f.url)}
                            className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100"
                          >
                            <img
                              src={f.url}
                              alt={f.originalName}
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/30">
                              <Eye className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                            </div>
                          </button>
                        ) : (
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                        )}

                        {/* ชื่อไฟล์ + ขนาด */}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {f.originalName}
                          </p>
                          <p className="mt-0.5 text-xs text-gray-500">
                            {f.mimeType?.split('/')[1]?.toUpperCase() ?? 'FILE'} ·{' '}
                            {formatFileSize(f.size)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 gap-1">
                          {isImage ? (
                            <button
                              onClick={() => setLightboxUrl(f.url)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                              title="ดูภาพ"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          ) : (
                            <a
                              href={f.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary-300 hover:bg-primary-50 hover:text-primary-600"
                              title="เปิดไฟล์"
                            >
                              <Eye className="h-4 w-4" />
                            </a>
                          )}
                          <button
                            onClick={() => downloadFile(f.url, f.originalName)}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-green-300 hover:bg-green-50 hover:text-green-600"
                            title="ดาวน์โหลด"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Modals */}
      <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} project={project} />
      <ConfirmModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title={`ลบโครงการ "${project.name}"`}
        description="ข้อมูลโครงการและข้อมูลทั้งหมดจะถูกซ่อน"
        confirmLabel="ลบ"
        danger
        loading={deleteMutation.isPending}
      />
      <ConfirmModal
        open={!!removeMemberId}
        onClose={() => setRemoveMemberId(null)}
        onConfirm={handleRemoveMember}
        title="ลบสมาชิกออกจากโครงการ"
        description="สมาชิกจะไม่มีสิทธิ์เข้าถึงโครงการนี้อีกต่อไป"
        confirmLabel="ลบออก"
        danger
        loading={removeMember.isPending}
      />
    </div>
  )
}
