import { cn } from '../lib/utils'

export interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export interface CardBodyProps {
  children: React.ReactNode
  className?: string
}

export interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

const paddingStyles = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6',
}

export function Card({ children, className, padding = 'md' }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl bg-white shadow-sm ring-1 ring-black/5',
        paddingStyles[padding],
        className,
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return <div className={cn('mb-4 flex items-center justify-between', className)}>{children}</div>
}

export function CardBody({ children, className }: CardBodyProps) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        'mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
