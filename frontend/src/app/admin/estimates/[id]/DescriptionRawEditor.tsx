'use client'

import { useState } from 'react'
import { List, X } from 'lucide-react'
import { Button } from '@construction/ui'
import { countDescriptionLines, normalizeDescription, setBulletAll } from '@/lib/descLines'

interface Props {
  itemName: string
  description: string
  saving: boolean
  onClose: () => void
  onApply: (description: string) => void
}

/**
 * แก้รายละเอียดของรายการเป็นข้อความก้อนเดียว — 1 บรรทัด = 1 รายการย่อย
 * แนวเดียวกับ Raw Editor ของ Railway ตอนใส่ Variables พอร์ตจาก DescriptionsRawEditor ของ KK
 */
export function DescriptionRawEditor({ itemName, description, saving, onClose, onApply }: Props) {
  const [text, setText] = useState(description)
  const dirty = text !== description

  /** ปิดโดยไม่บันทึก — ถามก่อนถ้ายังมีที่แก้ค้างไว้ */
  function requestClose() {
    if (dirty && !window.confirm('ปิดโดยไม่บันทึก? รายละเอียดที่แก้ไว้จะหายทั้งหมด')) return
    onClose()
  }

  return (
    // เจตนา: คลิกนอกกรอบ**ไม่ปิด** และไม่ผูก Escape — ระหว่างพิมพ์ลิสต์ยาว การเผลอปิดแล้วงานหาย
    // ทั้งก้อนเสียหายกว่าความสะดวกที่ได้ จึงไม่ใช้ Modal กลางที่ปิดเมื่อคลิกพื้นหลัง
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-800">
              <List className="h-4 w-4 text-primary-500" />
              แก้รายละเอียดเป็นข้อความ
            </h3>
            <p className="mt-1 text-xs text-gray-400">
              1 บรรทัด = 1 รายการย่อย · วางลิสต์จากที่อื่นได้เลย · บรรทัดว่างถูกตัดทิ้ง ·
              เว้นวรรคหน้าบรรทัด = ระยะเยื้อง · รายการ &ldquo;{itemName}&rdquo;
            </p>
          </div>
          <button
            onClick={requestClose}
            title="ปิด"
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
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
            <span className="ml-auto text-xs text-gray-400">
              {countDescriptionLines(text)} บรรทัด
            </span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={14}
            spellCheck={false}
            autoFocus
            placeholder={'ผังพื้นทุกชั้น\nรูปด้าน 4 ด้าน\n  รูปตัดอย่างน้อย 2 รูป'}
            className="w-full whitespace-pre rounded-xl border border-gray-200 px-3 py-2 font-mono text-sm leading-6 focus:outline-none focus:ring-2 focus:ring-primary-200"
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-4">
          <Button variant="ghost" onClick={requestClose} disabled={saving}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            onClick={() => onApply(normalizeDescription(text))}
            loading={saving}
          >
            อัปเดตรายละเอียด
          </Button>
        </div>
      </div>
    </div>
  )
}
