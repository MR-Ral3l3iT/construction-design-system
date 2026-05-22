import { forwardRef } from 'react'
import { cn } from '../lib/utils'

export interface SwitchProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type' | 'role'
> {
  label?: string
  description?: string
  labelPosition?: 'left' | 'right'
}

export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
  ({ label, description, labelPosition = 'right', className, id, disabled, ...props }, ref) => {
    const switchId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    const track = (
      <div className="relative">
        <input
          ref={ref}
          id={switchId}
          type="checkbox"
          role="switch"
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div
          className={cn(
            'h-5 w-9 rounded-full border-2 border-transparent bg-gray-200 transition-colors duration-200',
            'peer-checked:bg-primary-600',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/30 peer-focus-visible:ring-offset-1',
            'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            className,
          )}
        />
        <div
          className={cn(
            'absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200',
            'peer-checked:translate-x-4',
          )}
        />
      </div>
    )

    if (!label) return track

    return (
      <label
        htmlFor={switchId}
        className={cn(
          'flex cursor-pointer items-start gap-3',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        {labelPosition === 'left' && (
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        )}
        {track}
        {labelPosition === 'right' && (
          <div>
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {description && <p className="text-xs text-gray-500">{description}</p>}
          </div>
        )}
      </label>
    )
  },
)

Switch.displayName = 'Switch'
