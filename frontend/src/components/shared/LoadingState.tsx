import { SkeletonTable, SkeletonCard } from '@construction/ui'

interface LoadingStateProps {
  variant?: 'table' | 'card'
  rows?: number
}

export function LoadingState({ variant = 'table', rows = 5 }: LoadingStateProps) {
  if (variant === 'card') return <SkeletonCard />
  return <SkeletonTable rows={rows} />
}
