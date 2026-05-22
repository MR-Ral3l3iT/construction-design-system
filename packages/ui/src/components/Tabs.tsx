'use client'

import { type LucideIcon } from 'lucide-react'
import { createContext, useContext, useState } from 'react'

import { cn } from '../lib/utils'

interface TabsContextValue {
  active: string
  setActive: (key: string) => void
  variant: 'underline' | 'pills' | 'boxed'
}

const TabsContext = createContext<TabsContextValue>({
  active: '',
  setActive: () => {},
  variant: 'underline',
})

export interface TabsProps {
  defaultValue?: string
  value?: string
  onChange?: (key: string) => void
  variant?: 'underline' | 'pills' | 'boxed'
  children: React.ReactNode
  className?: string
}

export function Tabs({
  defaultValue = '',
  value,
  onChange,
  variant = 'underline',
  children,
  className,
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue)
  const isControlled = value !== undefined
  const active = isControlled ? value! : uncontrolled

  function setActive(key: string) {
    if (!isControlled) setUncontrolled(key)
    onChange?.(key)
  }

  return (
    <TabsContext.Provider value={{ active, setActive, variant }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export interface TabListProps {
  children: React.ReactNode
  className?: string
}

export function TabList({ children, className }: TabListProps) {
  const { variant } = useContext(TabsContext)
  return (
    <div
      role="tablist"
      className={cn(
        'flex items-center',
        variant === 'underline' && 'gap-0 border-b border-gray-200',
        variant === 'pills' && 'gap-1',
        variant === 'boxed' && 'gap-0 rounded-lg bg-gray-100 p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

export interface TabProps {
  value: string
  icon?: LucideIcon
  children: React.ReactNode
  disabled?: boolean
  badge?: string | number
}

export function Tab({ value, icon: Icon, children, disabled, badge }: TabProps) {
  const { active, setActive, variant } = useContext(TabsContext)
  const isActive = active === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && setActive(value)}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30',
        'disabled:cursor-not-allowed disabled:opacity-40',

        variant === 'underline' && [
          'px-4 py-2.5 -mb-px border-b-2',
          isActive
            ? 'border-primary-600 text-primary-600'
            : 'border-transparent text-gray-500 hover:text-gray-800',
        ],

        variant === 'pills' && [
          'rounded-full px-3 py-1.5',
          isActive ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-100',
        ],

        variant === 'boxed' && [
          'rounded-md px-3 py-1.5 flex-1 justify-center',
          isActive
            ? 'bg-white text-gray-900 shadow-sm ring-1 ring-gray-200'
            : 'text-gray-500 hover:text-gray-700',
        ],
      )}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" aria-hidden />}
      {children}
      {badge !== undefined && (
        <span
          className={cn(
            'rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
            isActive ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-500',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

export interface TabPanelProps {
  value: string
  children: React.ReactNode
  className?: string
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { active } = useContext(TabsContext)
  if (active !== value) return null
  return (
    <div role="tabpanel" className={cn('mt-4', className)}>
      {children}
    </div>
  )
}
