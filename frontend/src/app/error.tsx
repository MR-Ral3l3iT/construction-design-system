'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <AlertTriangle className="h-12 w-12 text-red-400" />
      <h1 className="mt-4 text-xl font-semibold text-gray-900">เกิดข้อผิดพลาด</h1>
      <p className="mt-2 text-sm text-gray-500">ระบบพบปัญหาที่ไม่คาดคิด กรุณาลองใหม่อีกครั้ง</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-gray-400">รหัส: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        <RefreshCw className="h-4 w-4" />
        ลองใหม่
      </button>
    </div>
  )
}
