'use client'

import { File, Paperclip, Trash2, Upload } from 'lucide-react'
import { useRef, useState } from 'react'
import { cn } from '../lib/utils'

export interface FileUploadProps {
  accept?: string
  multiple?: boolean
  maxSizeMb?: number
  label?: string
  hint?: string
  error?: string
  disabled?: boolean
  onFilesChange?: (files: File[]) => void
  className?: string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileUpload({
  accept,
  multiple = false,
  maxSizeMb = 50,
  label,
  hint,
  error: externalError,
  disabled,
  onFilesChange,
  className,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [internalError, setInternalError] = useState<string>()

  const error = externalError ?? internalError

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return
    const arr = Array.from(incoming)
    const oversized = arr.filter((f) => f.size > maxSizeMb * 1024 * 1024)
    if (oversized.length) {
      setInternalError(`ไฟล์บางไฟล์มีขนาดเกิน ${maxSizeMb} MB`)
      return
    }
    setInternalError(undefined)
    const next = multiple ? [...files, ...arr] : arr
    setFiles(next)
    onFilesChange?.(next)
  }

  function removeFile(index: number) {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFilesChange?.(next)
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && <p className="text-sm font-medium text-gray-700">{label}</p>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          handleFiles(e.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-6',
          'text-sm text-gray-500 transition-colors',
          'hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600',
          dragOver && 'border-primary-400 bg-primary-50 text-primary-600',
          error && 'border-red-300',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <Upload className="h-6 w-6 text-gray-400" />
        <span>คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง</span>
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-xs text-red-600">{error}</p>}

      {files.length > 0 && (
        <ul className="flex flex-col gap-1">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm ring-1 ring-gray-200"
            >
              <File className="h-4 w-4 shrink-0 text-primary-500" aria-hidden />
              <span className="flex-1 truncate text-gray-700">{f.name}</span>
              <span className="shrink-0 text-xs text-gray-400">{formatBytes(f.size)}</span>
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="shrink-0 rounded p-0.5 text-gray-400 hover:text-red-500 transition-colors"
                aria-label={`ลบ ${f.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
