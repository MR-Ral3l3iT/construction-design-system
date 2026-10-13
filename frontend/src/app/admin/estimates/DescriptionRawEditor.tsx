'use client'

import { useState } from 'react'
import { List } from 'lucide-react'
import { Button } from '@construction/ui'
import {
  countDescriptionLines,
  linesToText,
  setBulletAll,
  textToLines,
  type ItemLine,
} from '@/lib/descLines'

const HINT =
  '1 บรรทัด = 1 รายการย่อย · วางลิสต์จากที่อื่นได้เลย · บรรทัดว่างถูกตัดทิ้ง · ' +
  'เว้นวรรคหน้าบรรทัด = ระยะเยื้อง · ตัวหนา/สีแดงของบรรทัดที่ไม่ได้แก้ยังอยู่'

interface PanelProps {
  lines: ItemLine[]
  saving?: boolean
  onCancel: () => void
  onApply: (lines: ItemLine[]) => void
}

/**
 * เนื้อในของ Raw Editor — กล่องข้อความ + ปุ่มลัด + ปุ่มอัปเดต
 * ใช้ได้ทั้งแบบหน้าต่างของตัวเอง และแบบสลับแสดงในที่เดิม (เหมือน Railway Variables)
 */
export function RawLinesPanel({ lines, saving, onCancel, onApply }: PanelProps) {
  const initial = linesToText(lines)
  const [text, setText] = useState(initial)
  const dirty = text !== initial

  /** ยกเลิกโดยไม่บันทึก — ถามก่อนถ้ายังมีที่แก้ค้างไว้ */
  function requestCancel() {
    if (dirty && !window.confirm('ยกเลิกโดยไม่บันทึก? รายละเอียดที่แก้ไว้จะหายทั้งหมด')) return
    onCancel()
  }

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setText((t) => setBulletAll(t, true))}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          เติม - ทุกบรรทัด
        </button>
        <button
          type="button"
          onClick={() => setText((t) => setBulletAll(t, false))}
          className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          เอา - ออก
        </button>
        <span className="ml-auto text-xs text-gray-400">{countDescriptionLines(text)} บรรทัด</span>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={14}
        spellCheck={false}
        autoFocus
        placeholder={'ผังพื้นทุกชั้น\nรูปด้าน 4 ด้าน\n  รูปตัดอย่างน้อย 2 รูป'}
        className="w-full whitespace-pre rounded-xl border border-gray-200 px-3 py-2 text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary-200"
      />
      <p className="mt-1 text-xs text-gray-400">{HINT}</p>
      <div className="mt-3 flex items-center justify-end gap-2">
        <Button variant="ghost" onClick={requestCancel} disabled={saving}>
          ยกเลิก
        </Button>
        <Button
          variant="primary"
          onClick={() => onApply(textToLines(text, lines))}
          loading={saving}
        >
          อัปเดตรายละเอียด
        </Button>
      </div>
    </div>
  )
}

interface Props extends PanelProps {
  itemName: string
}

/**
 * Raw Editor แบบหน้าต่างของตัวเอง — เปิดจากปุ่ม ☰ ในตารางรายการ
 * (ในหน้าต่างแก้รายการใช้ RawLinesPanel แบบสลับในที่เดิมแทน เพราะหน้าต่างซ้อนกันจะ
 * ถูก dialog ตัวแรกบังการคลิกทั้งหมด)
 */
export function DescriptionRawEditor({ itemName, ...panel }: Props) {
  return (
    // เจตนา: คลิกนอกกรอบ**ไม่ปิด** และไม่ผูก Escape — ระหว่างพิมพ์ลิสต์ยาว การเผลอปิดแล้วงานหาย
    // ทั้งก้อนเสียหายกว่าความสะดวกที่ได้ ปิดได้ทางปุ่มยกเลิกเท่านั้น
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="border-b border-gray-100 px-5 py-4">
          <h3 className="flex items-center gap-2 font-semibold text-gray-800">
            <List className="h-4 w-4 text-primary-500" />
            แก้รายละเอียดเป็นข้อความ
          </h3>
          <p className="mt-1 text-xs text-gray-400">รายการ &ldquo;{itemName}&rdquo;</p>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <RawLinesPanel {...panel} />
        </div>
      </div>
    </div>
  )
}
