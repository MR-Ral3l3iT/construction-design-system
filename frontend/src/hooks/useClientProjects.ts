import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { clientApi } from '@/lib/clientApi'

export interface ClientProject {
  id: number
  code: string
  name: string
  type: string
  status: string
  progress: number
  startDate: string | null
  endDate: string | null
  addressLine: string | null
  province: string | null
  district: string | null
  subdistrict: string | null
  postcode: string | null
}

export interface ClientProjectDetail extends ClientProject {
  description: string | null
  budgetMin: number | null
  budgetMax: number | null
  areaSize: number | null
  designStartDate: string | null
  designEndDate: string | null
  customer: { id: number; name: string; companyName: string | null } | null
  members: { roleName: string | null; user: { id: number; name: string; phone: string | null } }[]
}

export interface ClientDailyUpdate {
  id: number
  updateDate: string
  title: string | null
  workDone: string
  nextPlan: string | null
  problem: string | null
  progress: number
  createdAt: string
  createdBy: { id: number; name: string }
}

export interface ClientFile {
  id: number
  originalName: string
  storageKey: string
  mimeType: string | null
  size: number | null
  category: string
  createdAt: string
  uploadedBy: { id: number; name: string } | null
}

export interface ClientPaymentQuotation {
  id: number
  code: string
  title: string
  boqId: number | null
  totalAmount: string
}

export interface ClientPayment {
  id: number
  title: string
  description: string | null
  amount: string
  dueDate: string | null
  paidDate: string | null
  status: string
  sortOrder: number
  createdAt: string
  quotation: ClientPaymentQuotation | null
  estimate: { id: number; code: string; title: string } | null
}

export interface ClientReportImage {
  id: number
  imageUrl: string
  storageKey: string | null
  caption: string | null
  imageType: string
  sortOrder: number
}

export interface ClientReportItem {
  id: number
  description: string
  progress: number
  unit: string | null
  quantity: string | null
  status: string
  sortOrder: number
  category: { id: number; name: string; color: string | null }
  images: ClientReportImage[]
}

export interface ClientLatestReport {
  id: number
  reportDate: string
  overallProgress: number
  weather: string | null
  nextPlan: string | null
  publishedAt: string | null
  createdBy: { id: number; name: string }
  items: ClientReportItem[]
}

export interface ClientApprovals {
  designTasks: {
    id: number
    title: string
    status: string
    revisionNo: number
    updatedAt: string
  }[]
  boq: {
    id: number
    code: string
    version: number
    status: string
    totalAmount: string
    updatedAt: string
  }[]
  changeRequests: {
    id: number
    title: string
    status: string
    estimatedAmount: string | null
    approvedAmount: string | null
    updatedAt: string
  }[]
}

export function useClientProjects() {
  return useQuery<ClientProject[]>({
    queryKey: ['client-projects'],
    queryFn: async () => {
      const { data } = await clientApi.get('/client/projects')
      return data?.data ?? data
    },
  })
}

export function useClientProject(id: number) {
  return useQuery<ClientProjectDetail>({
    queryKey: ['client-project', id],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${id}`)
      return data?.data ?? data
    },
    enabled: !!id,
  })
}

export function useClientDailyUpdates(projectId: number) {
  return useQuery<ClientDailyUpdate[]>({
    queryKey: ['client-daily-updates', projectId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/daily-updates`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}

export function useClientFiles(projectId: number) {
  return useQuery<ClientFile[]>({
    queryKey: ['client-files', projectId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/files`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}

export function useClientPayments(projectId: number) {
  return useQuery<ClientPayment[]>({
    queryKey: ['client-payments', projectId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/payments`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}

export interface ClientReportListItem {
  id: number
  reportDate: string
  overallProgress: number
  weather: string | null
  nextPlan: string | null
  issueSummary: string | null
  publishedAt: string | null
  createdBy: { id: number; name: string } | null
  items: {
    id: number
    description: string
    progress: number
    status: string
    category: { id: number; name: string; color: string | null }
  }[]
  _count: { items: number }
}

export interface ClientReportListMeta {
  page: number
  limit: number
  total: number
  hasMore: boolean
}

export function useClientReportsList(
  projectId: number,
  filters: { dateFrom?: string; dateTo?: string },
) {
  return useInfiniteQuery<{ data: ClientReportListItem[]; meta: ClientReportListMeta }>({
    queryKey: ['client-reports-list', projectId, filters],
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ page: String(pageParam), limit: '10' })
      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters.dateTo) params.set('dateTo', filters.dateTo)
      const { data } = await clientApi.get(`/client/projects/${projectId}/reports?${params}`)
      return data?.data ?? data
    },
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.hasMore ? last.meta.page + 1 : undefined),
    enabled: !!projectId,
  })
}

export interface ClientReportDetail {
  id: number
  reportDate: string
  overallProgress: number
  weather: string | null
  nextPlan: string | null
  issueSummary: string | null
  publishedAt: string | null
  createdBy: { id: number; name: string }
  items: ClientReportItem[]
}

export function useClientReport(projectId: number, reportId: number) {
  return useQuery<ClientReportDetail | null>({
    queryKey: ['client-report', projectId, reportId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/reports/${reportId}`)
      return data?.data ?? data
    },
    enabled: !!projectId && !!reportId,
  })
}

export function useClientLatestReport(projectId: number) {
  return useQuery<ClientLatestReport | null>({
    queryKey: ['client-latest-report', projectId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/latest-report`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}

export function useClientApprovals(projectId: number) {
  return useQuery<ClientApprovals>({
    queryKey: ['client-approvals', projectId],
    queryFn: async () => {
      const { data } = await clientApi.get(`/client/projects/${projectId}/approvals`)
      return data?.data ?? data
    },
    enabled: !!projectId,
  })
}
