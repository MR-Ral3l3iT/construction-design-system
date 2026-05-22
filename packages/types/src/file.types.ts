import { FileCategory } from './enums'
import { BaseEntity } from './common.types'

export interface FileAsset extends BaseEntity {
  projectId: number | null
  uploadedById: number | null
  estimateId: number | null
  designTaskId: number | null
  boqId: number | null
  contractId: number | null
  paymentId: number | null
  dailyUpdateId: number | null
  issueId: number | null
  changeRequestId: number | null
  category: FileCategory
  filename: string
  originalName: string
  mimeType: string | null
  size: number | null
  storageKey: string
  url: string | null
  deletedAt: string | null
}

export interface FileAssetSummary {
  id: number
  filename: string
  originalName: string
  mimeType: string | null
  size: number | null
  url: string | null
  category: FileCategory
  createdAt: string
}

export interface UploadFileDto {
  projectId?: number
  category?: FileCategory
  estimateId?: number
  designTaskId?: number
  boqId?: number
  contractId?: number
  paymentId?: number
  dailyUpdateId?: number
  issueId?: number
  changeRequestId?: number
}

export const FILE_CATEGORY_LABEL: Record<FileCategory, string> = {
  [FileCategory.DESIGN]: 'แบบออกแบบ',
  [FileCategory.BOQ]: 'BOQ',
  [FileCategory.CONTRACT]: 'สัญญา',
  [FileCategory.DAILY_UPDATE]: 'อัปเดตรายวัน',
  [FileCategory.ISSUE]: 'ปัญหา',
  [FileCategory.PAYMENT]: 'การชำระเงิน',
  [FileCategory.HANDOVER]: 'ส่งมอบงาน',
  [FileCategory.OTHER]: 'อื่นๆ',
}
