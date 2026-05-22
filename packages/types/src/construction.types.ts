import { ConstructionTaskStatus, DailyUpdateStatus } from './enums'
import { SoftDeleteEntity, BaseEntity, SearchQuery } from './common.types'
import { UserSummary } from './auth.types'

export interface ConstructionTask extends SoftDeleteEntity {
  planId: number
  title: string
  description: string | null
  status: ConstructionTaskStatus
  startDate: string | null
  endDate: string | null
  progress: number
  sortOrder: number
}

export interface ConstructionPlan extends SoftDeleteEntity {
  projectId: number
  title: string
  description: string | null
  startDate: string | null
  endDate: string | null
  tasks?: ConstructionTask[]
}

export interface DailyUpdate extends SoftDeleteEntity {
  projectId: number
  createdById: number
  createdBy?: UserSummary
  updateDate: string
  title: string | null
  workDone: string
  nextPlan: string | null
  problem: string | null
  progress: number
  status: DailyUpdateStatus
}

export interface CreateConstructionPlanDto {
  projectId: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
}

export interface CreateConstructionTaskDto {
  planId: number
  title: string
  description?: string
  startDate?: string
  endDate?: string
  sortOrder?: number
}

export interface UpdateConstructionTaskDto extends Partial<
  Omit<CreateConstructionTaskDto, 'planId'>
> {
  status?: ConstructionTaskStatus
  progress?: number
}

export interface CreateDailyUpdateDto {
  projectId: number
  updateDate: string
  title?: string
  workDone: string
  nextPlan?: string
  problem?: string
  progress?: number
}

export interface UpdateDailyUpdateDto extends Partial<Omit<CreateDailyUpdateDto, 'projectId'>> {
  status?: DailyUpdateStatus
}

export interface DailyUpdateFilterQuery extends SearchQuery {
  projectId?: number
  status?: DailyUpdateStatus
  dateFrom?: string
  dateTo?: string
}

export const CONSTRUCTION_TASK_STATUS_LABEL: Record<ConstructionTaskStatus, string> = {
  [ConstructionTaskStatus.TODO]: 'รอเริ่ม',
  [ConstructionTaskStatus.IN_PROGRESS]: 'กำลังทำ',
  [ConstructionTaskStatus.BLOCKED]: 'ติดปัญหา',
  [ConstructionTaskStatus.COMPLETED]: 'เสร็จแล้ว',
}
