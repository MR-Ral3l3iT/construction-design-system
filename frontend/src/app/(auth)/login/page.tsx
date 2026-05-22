import type { Metadata } from 'next'
import Image from 'next/image'
import { LoginForm } from './LoginForm'

export const metadata: Metadata = { title: 'เข้าสู่ระบบ | UAT-ARCH System' }

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#1a1f2e] px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl bg-[#242b3d] px-8 py-10 shadow-2xl">
          {/* Logo + title */}
          <div className="mb-8 flex flex-col items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
              <Image
                src="/uat-logo.svg"
                alt="UAT-ARCH"
                width={24}
                height={26}
                className="invert brightness-200"
              />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold tracking-wide text-white">UAT-ARCH System</h1>
              <p className="mt-1 text-sm text-white/40">ระบบจัดการข้อมูลโครงการ </p>
            </div>
          </div>

          <LoginForm dark />
        </div>
      </div>
    </main>
  )
}
