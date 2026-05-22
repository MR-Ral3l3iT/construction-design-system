import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ติดตามโครงการ',
    short_name: 'โครงการ',
    description: 'ติดตามความคืบหน้าโครงการก่อสร้างของคุณ',
    start_url: '/client',
    display: 'standalone',
    background_color: '#0e7490',
    theme_color: '#0e7490',
    orientation: 'portrait',
    icons: [
      { src: '/icons/client-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/client-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
