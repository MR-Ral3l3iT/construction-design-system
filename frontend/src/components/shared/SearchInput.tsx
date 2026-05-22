'use client'

import { Search } from 'lucide-react'
import { Input } from '@construction/ui'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'ค้นหา...',
  className,
}: SearchInputProps) {
  return (
    <Input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      leadingIcon={Search}
      className={className}
    />
  )
}
