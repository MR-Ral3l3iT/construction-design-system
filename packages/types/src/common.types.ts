// ─── API Response Wrappers ────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data: T
  message?: string
  timestamp?: string
}

export interface ApiErrorResponse {
  success: false
  statusCode: number
  message: string | string[]
  error?: string
  timestamp: string
  path?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ─── Common Query Params ──────────────────────────────────────────────────────

export interface PaginationQuery {
  page?: number
  pageSize?: number
}

export interface SortQuery {
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface SearchQuery extends PaginationQuery, SortQuery {
  search?: string
}

// ─── Common Entity Fields ─────────────────────────────────────────────────────

export interface BaseEntity {
  id: number
  createdAt: string
  updatedAt: string
}

export interface SoftDeleteEntity extends BaseEntity {
  deletedAt: string | null
}

// ─── Select Option (for dropdowns) ───────────────────────────────────────────

export interface SelectOption<T = string> {
  value: T
  label: string
  disabled?: boolean
  description?: string
}

// ─── Upload Result ────────────────────────────────────────────────────────────

export interface UploadResult {
  filename: string
  originalName: string
  mimeType: string
  size: number
  storageKey: string
  url: string
}
