import { Check, Minus } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../lib/utils'

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  description?: string
  indeterminate?: boolean
  error?: string
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, indeterminate, error, className, id, disabled, ...props }, ref) => {
    const checkId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        <label
          htmlFor={checkId}
          className={cn(
            'flex cursor-pointer items-start gap-3',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        >
          <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
            <input
              ref={ref}
              id={checkId}
              type="checkbox"
              disabled={disabled}
              className="peer sr-only"
              {...props}
            />
            <div
              className={cn(
                'h-4 w-4 rounded border-2 border-gray-300 bg-white transition-colors',
                'peer-checked:border-primary-600 peer-checked:bg-primary-600',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/20 peer-focus-visible:ring-offset-1',
                error && 'border-red-400',
                className,
              )}
            />
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
              {indeterminate ? (
                <Minus className="h-2.5 w-2.5" strokeWidth={3} />
              ) : (
                <Check className="h-2.5 w-2.5 opacity-0 peer-checked:opacity-100" strokeWidth={3} />
              )}
            </span>
          </div>
          {(label || description) && (
            <div>
              {label && <p className="text-sm font-medium text-gray-800">{label}</p>}
              {description && <p className="text-xs text-gray-500">{description}</p>}
            </div>
          )}
        </label>
        {error && <p className="ml-7 text-xs text-red-600">{error}</p>}
      </div>
    )
  },
)

Checkbox.displayName = 'Checkbox'
