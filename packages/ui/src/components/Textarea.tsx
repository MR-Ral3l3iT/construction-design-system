import { forwardRef } from 'react'
import { cn } from '../lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
  showCount?: boolean
  maxLength?: number
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, showCount, maxLength, className, id, value, disabled, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
    const currentLength = typeof value === 'string' ? value.length : 0

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          value={value}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            'w-full resize-y rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
            'placeholder:text-gray-400',
            'transition-colors duration-150',
            'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
            'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
            error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
            className,
          )}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
          </div>
          {showCount && maxLength && (
            <p
              className={cn('text-xs text-gray-400', currentLength >= maxLength && 'text-red-500')}
            >
              {currentLength}/{maxLength}
            </p>
          )}
        </div>
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'
