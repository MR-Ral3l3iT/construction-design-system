import type { Metadata } from 'next'
import { Prompt } from 'next/font/google'
import './globals.css'

const prompt = Prompt({
  subsets: ['thai', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-prompt',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: '%s | Construction Design System',
    default: 'Construction Design System',
  },
  description: 'ระบบจัดการงานก่อสร้างและออกแบบ',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={prompt.variable}>
      <body>{children}</body>
    </html>
  )
}
