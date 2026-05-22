import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { cn } from '../lib/utils'

export interface PaginationProps {
  page: number
  totalPages: number
  totalItems?: number
  pageSize?: number
  siblingCount?: number
  showFirstLast?: boolean
  showPageSize?: boolean
  pageSizeOptions?: number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  className?: string
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function buildPages(page: number, total: number, siblings: number): (number | '...')[] {
  const totalNumbers = siblings * 2 + 5
  if (total <= totalNumbers) return range(1, total)

  const leftSibling = Math.max(page - siblings, 1)
  const rightSibling = Math.min(page + siblings, total)
  const showLeft = leftSibling > 2
  const showRight = rightSibling < total - 1

  if (!showLeft && showRight) {
    return [...range(1, 3 + siblings * 2), '...', total]
  }
  if (showLeft && !showRight) {
    return [1, '...', ...range(total - (3 + siblings * 2) + 1, total)]
  }
  return [1, '...', ...range(leftSibling, rightSibling), '...', total]
}

export function Pagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  siblingCount = 1,
  showFirstLast = true,
  showPageSize = false,
  pageSizeOptions = [10, 20, 50, 100],
  onPageChange,
  onPageSizeChange,
  className,
}: PaginationProps) {
  const pages = buildPages(page, totalPages, siblingCount)

  const btnBase =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm font-medium transition-colors'
  const btnDefault = 'text-gray-600 hover:bg-gray-100'
  const btnActive = 'bg-primary-600 text-white shadow-sm'
  const btnDisabled = 'cursor-not-allowed opacity-40'

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      {/* Summary */}
      {totalItems !== undefined && pageSize !== undefined && (
        <p className="text-sm text-gray-500">
          {Math.min((page - 1) * pageSize + 1, totalItems)}–{Math.min(page * pageSize, totalItems)}{' '}
          จาก {totalItems.toLocaleString()} รายการ
        </p>
      )}

      {/* Pages */}
      <div className="flex items-center gap-1">
        {showFirstLast && (
          <button
            onClick={() => onPageChange(1)}
            disabled={page === 1}
            aria-label="หน้าแรก"
            className={cn(btnBase, page === 1 ? btnDisabled : btnDefault)}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          aria-label="หน้าก่อน"
          className={cn(btnBase, page === 1 ? btnDisabled : btnDefault)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`ellipsis-${i}`} className="px-1 text-gray-400 select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(btnBase, p === page ? btnActive : btnDefault)}
            >
              {p}
            </button>
          ),
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          aria-label="หน้าถัดไป"
          className={cn(btnBase, page === totalPages ? btnDisabled : btnDefault)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {showFirstLast && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={page === totalPages}
            aria-label="หน้าสุดท้าย"
            className={cn(btnBase, page === totalPages ? btnDisabled : btnDefault)}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Page size */}
      {showPageSize && onPageSizeChange && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">แสดง</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
          >
            {pageSizeOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">รายการ</span>
        </div>
      )}
    </div>
  )
}
