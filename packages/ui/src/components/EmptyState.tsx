import { type LucideIcon, Inbox } from 'lucide-react'
import { cn } from '../lib/utils'

export interface EmptyStateProps {
  icon?: LucideIcon
  title?: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'ไม่พบข้อมูล',
  description,
  action,
  compact = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 gap-2' : 'py-16 gap-3',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-100',
          compact ? 'h-10 w-10' : 'h-14 w-14',
        )}
      >
        <Icon className={cn(compact ? 'h-5 w-5' : 'h-7 w-7', 'text-gray-400')} aria-hidden />
      </div>
      <div>
        <p className={cn('font-medium text-gray-700', compact ? 'text-sm' : 'text-base')}>
          {title}
        </p>
        {description && (
          <p className={cn('mt-0.5 text-gray-400', compact ? 'text-xs' : 'text-sm')}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
