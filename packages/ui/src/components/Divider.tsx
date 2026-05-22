import { cn } from '../lib/utils'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  label?: string
  className?: string
}

export function Divider({ orientation = 'horizontal', label, className }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('w-px self-stretch bg-gray-200', className)} aria-hidden />
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)} role="separator">
        <div className="flex-1 border-t border-gray-200" />
        <span className="shrink-0 text-xs text-gray-400">{label}</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
    )
  }

  return <hr className={cn('border-t border-gray-200', className)} role="separator" />
}
