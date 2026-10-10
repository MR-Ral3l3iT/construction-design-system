'use client'

import { useEffect, useState } from 'react'
import { Ban, X } from 'lucide-react'
import { Button, Textarea } from '@construction/ui'
import { FormModal } from '@/components/shared/FormModal'
import { useVoidDocument } from '@/hooks/useDocuments'
import { useToast } from '@/providers/toast-provider'

interface Props {
  open: boolean
  onClose: () => void
  document: { id: number; code: string } | null
}

export function VoidQuotationModal({ open, onClose, document }: Props) {
  const { success, error: toastError } = useToast()
  const voidDoc = useVoidDocument()
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open) setReason('')
  }, [open])

  async function handleSubmit() {
    if (!document) return
    try {
      await voidDoc.mutateAsync({ id: document.id, reason: reason.trim() })
      success(`ยกเลิกใบเสนอราคา ${document.code} แล้ว`)
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
      title={`ยกเลิกใบเสนอราคา ${document?.code ?? ''}`}
      description="เลขที่เดิมยังคงอยู่ในระบบ งวดเงินที่ยังไม่ได้รับชำระจากใบนี้จะถูกลบ และใบประเมินกลับเป็นร่าง"
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" icon={X} onClick={onClose} disabled={voidDoc.isPending}>
            ปิด
          </Button>
          <Button
            variant="danger"
            icon={Ban}
            onClick={handleSubmit}
            loading={voidDoc.isPending}
            disabled={reason.trim().length < 3}
          >
            ยืนยันยกเลิก
          </Button>
        </div>
      }
    >
      <Textarea
        label="เหตุผล"
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="เช่น ลูกค้ายกเลิกงาน"
        maxLength={500}
        required
      />
    </FormModal>
  )
}
