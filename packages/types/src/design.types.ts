import { DesignTaskStatus } from './enums'
import { BaseEntity, SearchQuery } from './common.types'

export interface DesignTask extends BaseEntity {
  projectId: number
  title: string
  description: string | null
  status: DesignTaskStatus
  revisionNo: number
  startDate: string | null
  dueDate: string | null
  approvedAt: string | null
}

export interface CreateDesignTaskDto {
  projectId: number
  title: string
  description?: string
  startDate?: string
  dueDate?: string
}

export interface UpdateDesignTaskDto extends Partial<Omit<CreateDesignTaskDto, 'projectId'>> {
  status?: DesignTaskStatus
}

export interface DesignTaskFilterQuery extends SearchQuery {
  projectId?: number
  status?: DesignTaskStatus
}

export const DESIGN_TASK_STATUS_LABEL: Record<DesignTaskStatus, string> = {
  [DesignTaskStatus.TODO]: 'รอดำเนินการ',
  [DesignTaskStatus.IN_PROGRESS]: 'กำลังทำ',
  [DesignTaskStatus.WAITING_REVIEW]: 'รอตรวจสอบ',
  [DesignTaskStatus.REVISION]: 'แก้ไข',
  [DesignTaskStatus.APPROVED]: 'อนุมัติแล้ว',
  [DesignTaskStatus.CANCELLED]: 'ยกเลิก',
}
