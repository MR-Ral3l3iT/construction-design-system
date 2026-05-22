import { type LucideIcon } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '../lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leadingIcon?: LucideIcon
  trailingIcon?: LucideIcon
  onTrailingIconClick?: () => void
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      onTrailingIconClick,
      className,
      id,
      disabled,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {LeadingIcon && (
            <span className="pointer-events-none absolute left-3 flex items-center">
              <LeadingIcon className="h-4 w-4 text-gray-400" aria-hidden />
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={cn(
              'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900',
              'placeholder:text-gray-400',
              'transition-colors duration-150',
              'focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20',
              'disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400',
              error && 'border-red-400 focus:border-red-500 focus:ring-red-500/20',
              LeadingIcon && 'pl-9',
              TrailingIcon && 'pr-9',
              className,
            )}
            {...props}
          />
          {TrailingIcon && (
            <span
              className={cn(
                'absolute right-3 flex items-center',
                onTrailingIconClick ? 'cursor-pointer' : 'pointer-events-none',
              )}
              onClick={onTrailingIconClick}
            >
              <TrailingIcon className="h-4 w-4 text-gray-400" aria-hidden />
            </span>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </div>
    )
  },
)

Input.displayName = 'Input'
