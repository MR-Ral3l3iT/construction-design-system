import { type LucideIcon, ChevronRight, Home } from 'lucide-react'
import { cn } from '../lib/utils'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: LucideIcon
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
  showHome?: boolean
  onNavigate?: (href: string) => void
  className?: string
}

export function Breadcrumb({ items, showHome = false, onNavigate, className }: BreadcrumbProps) {
  const all: BreadcrumbItem[] = showHome
    ? [{ label: 'หน้าแรก', href: '/', icon: Home }, ...items]
    : items

  return (
    <nav aria-label="breadcrumb" className={cn('flex items-center', className)}>
      <ol className="flex flex-wrap items-center gap-1 text-sm">
        {all.map((item, i) => {
          const isLast = i === all.length - 1
          return (
            <li key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" aria-hidden />}
              {isLast ? (
                <span className="flex items-center gap-1 font-medium text-gray-900">
                  {item.icon && <item.icon className="h-3.5 w-3.5" aria-hidden />}
                  {item.label}
                </span>
              ) : (
                <button
                  onClick={() => item.href && onNavigate?.(item.href)}
                  className="flex items-center gap-1 text-gray-500 hover:text-primary-600 transition-colors"
                >
                  {item.icon && <item.icon className="h-3.5 w-3.5" aria-hidden />}
                  {item.label}
                </button>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
