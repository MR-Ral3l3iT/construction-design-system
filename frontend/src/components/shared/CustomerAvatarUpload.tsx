'use client'

import { useRef, useState } from 'react'
import { Camera, User, Building2, Loader2 } from 'lucide-react'

interface Props {
  avatarUrl?: string | null
  name: string
  type?: string
  size?: 'md' | 'lg'
  uploading?: boolean
  onFileSelected: (file: File) => void
  readOnly?: boolean
}

export function CustomerAvatarUpload({
  avatarUrl,
  name,
  type = 'INDIVIDUAL',
  size = 'lg',
  uploading = false,
  onFileSelected,
  readOnly = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [localPreview, setLocalPreview] = useState<string | null>(null)

  const displayUrl = localPreview ?? avatarUrl
  const sizeClass = size === 'lg' ? 'h-20 w-20' : 'h-16 w-16'
  const cameraClass = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'

  function getInitials(n: string) {
    return n
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLocalPreview(URL.createObjectURL(file))
    onFileSelected(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="relative inline-block">
      <div className={`${sizeClass} overflow-hidden rounded-full ring-2 ring-white shadow`}>
        {displayUrl ? (
          <img src={displayUrl} alt={name} className="h-full w-full object-cover" />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${type === 'COMPANY' ? 'bg-primary-100' : 'bg-primary-100'}`}
          >
            {name ? (
              <span
                className={`font-semibold ${size === 'lg' ? 'text-xl' : 'text-base'} ${type === 'COMPANY' ? 'text-primary-600' : 'text-primary-600'}`}
              >
                {getInitials(name)}
              </span>
            ) : type === 'COMPANY' ? (
              <Building2
                className={`${size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} text-primary-400`}
              />
            ) : (
              <User className={`${size === 'lg' ? 'h-10 w-10' : 'h-8 w-8'} text-primary-400`} />
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow ring-2 ring-white hover:bg-primary-700 disabled:opacity-60 transition-colors"
          >
            {uploading ? (
              <Loader2 className={`${cameraClass} animate-spin`} />
            ) : (
              <Camera className={cameraClass} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}
    </div>
  )
}
