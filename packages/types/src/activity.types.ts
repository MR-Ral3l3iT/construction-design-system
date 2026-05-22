import { CommentTargetType, ApprovalStatus } from './enums'
import { BaseEntity } from './common.types'
import { UserSummary } from './auth.types'

// ─── Comment ──────────────────────────────────────────────────────────────────

export interface Comment extends BaseEntity {
  projectId: number | null
  userId: number
  user?: UserSummary
  targetType: CommentTargetType
  targetId: number
  message: string
  deletedAt: string | null
}

export interface CreateCommentDto {
  targetType: CommentTargetType
  targetId: number
  projectId?: number
  message: string
}

// ─── Approval ─────────────────────────────────────────────────────────────────

export interface Approval extends BaseEntity {
  projectId: number | null
  userId: number
  user?: UserSummary
  status: ApprovalStatus
  note: string | null
  designTaskId: number | null
  boqId: number | null
  changeRequestId: number | null
  approvedAt: string | null
}

export interface CreateApprovalDto {
  designTaskId?: number
  boqId?: number
  changeRequestId?: number
  projectId?: number
  note?: string
}

export interface ProcessApprovalDto {
  status: ApprovalStatus.APPROVED | ApprovalStatus.REJECTED
  note?: string
}

export const APPROVAL_STATUS_LABEL: Record<ApprovalStatus, string> = {
  [ApprovalStatus.PENDING]: 'รออนุมัติ',
  [ApprovalStatus.APPROVED]: 'อนุมัติแล้ว',
  [ApprovalStatus.REJECTED]: 'ไม่อนุมัติ',
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: number
  userId: number | null
  action: string
  module: string
  refId: number | null
  description: string | null
  createdAt: string
}
