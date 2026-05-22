'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function ClientError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ClientError]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <div className="rounded-full bg-white/10 p-4">
        <AlertTriangle className="h-8 w-8 text-amber-300" />
      </div>
      <h2 className="mt-4 text-base font-semibold text-white">เกิดข้อผิดพลาด</h2>
      <p className="mt-2 text-sm text-white/50">ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง</p>
      {error.digest && <p className="mt-1 font-mono text-xs text-white/30">รหัส: {error.digest}</p>}
      <button
        onClick={reset}
        className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/15 px-5 py-2.5 text-sm font-medium text-white ring-1 ring-white/20 active:bg-white/20"
      >
        <RefreshCw className="h-4 w-4" />
        ลองใหม่
      </button>
    </div>
  )
}
