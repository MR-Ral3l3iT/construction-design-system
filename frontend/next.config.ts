import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  output: process.env.DOCKER_BUILD === '1' ? 'standalone' : undefined,
  // root ของ pnpm workspace = ชั้นเดียวเหนือ frontend/
  // ถ้าใส่ '../../' จะชี้เหนือ repo ขึ้นไปอีกชั้น ทำให้ standalone build
  // คัดโครงสร้าง path เต็มมาด้วย (ใน Docker กลายเป็น /app/frontend/server.js
  // ซ้อนใน standalone อีกที) และลากไฟล์นอก repo อย่าง /proc /usr ติดมา
  outputFileTracingRoot: path.join(__dirname, '../'),
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '9000',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004'}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
