import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { cn } from '../lib/utils'

export type SortDirection = 'asc' | 'desc' | null

export interface TableColumn<T> {
  key: string
  header: string
  sortable?: boolean
  width?: string
  className?: string
  render?: (row: T, index: number) => React.ReactNode
}

export interface TableProps<T> {
  columns: TableColumn<T>[]
  data: T[]
  keyExtractor: (row: T, index: number) => string
  sortKey?: string
  sortDirection?: SortDirection
  onSort?: (key: string) => void
  loading?: boolean
  emptyMessage?: string
  className?: string
  stickyHeader?: boolean
}

function SortIcon({
  columnKey,
  sortKey,
  sortDirection,
}: {
  columnKey: string
  sortKey?: string
  sortDirection?: SortDirection
}) {
  if (sortKey !== columnKey)
    return <ChevronsUpDown className="ml-1 inline h-3.5 w-3.5 text-gray-400" />
  if (sortDirection === 'asc')
    return <ChevronUp className="ml-1 inline h-3.5 w-3.5 text-primary-600" />
  return <ChevronDown className="ml-1 inline h-3.5 w-3.5 text-primary-600" />
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortKey,
  sortDirection,
  onSort,
  loading,
  emptyMessage = 'ไม่พบข้อมูล',
  className,
  stickyHeader,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-xl ring-1 ring-gray-200', className)}>
      <table className="w-full text-sm">
        <thead className={cn('bg-gray-50', stickyHeader && 'sticky top-0 z-10')}>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                style={col.width ? { width: col.width } : undefined}
                className={cn(
                  'border-b border-gray-200 px-4 py-3 text-left font-medium text-gray-600',
                  col.sortable && 'cursor-pointer select-none hover:text-gray-900',
                  col.className,
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                {col.header}
                {col.sortable && (
                  <SortIcon columnKey={col.key} sortKey={sortKey} sortDirection={sortDirection} />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="h-4 w-4 animate-spin text-primary-600"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  กำลังโหลด...
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-400">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={keyExtractor(row, i)} className="transition-colors hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3 text-gray-700', col.className)}>
                    {col.render
                      ? col.render(row, i)
                      : String((row as Record<string, unknown>)[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
