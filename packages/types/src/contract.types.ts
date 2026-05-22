import { ContractStatus, PaymentStatus } from './enums'
import { SoftDeleteEntity, SearchQuery } from './common.types'

export interface Contract extends SoftDeleteEntity {
  projectId: number
  code: string
  title: string
  status: ContractStatus
  contractDate: string | null
  startDate: string | null
  endDate: string | null
  totalAmount: number
}

export interface PaymentMilestone extends SoftDeleteEntity {
  projectId: number
  title: string
  description: string | null
  amount: number
  dueDate: string | null
  paidDate: string | null
  status: PaymentStatus
  sortOrder: number
}

export interface CreateContractDto {
  projectId: number
  title: string
  contractDate?: string
  startDate?: string
  endDate?: string
  totalAmount?: number
}

export interface UpdateContractDto extends Partial<Omit<CreateContractDto, 'projectId'>> {
  status?: ContractStatus
}

export interface CreatePaymentMilestoneDto {
  projectId: number
  title: string
  description?: string
  amount: number
  dueDate?: string
  sortOrder?: number
}

export interface UpdatePaymentMilestoneDto extends Partial<
  Omit<CreatePaymentMilestoneDto, 'projectId'>
> {
  status?: PaymentStatus
  paidDate?: string
}

export interface ContractFilterQuery extends SearchQuery {
  projectId?: number
  status?: ContractStatus
}

export interface PaymentFilterQuery extends SearchQuery {
  projectId?: number
  status?: PaymentStatus
}

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'ร่าง',
  [ContractStatus.ACTIVE]: 'มีผลบังคับใช้',
  [ContractStatus.COMPLETED]: 'เสร็จสิ้น',
  [ContractStatus.CANCELLED]: 'ยกเลิก',
}

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  [PaymentStatus.UNPAID]: 'ยังไม่ชำระ',
  [PaymentStatus.PARTIAL]: 'ชำระบางส่วน',
  [PaymentStatus.PAID]: 'ชำระแล้ว',
  [PaymentStatus.OVERDUE]: 'เกินกำหนด',
}
