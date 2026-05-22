import { CustomerType, LeadStatus } from './enums'
import { SoftDeleteEntity, SearchQuery } from './common.types'

export interface Customer extends SoftDeleteEntity {
  type: CustomerType
  name: string
  companyName: string | null
  email: string | null
  phone: string | null
  lineId: string | null
  address: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postcode: string | null
  note: string | null
  leadStatus: LeadStatus
}

export interface CustomerSummary {
  id: number
  type: CustomerType
  name: string
  companyName: string | null
  phone: string | null
  email: string | null
  leadStatus: LeadStatus
}

export interface CreateCustomerDto {
  type?: CustomerType
  name: string
  companyName?: string
  email?: string
  phone?: string
  lineId?: string
  address?: string
  province?: string
  district?: string
  subdistrict?: string
  postcode?: string
  note?: string
  leadStatus?: LeadStatus
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}

export interface CustomerFilterQuery extends SearchQuery {
  type?: CustomerType
  leadStatus?: LeadStatus
  province?: string
}

// ─── Lead Status Labels (Thai) ────────────────────────────────────────────────

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  [LeadStatus.INTERESTED]: 'สนใจ',
  [LeadStatus.SITE_VISIT]: 'นัดสำรวจ',
  [LeadStatus.QUOTED]: 'เสนอราคาแล้ว',
  [LeadStatus.CLOSED_WON]: 'ปิดการขายสำเร็จ',
  [LeadStatus.CLOSED_LOST]: 'ไม่สนใจ',
}
