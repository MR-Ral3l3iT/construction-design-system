import { IssueStatus, IssuePriority, ChangeRequestStatus } from './enums'
import { SoftDeleteEntity, SearchQuery } from './common.types'

export interface Issue extends SoftDeleteEntity {
  projectId: number
  title: string
  description: string | null
  status: IssueStatus
  priority: IssuePriority
  dueDate: string | null
  resolvedAt: string | null
}

export interface ChangeRequest extends SoftDeleteEntity {
  projectId: number
  title: string
  description: string | null
  reason: string | null
  status: ChangeRequestStatus
  estimatedAmount: number | null
  approvedAmount: number | null
  approvedAt: string | null
}

export interface CreateIssueDto {
  projectId: number
  title: string
  description?: string
  priority?: IssuePriority
  dueDate?: string
}

export interface UpdateIssueDto extends Partial<Omit<CreateIssueDto, 'projectId'>> {
  status?: IssueStatus
  resolvedAt?: string
}

export interface CreateChangeRequestDto {
  projectId: number
  title: string
  description?: string
  reason?: string
  estimatedAmount?: number
}

export interface UpdateChangeRequestDto extends Partial<Omit<CreateChangeRequestDto, 'projectId'>> {
  status?: ChangeRequestStatus
  approvedAmount?: number
  approvedAt?: string
}

export interface IssueFilterQuery extends SearchQuery {
  projectId?: number
  status?: IssueStatus
  priority?: IssuePriority
}

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  [IssueStatus.OPEN]: 'เปิด',
  [IssueStatus.IN_PROGRESS]: 'กำลังแก้ไข',
  [IssueStatus.RESOLVED]: 'แก้ไขแล้ว',
  [IssueStatus.CLOSED]: 'ปิด',
}

export const ISSUE_PRIORITY_LABEL: Record<IssuePriority, string> = {
  [IssuePriority.LOW]: 'ต่ำ',
  [IssuePriority.MEDIUM]: 'ปานกลาง',
  [IssuePriority.HIGH]: 'สูง',
  [IssuePriority.URGENT]: 'เร่งด่วน',
}

export const CHANGE_REQUEST_STATUS_LABEL: Record<ChangeRequestStatus, string> = {
  [ChangeRequestStatus.REQUESTED]: 'ร้องขอ',
  [ChangeRequestStatus.ESTIMATING]: 'ประเมินราคา',
  [ChangeRequestStatus.WAITING_APPROVAL]: 'รออนุมัติ',
  [ChangeRequestStatus.APPROVED]: 'อนุมัติแล้ว',
  [ChangeRequestStatus.REJECTED]: 'ไม่ผ่าน',
  [ChangeRequestStatus.COMPLETED]: 'เสร็จสิ้น',
}
