'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ClipboardList, ArrowLeft, Layers, Package, Wrench, DollarSign } from 'lucide-react'
import { PageHeader, Button } from '@construction/ui'
import { ProjectPickerPanel } from '@/components/shared/ProjectPickerPanel'
import { useBOQProjectSummaries } from '@/hooks/useBOQ'
import { BOQContent } from './BOQContent'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

function BOQProjectExtra({
  projectId,
  summaryMap,
}: {
  projectId: number
  summaryMap: Map<
    number,
    {
      boqCount: number
      categoryCount: number
      totalAmount: number
      materialCost: number
      laborCost: number
    }
  >
}) {
  const s = summaryMap.get(projectId)
  if (!s) return null

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-primary-100 bg-primary-50/60 px-3 py-1.5">
      <span className="flex items-center gap-1 text-xs text-primary-700">
        <Layers className="h-3 w-3" />
        {s.boqCount} BOQ · {s.categoryCount} หมวด
      </span>
      <span className="flex items-center gap-1 text-xs font-medium text-gray-700">
        <DollarSign className="h-3 w-3 text-primary-500" />
        {formatCurrency(s.totalAmount)}
      </span>
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Package className="h-3 w-3" />
        วัสดุ {formatCurrency(s.materialCost)}
      </span>
      <span className="flex items-center gap-1 text-xs text-gray-500">
        <Wrench className="h-3 w-3" />
        แรง {formatCurrency(s.laborCost)}
      </span>
    </div>
  )
}

function BOQPageInner() {
  const params = useSearchParams()
  const projectId = parseInt(params.get('projectId') ?? '0', 10)
  const { data: summaries } = useBOQProjectSummaries()

  const summaryMap = new Map((summaries ?? []).map((s) => [s.projectId, s]))

  return (
    <div>
      <PageHeader
        icon={ClipboardList}
        title="BOQ"
        subtitle="Bill of Quantities — รายการวัสดุและค่าแรง"
        actions={
          projectId > 0 ? (
            <Link href="/admin/boq">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                ย้อนกลับ
              </Button>
            </Link>
          ) : undefined
        }
      />
      {projectId > 0 ? (
        <>
          <div className="mb-4 flex items-center gap-1 text-sm text-gray-500">
            <Link href="/admin/projects" className="hover:text-primary-600">
              โครงการ
            </Link>
            <span>/</span>
            <Link href={`/admin/projects/${projectId}`} className="hover:text-primary-600">
              รายละเอียด
            </Link>
            <span>/</span>
            <span>BOQ</span>
          </div>
          <BOQContent projectId={projectId} />
        </>
      ) : (
        <ProjectPickerPanel
          title="เลือกโครงการ — BOQ"
          renderExtra={(pid) => <BOQProjectExtra projectId={pid} summaryMap={summaryMap} />}
        />
      )}
    </div>
  )
}

export default function BOQPage() {
  return (
    <Suspense>
      <BOQPageInner />
    </Suspense>
  )
}
