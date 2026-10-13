'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, Trash2, Wand2 } from 'lucide-react'
import { Button } from '@construction/ui'
import {
  useUpsertSchedule,
  type EstimateInstallment,
  type EstimateSchedulePhase,
} from '@/hooks/useEstimates'
import { useToast } from '@/providers/toast-provider'

interface Row {
  name: string
  startWeek: string
  durationWeeks: string
}

const toRows = (phases: EstimateSchedulePhase[]): Row[] =>
  phases.map((p) => ({
    name: p.name,
    startWeek: String(p.startWeek),
    durationWeeks: String(p.durationWeeks),
  }))

/**
 * ร่าง schedule จากงวดงาน — งวดที่ระบุ "ภายใน x สัปดาห์" เป็นช่วงงานหนึ่ง เรียงต่อกัน
 * งวดที่ไม่ระบุสัปดาห์ (เช่น "เมื่อลงนามว่าจ้าง") ไม่ใช่ช่วงทำงาน จึงข้ามไป
 */
function draftFromInstallments(installments: EstimateInstallment[]): Row[] {
  let start = 1
  return installments
    .filter((inst) => inst.withinWeeks && inst.withinWeeks > 0)
    .map((inst) => {
      const duration = inst.withinWeeks as number
      const row = {
        name: inst.description || `งวดที่ ${inst.installmentNo}`,
        startWeek: String(start),
        durationWeeks: String(duration),
      }
      start += duration
      return row
    })
}

interface Props {
  estimateId: number
  phases: EstimateSchedulePhase[]
  installments: EstimateInstallment[]
  readOnly: boolean
}

export function ScheduleEditor({ estimateId, phases, installments, readOnly }: Props) {
  const { success, error: toastError } = useToast()
  const upsert = useUpsertSchedule(estimateId)
  const [rows, setRows] = useState<Row[]>(() => toRows(phases))

  useEffect(() => {
    setRows(toRows(phases))
  }, [phases])

  function update(idx: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)))
  }

  function handleDraft() {
    if (rows.length > 0 && !window.confirm('แทนที่ schedule ปัจจุบันด้วยร่างจากงวดงาน?')) return
    setRows(draftFromInstallments(installments))
  }

  async function handleSave() {
    const invalid = rows.some(
      (r) => !r.name.trim() || Number(r.startWeek) < 1 || Number(r.durationWeeks) < 1,
    )
    if (invalid) {
      toastError('ทุกช่วงงานต้องมีชื่อ สัปดาห์ที่เริ่ม และระยะเวลาอย่างน้อย 1 สัปดาห์')
      return
    }
    try {
      await upsert.mutateAsync(
        rows.map((r) => ({
          name: r.name.trim(),
          startWeek: Number(r.startWeek),
          durationWeeks: Number(r.durationWeeks),
        })),
      )
      success('บันทึก schedule สำเร็จ')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  const totalWeeks = Math.max(
    1,
    ...rows.map((r) => (Number(r.startWeek) || 1) + (Number(r.durationWeeks) || 1) - 1),
  )

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500">
              <th className="pb-2 pr-2 font-medium">ช่วงงาน</th>
              <th className="w-24 pb-2 pr-2 font-medium">เริ่มสัปดาห์ที่</th>
              <th className="w-24 pb-2 pr-2 font-medium">ระยะเวลา (สัปดาห์)</th>
              <th className="min-w-[160px] pb-2 pr-2 font-medium">แผนภาพ ({totalWeeks} สัปดาห์)</th>
              {!readOnly && <th className="w-8 pb-2" />}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => {
              const start = Number(row.startWeek) || 1
              const dur = Number(row.durationWeeks) || 1
              return (
                <tr key={idx} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 align-middle">
                    {readOnly ? (
                      row.name
                    ) : (
                      <input
                        className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
                        placeholder="เช่น ออกแบบร่าง"
                        value={row.name}
                        onChange={(e) => update(idx, 'name', e.target.value)}
                      />
                    )}
                  </td>
                  {(['startWeek', 'durationWeeks'] as const).map((field) => (
                    <td key={field} className="py-1.5 pr-2 align-middle">
                      {readOnly ? (
                        row[field]
                      ) : (
                        <input
                          type="number"
                          min="1"
                          className="w-full rounded border border-gray-200 px-2 py-1 text-sm focus:border-primary-400 focus:outline-none"
                          value={row[field]}
                          onChange={(e) => update(idx, field, e.target.value)}
                        />
                      )}
                    </td>
                  ))}
                  <td className="py-1.5 pr-2 align-middle">
                    <div className="relative h-3 rounded bg-gray-100">
                      <div
                        className="absolute h-3 rounded bg-primary-400"
                        style={{
                          left: `${((start - 1) / totalWeeks) * 100}%`,
                          width: `${(dur / totalWeeks) * 100}%`,
                        }}
                      />
                    </div>
                  </td>
                  {!readOnly && (
                    <td className="py-1.5 align-middle">
                      <button
                        onClick={() => setRows((prev) => prev.filter((_, i) => i !== idx))}
                        className="text-red-400 hover:text-red-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {rows.length === 0 && (
        <p className="py-4 text-center text-sm text-gray-400">ยังไม่มี schedule</p>
      )}

      {!readOnly && (
        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            icon={Wand2}
            onClick={handleDraft}
            disabled={installments.length === 0}
          >
            ร่างจากงวดงาน
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => {
              const nextStart = rows.length === 0 ? 1 : totalWeeks + 1
              setRows((prev) => [
                ...prev,
                { name: '', startWeek: String(nextStart), durationWeeks: '1' },
              ])
            }}
          >
            เพิ่มช่วงงาน
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Save}
            onClick={handleSave}
            loading={upsert.isPending}
          >
            บันทึก
          </Button>
        </div>
      )}
    </div>
  )
}
