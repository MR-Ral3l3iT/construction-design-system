'use client'

import { forwardRef, useLayoutEffect, useRef } from 'react'
import { Input, type InputProps } from '@construction/ui'
import { caretAfterFormat, formatMoneyInput, parseMoneyInput } from '@/lib/moneyInput'

type Props = Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  /** ค่าดิบ เช่น "180000.5" */
  value: string
  onChange: (raw: string) => void
}

/** ช่องกรอกเงินที่แสดง , คั่นหลักพันระหว่างพิมพ์ ลดการใส่หลักผิด */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onChange, ...props },
  forwarded,
) {
  const inner = useRef<HTMLInputElement | null>(null)
  const pendingCaret = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (pendingCaret.current !== null && inner.current) {
      inner.current.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  })

  return (
    <Input
      {...props}
      ref={(el) => {
        inner.current = el
        if (typeof forwarded === 'function') forwarded(el)
        else if (forwarded) forwarded.current = el
      }}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={formatMoneyInput(value)}
      onChange={(e) => {
        const typed = e.target.value
        const raw = parseMoneyInput(typed)
        pendingCaret.current = caretAfterFormat(
          typed,
          e.target.selectionStart ?? typed.length,
          formatMoneyInput(raw),
        )
        onChange(raw)
      }}
    />
  )
})
