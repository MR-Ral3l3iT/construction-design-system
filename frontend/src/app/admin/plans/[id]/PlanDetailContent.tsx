'use client'

import { useProjectPlan } from '@/hooks/useProjectPlans'
import { LoadingState } from '@/components/shared/LoadingState'
import { PlansContent } from '../PlansContent'

interface Props {
  planId: number
}

export function PlanDetailContent({ planId }: Props) {
  const { data: plan, isLoading } = useProjectPlan(planId)

  if (isLoading) return <LoadingState />
  if (!plan) return <p className="text-sm text-gray-500">ไม่พบแผนงาน</p>

  return <PlansContent projectId={plan.project.id} />
}
