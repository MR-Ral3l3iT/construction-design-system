'use client'

import { createContext, useContext } from 'react'
import { cn } from '../lib/utils'

interface RadioGroupContextValue {
  name: string
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
}

const RadioGroupContext = createContext<RadioGroupContextValue>({ name: '' })

export interface RadioGroupProps {
  name: string
  value?: string
  defaultValue?: string
  label?: string
  error?: string
  hint?: string
  disabled?: boolean
  orientation?: 'vertical' | 'horizontal'
  onChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function RadioGroup({
  name,
  value,
  label,
  error,
  hint,
  disabled,
  orientation = 'vertical',
  onChange,
  children,
  className,
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ name, value, disabled, onChange }}>
      <fieldset className={cn('flex flex-col gap-1', className)}>
        {label && <legend className="mb-1 text-sm font-medium text-gray-700">{label}</legend>}
        <div
          className={cn(
            'flex gap-3',
            orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
          )}
        >
          {children}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      </fieldset>
    </RadioGroupContext.Provider>
  )
}

export interface RadioProps {
  value: string
  label: string
  description?: string
  disabled?: boolean
}

export function Radio({ value, label, description, disabled: itemDisabled }: RadioProps) {
  const ctx = useContext(RadioGroupContext)
  const isChecked = ctx.value === value
  const isDisabled = itemDisabled ?? ctx.disabled
  const id = `${ctx.name}-${value}`

  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3',
        isDisabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <div className="relative mt-0.5 flex shrink-0 items-center justify-center">
        <input
          id={id}
          type="radio"
          name={ctx.name}
          value={value}
          checked={isChecked}
          disabled={isDisabled}
          onChange={() => ctx.onChange?.(value)}
          className="peer sr-only"
        />
        <div
          className={cn(
            'h-4 w-4 rounded-full border-2 border-gray-300 bg-white transition-colors',
            'peer-checked:border-primary-600',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500/20 peer-focus-visible:ring-offset-1',
          )}
        />
        <div
          className={cn(
            'absolute h-2 w-2 rounded-full bg-primary-600 transition-transform',
            isChecked ? 'scale-100' : 'scale-0',
          )}
        />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
    </label>
  )
}
