import { ProjectType, ProjectStatus } from './enums'
import { SoftDeleteEntity, BaseEntity, SearchQuery } from './common.types'
import { CustomerSummary } from './customer.types'
import { UserSummary } from './auth.types'

export interface Project extends SoftDeleteEntity {
  code: string
  name: string
  type: ProjectType
  status: ProjectStatus
  customerId: number
  customer?: CustomerSummary
  location: string | null
  description: string | null
  budgetMin: number | null
  budgetMax: number | null
  startDate: string | null
  endDate: string | null
  progress: number
  members?: ProjectMember[]
}

export interface ProjectSummary {
  id: number
  code: string
  name: string
  type: ProjectType
  status: ProjectStatus
  progress: number
  customer?: CustomerSummary
  startDate: string | null
  endDate: string | null
}

export interface ProjectMember extends BaseEntity {
  projectId: number
  userId: number
  roleName: string | null
  user?: UserSummary
}

export interface CreateProjectDto {
  name: string
  type: ProjectType
  customerId: number
  location?: string
  description?: string
  budgetMin?: number
  budgetMax?: number
  startDate?: string
  endDate?: string
}

export interface UpdateProjectDto extends Partial<CreateProjectDto> {
  status?: ProjectStatus
  progress?: number
}

export interface ProjectFilterQuery extends SearchQuery {
  type?: ProjectType
  status?: ProjectStatus
  customerId?: number
}

// ─── Status & Type Labels (Thai) ──────────────────────────────────────────────

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  [ProjectStatus.LEAD]: 'Lead',
  [ProjectStatus.ESTIMATING]: 'ประเมินราคา',
  [ProjectStatus.DESIGNING]: 'ออกแบบ',
  [ProjectStatus.WAITING_APPROVAL]: 'รออนุมัติ',
  [ProjectStatus.BOQ]: 'BOQ',
  [ProjectStatus.CONTRACT]: 'ทำสัญญา',
  [ProjectStatus.CONSTRUCTION]: 'ก่อสร้าง',
  [ProjectStatus.HANDOVER]: 'ส่งมอบงาน',
  [ProjectStatus.COMPLETED]: 'เสร็จสมบูรณ์',
  [ProjectStatus.CANCELLED]: 'ยกเลิก',
}

export const PROJECT_TYPE_LABEL: Record<ProjectType, string> = {
  [ProjectType.DESIGN_ONLY]: 'ออกแบบอย่างเดียว',
  [ProjectType.TURNKEY]: 'ออกแบบ + ก่อสร้าง (Turn Key)',
}
