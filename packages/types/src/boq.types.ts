import { BOQStatus } from './enums'
import { BaseEntity, SoftDeleteEntity, SearchQuery } from './common.types'

export interface BOQItem extends BaseEntity {
  categoryId: number
  name: string
  description: string | null
  quantity: number
  unit: string | null
  materialPrice: number
  laborPrice: number
  totalPrice: number
  sortOrder: number
}

export interface BOQCategory extends BaseEntity {
  boqId: number
  name: string
  sortOrder: number
  items?: BOQItem[]
}

export interface BOQ extends SoftDeleteEntity {
  projectId: number
  code: string
  title: string
  status: BOQStatus
  version: number
  isLocked: boolean
  materialCost: number
  laborCost: number
  overheadCost: number
  profit: number
  totalAmount: number
  categories?: BOQCategory[]
}

export interface CreateBOQDto {
  projectId: number
  title: string
  categories?: CreateBOQCategoryDto[]
}

export interface CreateBOQCategoryDto {
  name: string
  sortOrder?: number
  items?: CreateBOQItemDto[]
}

export interface CreateBOQItemDto {
  name: string
  description?: string
  quantity?: number
  unit?: string
  materialPrice?: number
  laborPrice?: number
  sortOrder?: number
}

export interface UpdateBOQDto extends Partial<Omit<CreateBOQDto, 'projectId'>> {
  status?: BOQStatus
  overheadCost?: number
  profit?: number
}

export interface BOQFilterQuery extends SearchQuery {
  projectId?: number
  status?: BOQStatus
}

export const BOQ_STATUS_LABEL: Record<BOQStatus, string> = {
  [BOQStatus.DRAFT]: 'ร่าง',
  [BOQStatus.REVIEW]: 'รอตรวจสอบ',
  [BOQStatus.APPROVED]: 'อนุมัติแล้ว',
  [BOQStatus.LOCKED]: 'ล็อกราคาแล้ว',
}
