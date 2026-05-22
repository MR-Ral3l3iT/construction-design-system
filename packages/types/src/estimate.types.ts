import { EstimateStatus } from './enums'
import { BaseEntity, SearchQuery } from './common.types'

export interface EstimateItem extends BaseEntity {
  estimateId: number
  name: string
  description: string | null
  quantity: number
  unit: string | null
  unitPrice: number
  totalPrice: number
  sortOrder: number
}

export interface Estimate extends BaseEntity {
  projectId: number
  code: string
  title: string
  description: string | null
  status: EstimateStatus
  totalAmount: number
  items?: EstimateItem[]
}

export interface CreateEstimateDto {
  projectId: number
  title: string
  description?: string
  items?: CreateEstimateItemDto[]
}

export interface CreateEstimateItemDto {
  name: string
  description?: string
  quantity?: number
  unit?: string
  unitPrice?: number
  sortOrder?: number
}

export interface UpdateEstimateDto extends Partial<Omit<CreateEstimateDto, 'projectId'>> {
  status?: EstimateStatus
}

export interface EstimateFilterQuery extends SearchQuery {
  projectId?: number
  status?: EstimateStatus
}

export const ESTIMATE_STATUS_LABEL: Record<EstimateStatus, string> = {
  [EstimateStatus.DRAFT]: 'ร่าง',
  [EstimateStatus.SENT]: 'ส่งแล้ว',
  [EstimateStatus.APPROVED]: 'อนุมัติแล้ว',
  [EstimateStatus.REJECTED]: 'ไม่ผ่าน',
}
