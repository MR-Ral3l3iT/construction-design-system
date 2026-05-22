import { cn } from '../lib/utils'

export interface SkeletonProps {
  className?: string
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  lines = 1,
}: SkeletonProps) {
  const base = 'animate-pulse bg-gray-200'

  if (variant === 'text' && lines > 1) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(base, 'h-4 rounded', i === lines - 1 && 'w-3/4', className)}
            style={{ width: i === lines - 1 ? undefined : width, height: height ?? undefined }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        base,
        variant === 'text' && 'h-4 rounded',
        variant === 'circular' && 'rounded-full',
        variant === 'rectangular' && 'rounded-lg',
        className,
      )}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
    />
  )
}

export interface SkeletonCardProps {
  rows?: number
  className?: string
}

export function SkeletonCard({ rows = 3, className }: SkeletonCardProps) {
  return (
    <div className={cn('rounded-xl bg-white p-5 ring-1 ring-gray-200', className)}>
      <div className="mb-4 flex items-center gap-3">
        <Skeleton variant="circular" width={36} height={36} />
        <div className="flex-1">
          <Skeleton variant="text" className="mb-1.5 h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton variant="text" lines={rows} />
    </div>
  )
}

export interface SkeletonTableProps {
  rows?: number
  cols?: number
  className?: string
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonTableProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl ring-1 ring-gray-200', className)}>
      <div className="bg-gray-50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      </div>
      <div className="divide-y divide-gray-100 bg-white">
        {Array.from({ length: rows }).map((_, ri) => (
          <div key={ri} className="flex gap-4 px-4 py-3">
            {Array.from({ length: cols }).map((_, ci) => (
              <Skeleton key={ci} className={cn('h-4 flex-1', ci === 0 && 'w-8 flex-none')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
