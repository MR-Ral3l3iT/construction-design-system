'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[AdminError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <AlertTriangle className="h-10 w-10 text-amber-400" />
      <h2 className="mt-4 text-lg font-semibold text-gray-900">เกิดข้อผิดพลาดในหน้านี้</h2>
      <p className="mt-2 max-w-sm text-sm text-gray-500">
        ไม่สามารถโหลดข้อมูลได้ในขณะนี้ กรุณาลองใหม่ หรือกลับหน้าหลัก
      </p>
      {error.digest && <p className="mt-1 font-mono text-xs text-gray-400">รหัส: {error.digest}</p>}
      <div className="mt-6 flex gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
          หน้าหลัก
        </Link>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <RefreshCw className="h-4 w-4" />
          ลองใหม่
        </button>
      </div>
    </div>
  )
}
