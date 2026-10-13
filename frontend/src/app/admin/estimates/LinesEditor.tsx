'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { Bold, List, Plus, Trash2 } from 'lucide-react'
import { DESC_INDENT, type ItemLine } from '@/lib/descLines'
import { RawLinesPanel } from './DescriptionRawEditor'

interface Props {
  lines: ItemLine[]
  onChange: (lines: ItemLine[]) => void
  /** แจ้งเมื่อสลับเข้า/ออกโหมด Raw Editor — ให้หน้าต่างแม่กันการบันทึกระหว่างแก้ข้อความค้าง */
  onRawModeChange?: (raw: boolean) => void
}

/**
 * แก้บรรทัดรายละเอียดทีละบรรทัด — ปุ่ม B (ตัวหนา) และจุดแดง (ไฮไลต์) ต่อบรรทัด
 * Tab / Shift+Tab = เยื้อง/ถอยเยื้อง · Enter = เพิ่มบรรทัดถัดไป · Backspace ในบรรทัดว่าง = ลบบรรทัด
 */
export function LinesEditor({ lines, onChange, onRawModeChange }: Props) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const [raw, setRaw] = useState(false)
  // ช่องที่ต้องได้ focus หลัง render รอบถัดไป — ใช้ layout effect แทน setTimeout เพราะ
  // keydown เป็น discrete event ที่ React flush ทันที focus จึงย้ายก่อนตัวอักษรถัดไปมาถึง
  const pendingFocus = useRef<number | null>(null)
  useLayoutEffect(() => {
    if (pendingFocus.current === null) return
    inputs.current[pendingFocus.current]?.focus()
    pendingFocus.current = null
  }, [lines])
  const setRawMode = (on: boolean) => {
    setRaw(on)
    onRawModeChange?.(on)
  }

  const update = (idx: number, patch: Partial<ItemLine>) =>
    onChange(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)))

  const insertAfter = (idx: number) => {
    // บรรทัดใหม่ใช้ระยะเยื้องเดียวกับบรรทัดก่อนหน้า เหมือนพิมพ์ลิสต์ใน editor ทั่วไป
    const indent = lines[idx]?.text.match(/^ */)?.[0] ?? ''
    onChange([...lines.slice(0, idx + 1), { text: indent }, ...lines.slice(idx + 1)])
    pendingFocus.current = idx + 1
  }

  const remove = (idx: number) => {
    onChange(lines.filter((_, i) => i !== idx))
    pendingFocus.current = Math.max(0, idx - 1)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>, idx: number) {
    const text = lines[idx].text
    if (e.key === 'Tab') {
      e.preventDefault()
      update(idx, {
        text: e.shiftKey ? text.replace(new RegExp(`^${DESC_INDENT}`), '') : DESC_INDENT + text,
      })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      insertAfter(idx)
    } else if (e.key === 'Backspace' && text === '' && lines.length > 1) {
      e.preventDefault()
      remove(idx)
    }
  }

  const toggleCls = (on: boolean, color: string) =>
    `flex h-7 w-7 flex-shrink-0 items-center justify-center rounded border text-xs ${
      on ? color : 'border-gray-200 text-gray-300 hover:text-gray-500'
    }`

  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">รายละเอียด</span>
        <button
          type="button"
          onClick={() => setRawMode(true)}
          disabled={raw}
          className="inline-flex items-center gap-1 text-xs text-primary-600 hover:underline"
        >
          <List className="h-3.5 w-3.5" />
          Raw Editor
        </button>
      </div>
      {raw ? (
        // สลับเป็นกล่องข้อความในที่เดิม เหมือน Raw Editor ของ Railway Variables
        <RawLinesPanel
          lines={lines.filter((l) => l.text.trim() !== '')}
          onCancel={() => setRawMode(false)}
          onApply={(next) => {
            onChange(next.length > 0 ? next : [{ text: '' }])
            setRawMode(false)
          }}
        />
      ) : (
        <>
          <div className="space-y-1">
            {lines.map((line, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <button
                  type="button"
                  title="ตัวหนา"
                  onClick={() => update(idx, { bold: !line.bold })}
                  className={toggleCls(!!line.bold, 'border-gray-700 bg-gray-800 text-white')}
                >
                  <Bold className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="ไฮไลต์สีแดง"
                  onClick={() => update(idx, { highlight: !line.highlight })}
                  className={toggleCls(!!line.highlight, 'border-red-300 bg-red-50')}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${line.highlight ? 'bg-red-500' : 'bg-gray-200'}`}
                  />
                </button>
                <input
                  ref={(el) => {
                    inputs.current[idx] = el
                  }}
                  value={line.text}
                  onChange={(e) => update(idx, { text: e.target.value })}
                  onKeyDown={(e) => onKeyDown(e, idx)}
                  spellCheck={false}
                  placeholder="เช่น First concept design"
                  className={`w-full whitespace-pre rounded border border-gray-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none ${
                    line.bold ? 'font-bold' : ''
                  } ${line.highlight ? 'text-red-600' : 'text-gray-800'}`}
                />
                <button
                  type="button"
                  title="ลบบรรทัด"
                  onClick={() => remove(idx)}
                  className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <button
              type="button"
              onClick={() => insertAfter(lines.length - 1)}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
            >
              <Plus className="h-3.5 w-3.5" />
              เพิ่มบรรทัด
            </button>
            <span className="text-xs text-gray-400">Tab = เยื้อง · Enter = บรรทัดใหม่</span>
          </div>
        </>
      )}
    </div>
  )
}
