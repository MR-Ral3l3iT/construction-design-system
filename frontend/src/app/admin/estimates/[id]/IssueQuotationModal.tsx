'use client'

import { useEffect, useState } from 'react'
import { Eye, FileCheck, X } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { useCompany } from '@/hooks/useCompany'
import { useWhtRates } from '@/hooks/useAccountingSettings'
import { useIssueQuotation } from '@/hooks/useDocuments'
import { useToast } from '@/providers/toast-provider'

interface Props {
  open: boolean
  onClose: () => void
  estimateId: number
  /** ฉบับที่มีผลอยู่ — ถ้ามี ฉบับนี้จะเป็น -R{n} และตั้งภาษีตามฉบับเดิมให้ */
  previous: { vatRate: string; whtRateId: number | null } | null
  onIssued: (documentId: number) => void
}

function todayISO() {
  // วันที่ตามเวลาไทย ไม่ใช่ UTC — en-CA ให้รูปแบบ YYYY-MM-DD
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' })
}

export function IssueQuotationModal({ open, onClose, estimateId, previous, onIssued }: Props) {
  const isRevision = !!previous
  const { success, error: toastError } = useToast()
  const { data: company } = useCompany()
  const { data: whtRates = [] } = useWhtRates()
  const issue = useIssueQuotation(estimateId)

  const [documentDate, setDocumentDate] = useState(todayISO())
  const [vatPercent, setVatPercent] = useState('7')
  const [whtRateId, setWhtRateId] = useState('')
  const [validDays, setValidDays] = useState('30')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    setDocumentDate(todayISO())
    setNote('')
    // ×100 ด้วย float ได้ 7.000000000000001 — ปัดเป็น 2 ตำแหน่งก่อนแสดง
    const toPercent = (rate: string | number) => String(Number((Number(rate) * 100).toFixed(2)))
    if (previous) {
      setVatPercent(toPercent(previous.vatRate))
      setWhtRateId(previous.whtRateId ? String(previous.whtRateId) : '')
    } else if (company) {
      setVatPercent(company.isVatRegistered ? toPercent(company.defaultVatRate) : '0')
      setWhtRateId('')
    }
    // พึ่งค่าเท่านั้น ไม่ใช่ object — refetch ระหว่างเปิดหน้าต่างต้องไม่ล้างค่าที่ผู้ใช้กรอก
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    company?.defaultVatRate,
    company?.isVatRegistered,
    previous?.vatRate,
    previous?.whtRateId,
  ])

  /** ตัวอย่างด้วยค่าที่เลือกในหน้าต่างนี้ — ภาษี วันที่ หมายเหตุ ตรงกับที่จะออกจริง */
  function openPreview() {
    const q = new URLSearchParams({ vatPercent, documentDate })
    if (whtRateId) q.set('whtRateId', whtRateId)
    if (validDays) q.set('validDays', validDays)
    if (note.trim()) q.set('note', note.trim())
    window.open(`/print/quotation-preview/${estimateId}?${q}`, '_blank')
  }

  async function handleSubmit() {
    try {
      const doc = await issue.mutateAsync({
        documentDate,
        vatPercent: Number(vatPercent),
        whtRateId: whtRateId ? Number(whtRateId) : null,
        validDays: validDays ? Number(validDays) : undefined,
        note: note.trim() || undefined,
      })
      success(`ออกใบเสนอราคา ${doc.code} สำเร็จ`)
      onIssued(doc.id)
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data
        ?.message
      toastError(Array.isArray(msg) ? msg[0] : (msg ?? 'เกิดข้อผิดพลาด'))
    }
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={isRevision ? 'ออกใบเสนอราคาฉบับแก้ไข' : 'ออกใบเสนอราคา'}
      description={
        isRevision
          ? 'ฉบับเดิมจะถูกแทนที่ เลขที่ใหม่ใช้เลขฐานเดิมต่อท้าย -R'
          : 'รายการ งวดจ่าย และ schedule จะถูกบันทึกเป็นฉบับจริงที่แก้ไขไม่ได้'
      }
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" icon={Eye} onClick={openPreview} disabled={issue.isPending}>
            ดูตัวอย่าง
          </Button>
          <Button variant="ghost" icon={X} onClick={onClose} disabled={issue.isPending}>
            ยกเลิก
          </Button>
          <Button
            variant="primary"
            icon={FileCheck}
            onClick={handleSubmit}
            loading={issue.isPending}
          >
            ออกเอกสาร
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="วันที่เอกสาร"
            type="date"
            value={documentDate}
            onChange={(e) => setDocumentDate(e.target.value)}
          />
          <Input
            label="ยืนราคา (วัน)"
            type="number"
            min="1"
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            hint="เว้นว่าง = ไม่ระบุ"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="ภาษีมูลค่าเพิ่ม (%)"
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={vatPercent}
            onChange={(e) => setVatPercent(e.target.value)}
          />
          <Select
            label="หัก ณ ที่จ่าย"
            value={whtRateId}
            onChange={(e) => setWhtRateId(e.target.value)}
            options={[
              { value: '', label: 'ไม่หัก' },
              ...whtRates.map((r) => ({
                value: String(r.id),
                label: `${r.percent}% — ${r.description}`,
              })),
            ]}
          />
        </div>
        <Textarea
          label="หมายเหตุบนเอกสาร"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
        />
      </div>
    </FormModal>
  )
}
