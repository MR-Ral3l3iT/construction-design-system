'use client'

import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  type LucideIcon,
  Plus,
  Lock,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  X,
  Save,
  Send,
  CheckCircle,
  RotateCcw,
  FolderOpen,
  Layers,
} from 'lucide-react'
import { Card, CardBody, Badge, Button, Input, Textarea } from '@construction/ui'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { FormModal } from '@/components/shared/FormModal'
import {
  useBOQ,
  useAddBOQCategory,
  useUpdateBOQCategory,
  useDeleteBOQCategory,
  useAddBOQSubCategory,
  useUpdateBOQSubCategory,
  useDeleteBOQSubCategory,
  useAddBOQItem,
  useUpdateBOQItem,
  useDeleteBOQItem,
  type BOQCategory,
  type BOQSubCategory,
  type BOQItem,
  type BOQItemPayload,
} from '@/hooks/useBOQ'
import { useToast } from '@/providers/toast-provider'
import { api } from '@/lib/api'

function formatCurrency(n: number) {
  return new Intl.NumberFormat('th-TH', {
    style: 'currency',
    currency: 'THB',
    maximumFractionDigits: 0,
  }).format(n)
}

interface Props {
  id: number
  projectId: number
}

const EMPTY_ITEM: BOQItemPayload = {
  name: '',
  quantity: '1',
  unit: '',
  materialPrice: '0',
  laborPrice: '0',
  description: '',
  remark: '',
}

export function BOQDetailContent({ id, projectId }: Props) {
  const { success, error: toastError } = useToast()
  const qc = useQueryClient()
  const { data: boq, isLoading } = useBOQ(id)

  // Category state
  const addCategory = useAddBOQCategory(id)
  const updateCategory = useUpdateBOQCategory(id)
  const deleteCategory = useDeleteBOQCategory(id)
  const [catModalOpen, setCatModalOpen] = useState(false)
  const [catName, setCatName] = useState('')
  const [editCat, setEditCat] = useState<BOQCategory | null>(null)
  const [editCatName, setEditCatName] = useState('')
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set())

  // SubCategory state
  const addSubCat = useAddBOQSubCategory(id)
  const updateSubCat = useUpdateBOQSubCategory(id)
  const deleteSubCat = useDeleteBOQSubCategory(id)
  const [subCatModal, setSubCatModal] = useState<{ catId: number } | null>(null)
  const [subCatName, setSubCatName] = useState('')
  const [editSubCat, setEditSubCat] = useState<BOQSubCategory | null>(null)
  const [editSubCatName, setEditSubCatName] = useState('')
  const [expandedSubs, setExpandedSubs] = useState<Set<number>>(new Set())

  // Item state
  const addItem = useAddBOQItem(id)
  const updateItem = useUpdateBOQItem(id)
  const deleteItem = useDeleteBOQItem(id)
  const [itemModal, setItemModal] = useState<{ subCatId: number } | null>(null)
  const [editItemTarget, setEditItemTarget] = useState<BOQItem | null>(null)
  const [itemForm, setItemForm] = useState<BOQItemPayload>(EMPTY_ITEM)

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const { data } = await api.patch(`/boq/${id}/status`, { status })
      return data?.data ?? data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['boq', id] })
      qc.invalidateQueries({ queryKey: ['boq', 'project', projectId] })
    },
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-100" />
        ))}
      </div>
    )
  }
  if (!boq) return <p className="text-gray-500">ไม่พบ BOQ</p>

  const isLocked = boq.isLocked
  const categories = boq.categories ?? []

  function toggleCat(id: number) {
    setExpandedCats((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }
  function toggleSub(id: number) {
    setExpandedSubs((prev) => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  // ─── Category handlers ────────────────────────────────────────────────────────
  async function handleAddCategory() {
    if (!catName.trim()) return toastError('กรุณากรอกชื่อหมวดงาน')
    try {
      await addCategory.mutateAsync({ name: catName.trim() })
      success('เพิ่มหมวดงานสำเร็จ')
      setCatName('')
      setCatModalOpen(false)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleEditCategory() {
    if (!editCat || !editCatName.trim()) return toastError('กรุณากรอกชื่อหมวดงาน')
    try {
      await updateCategory.mutateAsync({ categoryId: editCat.id, name: editCatName.trim() })
      success('แก้ไขหมวดงานสำเร็จ')
      setEditCat(null)
      setEditCatName('')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleDeleteCategory(cat: BOQCategory) {
    const subCount = (cat.subCategories ?? []).length
    if (subCount > 0 && !confirm(`หมวด "${cat.name}" มี ${subCount} หัวข้อย่อย ยืนยันลบ?`)) return
    try {
      await deleteCategory.mutateAsync(cat.id)
      success('ลบหมวดงานสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  // ─── SubCategory handlers ─────────────────────────────────────────────────────
  async function handleAddSubCat() {
    if (!subCatModal || !subCatName.trim()) return toastError('กรุณากรอกชื่อหัวข้อย่อย')
    try {
      await addSubCat.mutateAsync({ categoryId: subCatModal.catId, name: subCatName.trim() })
      success('เพิ่มหัวข้อย่อยสำเร็จ')
      setExpandedCats((p) => new Set([...p, subCatModal.catId]))
      setSubCatName('')
      setSubCatModal(null)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleEditSubCat() {
    if (!editSubCat || !editSubCatName.trim()) return toastError('กรุณากรอกชื่อหัวข้อย่อย')
    try {
      await updateSubCat.mutateAsync({ subCategoryId: editSubCat.id, name: editSubCatName.trim() })
      success('แก้ไขหัวข้อย่อยสำเร็จ')
      setEditSubCat(null)
      setEditSubCatName('')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleDeleteSubCat(sub: BOQSubCategory) {
    const itemCount = (sub.items ?? []).length
    if (itemCount > 0 && !confirm(`หัวข้อ "${sub.name}" มี ${itemCount} รายการ ยืนยันลบ?`)) return
    try {
      await deleteSubCat.mutateAsync(sub.id)
      success('ลบหัวข้อย่อยสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  // ─── Item handlers ────────────────────────────────────────────────────────────
  async function handleAddItem() {
    if (!itemModal || !itemForm.name.trim()) return toastError('กรุณากรอกชื่อรายการ')
    try {
      await addItem.mutateAsync({ subCategoryId: itemModal.subCatId, payload: itemForm })
      success('เพิ่มรายการสำเร็จ')
      setExpandedSubs((p) => new Set([...p, itemModal.subCatId]))
      setItemModal(null)
      setItemForm(EMPTY_ITEM)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleEditItem() {
    if (!editItemTarget || !itemForm.name.trim()) return toastError('กรุณากรอกชื่อรายการ')
    try {
      await updateItem.mutateAsync({ itemId: editItemTarget.id, payload: itemForm })
      success('แก้ไขรายการสำเร็จ')
      setEditItemTarget(null)
      setItemForm(EMPTY_ITEM)
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  async function handleDeleteItem(itemId: number) {
    try {
      await deleteItem.mutateAsync(itemId)
      success('ลบรายการสำเร็จ')
    } catch {
      toastError('เกิดข้อผิดพลาด')
    }
  }

  const STATUS_ACTIONS: Record<
    string,
    { label: string; next: string; variant: 'primary' | 'outline'; icon: LucideIcon }[]
  > = {
    DRAFT: [{ label: 'ส่งตรวจสอบ', next: 'REVIEW', variant: 'primary', icon: Send }],
    REVIEW: [
      { label: 'อนุมัติ', next: 'APPROVED', variant: 'primary', icon: CheckCircle },
      { label: 'กลับเป็นร่าง', next: 'DRAFT', variant: 'outline', icon: RotateCcw },
    ],
    APPROVED: [{ label: 'ล็อก BOQ', next: 'LOCKED', variant: 'primary', icon: Lock }],
  }

  return (
    <div className="space-y-6">
      {/* BOQ Header */}
      <Card>
        <CardBody>
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-xs text-gray-400">
                {boq.code} · v{boq.version}
              </p>
              <h2 className="text-xl font-semibold text-gray-900">{boq.title}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={boq.status} />
                {isLocked && (
                  <Badge variant="info">
                    <Lock className="mr-1 h-3 w-3 inline" />
                    ล็อกแล้ว
                  </Badge>
                )}
                {boq.project && (
                  <Link
                    href={`/admin/projects/${boq.project.id}`}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    {boq.project.code} · {boq.project.name}
                  </Link>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">มูลค่ารวม</p>
              <p className="text-2xl font-bold text-primary-600">
                {formatCurrency(boq.totalAmount)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 sm:grid-cols-4">
            {[
              { label: 'วัสดุ', value: boq.materialCost },
              { label: 'ค่าแรง', value: boq.laborCost },
              { label: 'Overhead', value: boq.overheadCost },
              { label: 'Profit', value: boq.profit },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg bg-gray-50 p-3 text-center">
                <p className="text-xs text-gray-500">{label}</p>
                <p className="mt-1 font-semibold text-gray-900">{formatCurrency(value)}</p>
              </div>
            ))}
          </div>

          {!isLocked && STATUS_ACTIONS[boq.status] && (
            <div className="mt-4 flex flex-wrap gap-2 border-t pt-4">
              {STATUS_ACTIONS[boq.status].map((action) => (
                <Button
                  key={action.next}
                  variant={action.variant}
                  size="sm"
                  icon={action.icon}
                  onClick={() => statusMutation.mutate(action.next)}
                  loading={statusMutation.isPending}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 3-Level Structure */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">หมวดงาน / รายการ</h3>
          {!isLocked && (
            <Button variant="outline" size="sm" icon={Plus} onClick={() => setCatModalOpen(true)}>
              เพิ่มหมวดงาน
            </Button>
          )}
        </div>

        {categories.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">ยังไม่มีหมวดงาน</p>
        ) : (
          categories.map((cat: BOQCategory) => {
            const subCategories = cat.subCategories ?? []
            const catTotal = subCategories.reduce(
              (sum, sub) =>
                sum + (sub.items ?? []).reduce((s, item) => s + Number(item.totalPrice), 0),
              0,
            )
            const isCatExpanded = expandedCats.has(cat.id)

            return (
              <Card key={cat.id} className="overflow-hidden">
                {/* Category header */}
                <div
                  className="flex cursor-pointer items-center gap-3 bg-gray-900 px-4 py-3 text-white"
                  onClick={() => toggleCat(cat.id)}
                >
                  {isCatExpanded ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
                  )}
                  <FolderOpen className="h-4 w-4 shrink-0 text-primary-400" />
                  <span className="flex-1 font-semibold">{cat.name}</span>
                  <Badge variant="outline" className="border-gray-600 text-gray-300 text-xs">
                    {subCategories.length} หัวข้อย่อย
                  </Badge>
                  <span className="ml-2 text-sm font-semibold text-primary-300">
                    {formatCurrency(catTotal)}
                  </span>
                  {!isLocked && (
                    <div
                      className="ml-3 flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="rounded p-1 text-gray-400 hover:bg-white/10 hover:text-white"
                        onClick={() => {
                          setEditCat(cat)
                          setEditCatName(cat.name)
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        className="rounded p-1 text-gray-400 hover:bg-red-500/20 hover:text-red-400"
                        onClick={() => handleDeleteCategory(cat)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {isCatExpanded && (
                  <div className="divide-y divide-gray-100">
                    {subCategories.length === 0 ? (
                      <p className="py-4 text-center text-sm text-gray-400">ยังไม่มีหัวข้อย่อย</p>
                    ) : (
                      subCategories.map((sub: BOQSubCategory) => {
                        const items = sub.items ?? []
                        const subTotal = items.reduce((s, item) => s + Number(item.totalPrice), 0)
                        const isSubExpanded = expandedSubs.has(sub.id)

                        return (
                          <div key={sub.id}>
                            {/* SubCategory header */}
                            <div
                              className="flex cursor-pointer items-center gap-3 bg-gray-50 px-5 py-2.5 hover:bg-gray-100"
                              onClick={() => toggleSub(sub.id)}
                            >
                              {isSubExpanded ? (
                                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              ) : (
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              )}
                              <Layers className="h-3.5 w-3.5 shrink-0 text-primary-500" />
                              <span className="flex-1 text-sm font-medium text-gray-800">
                                {sub.name}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {items.length} รายการ
                              </Badge>
                              <span className="ml-2 text-sm font-semibold text-gray-700">
                                {formatCurrency(subTotal)}
                              </span>
                              {!isLocked && (
                                <div
                                  className="ml-3 flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className="rounded p-1 text-gray-400 hover:bg-primary-50 hover:text-primary-600"
                                    onClick={() => {
                                      setEditSubCat(sub)
                                      setEditSubCatName(sub.name)
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                    onClick={() => handleDeleteSubCat(sub)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>

                            {isSubExpanded && (
                              <div className="px-5 pb-3 pt-2">
                                {items.length > 0 && (
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-xs text-gray-500">
                                        <th className="pb-2 text-left font-medium">รายการ</th>
                                        <th className="pb-2 text-right font-medium">จำนวน</th>
                                        <th className="pb-2 text-right font-medium">วัสดุ/หน่วย</th>
                                        <th className="pb-2 text-right font-medium">แรง/หน่วย</th>
                                        <th className="pb-2 text-right font-medium">รวม</th>
                                        {!isLocked && <th className="pb-2" />}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((item: BOQItem) => (
                                        <tr key={item.id} className="border-t border-gray-50">
                                          <td className="py-2">
                                            <p className="font-medium text-gray-900">{item.name}</p>
                                            {item.description && (
                                              <p className="text-xs text-gray-400">
                                                {item.description}
                                              </p>
                                            )}
                                            {item.remark && (
                                              <p className="mt-0.5 text-xs italic text-amber-600">
                                                หมายเหตุ: {item.remark}
                                              </p>
                                            )}
                                          </td>
                                          <td className="py-2 text-right text-gray-600">
                                            {Number(item.quantity)} {item.unit ?? ''}
                                          </td>
                                          <td className="py-2 text-right text-gray-600">
                                            {formatCurrency(Number(item.materialPrice))}
                                          </td>
                                          <td className="py-2 text-right text-gray-600">
                                            {formatCurrency(Number(item.laborPrice))}
                                          </td>
                                          <td className="py-2 text-right font-medium text-gray-900">
                                            {formatCurrency(Number(item.totalPrice))}
                                          </td>
                                          {!isLocked && (
                                            <td className="py-2 pl-3">
                                              <div className="flex items-center justify-end gap-1">
                                                <button
                                                  className="rounded p-1 text-primary-500 hover:bg-primary-50 hover:text-primary-700"
                                                  onClick={() => {
                                                    setEditItemTarget(item)
                                                    setItemForm({
                                                      name: item.name,
                                                      quantity: String(item.quantity),
                                                      unit: item.unit ?? '',
                                                      materialPrice: String(item.materialPrice),
                                                      laborPrice: String(item.laborPrice),
                                                      description: item.description ?? '',
                                                      remark: item.remark ?? '',
                                                    })
                                                  }}
                                                >
                                                  <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                  className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600"
                                                  onClick={() => handleDeleteItem(item.id)}
                                                >
                                                  <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                )}
                                {!isLocked && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={Plus}
                                    className="mt-2"
                                    onClick={() => {
                                      setItemModal({ subCatId: sub.id })
                                      setItemForm(EMPTY_ITEM)
                                    }}
                                  >
                                    เพิ่มรายการ
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}

                    {!isLocked && (
                      <div className="px-5 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Plus}
                          onClick={() => {
                            setSubCatModal({ catId: cat.id })
                            setSubCatName('')
                          }}
                        >
                          เพิ่มหัวข้อย่อย
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────────── */}

      {/* Add Category */}
      <FormModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        title="เพิ่มหมวดงาน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setCatModalOpen(false)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleAddCategory}
              loading={addCategory.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อหมวดงาน"
          value={catName}
          onChange={(e) => setCatName(e.target.value)}
          placeholder="เช่น หมวดงานโครงสร้าง"
          required
        />
      </FormModal>

      {/* Edit Category */}
      <FormModal
        open={!!editCat}
        onClose={() => setEditCat(null)}
        title="แก้ไขหมวดงาน"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditCat(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleEditCategory}
              loading={updateCategory.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อหมวดงาน"
          value={editCatName}
          onChange={(e) => setEditCatName(e.target.value)}
          required
        />
      </FormModal>

      {/* Add SubCategory */}
      <FormModal
        open={!!subCatModal}
        onClose={() => setSubCatModal(null)}
        title="เพิ่มหัวข้อย่อย"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setSubCatModal(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleAddSubCat}
              loading={addSubCat.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อหัวข้อย่อย"
          value={subCatName}
          onChange={(e) => setSubCatName(e.target.value)}
          placeholder="เช่น งานรื้อถอน"
          required
        />
      </FormModal>

      {/* Edit SubCategory */}
      <FormModal
        open={!!editSubCat}
        onClose={() => setEditSubCat(null)}
        title="แก้ไขหัวข้อย่อย"
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditSubCat(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleEditSubCat}
              loading={updateSubCat.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <Input
          label="ชื่อหัวข้อย่อย"
          value={editSubCatName}
          onChange={(e) => setEditSubCatName(e.target.value)}
          required
        />
      </FormModal>

      {/* Add Item */}
      <FormModal
        open={!!itemModal}
        onClose={() => setItemModal(null)}
        title="เพิ่มรายการ"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setItemModal(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Plus}
              onClick={handleAddItem}
              loading={addItem.isPending}
            >
              เพิ่ม
            </Button>
          </div>
        }
      >
        <ItemFormFields form={itemForm} setForm={setItemForm} />
      </FormModal>

      {/* Edit Item */}
      <FormModal
        open={!!editItemTarget}
        onClose={() => setEditItemTarget(null)}
        title="แก้ไขรายการ"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="ghost" icon={X} onClick={() => setEditItemTarget(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="primary"
              icon={Save}
              onClick={handleEditItem}
              loading={updateItem.isPending}
            >
              บันทึก
            </Button>
          </div>
        }
      >
        <ItemFormFields form={itemForm} setForm={setItemForm} />
      </FormModal>
    </div>
  )
}

function ItemFormFields({
  form,
  setForm,
}: {
  form: BOQItemPayload
  setForm: React.Dispatch<React.SetStateAction<BOQItemPayload>>
}) {
  const total =
    (Number(form.quantity) || 0) *
    ((Number(form.materialPrice) || 0) + (Number(form.laborPrice) || 0))

  return (
    <div className="space-y-3">
      <Input
        label="ชื่อรายการ"
        value={form.name}
        onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="จำนวน"
          type="number"
          value={form.quantity}
          onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))}
        />
        <Input
          label="หน่วย"
          value={form.unit}
          onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
          placeholder="ตร.ม., งาน, ชุด"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="ค่าวัสดุ/หน่วย (฿)"
          type="number"
          value={form.materialPrice}
          onChange={(e) => setForm((p) => ({ ...p, materialPrice: e.target.value }))}
        />
        <Input
          label="ค่าแรง/หน่วย (฿)"
          type="number"
          value={form.laborPrice}
          onChange={(e) => setForm((p) => ({ ...p, laborPrice: e.target.value }))}
        />
      </div>
      <Textarea
        label="รายละเอียด"
        value={form.description ?? ''}
        onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        rows={2}
        placeholder="รายละเอียดเพิ่มเติม (ไม่บังคับ)"
      />
      <Input
        label="หมายเหตุ"
        value={form.remark ?? ''}
        onChange={(e) => setForm((p) => ({ ...p, remark: e.target.value }))}
        placeholder="หมายเหตุ (ไม่บังคับ)"
      />
      <div className="rounded-lg bg-primary-50 px-4 py-2 text-sm">
        <span className="text-gray-500">รวม: </span>
        <span className="font-semibold text-primary-700">
          {new Intl.NumberFormat('th-TH', {
            style: 'currency',
            currency: 'THB',
            maximumFractionDigits: 0,
          }).format(total)}
        </span>
      </div>
    </div>
  )
}
