import { cn } from '../lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface AvatarProps {
  name?: string
  src?: string
  size?: AvatarSize
  shape?: 'circle' | 'square'
  className?: string
  alt?: string
}

const sizeStyles: Record<AvatarSize, string> = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

const colors = [
  'bg-violet-500',
  'bg-indigo-500',
  'bg-blue-500',
  'bg-sky-500',
  'bg-teal-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
]

function pickColor(name: string) {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return colors[sum % colors.length]
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Avatar({
  name = '',
  src,
  size = 'md',
  shape = 'circle',
  className,
  alt,
}: AvatarProps) {
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-lg'

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        className={cn('object-cover', sizeStyles[size], shapeClass, className)}
      />
    )
  }

  return (
    <div
      aria-label={alt ?? name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-semibold text-white',
        sizeStyles[size],
        shapeClass,
        name ? pickColor(name) : 'bg-gray-300',
        className,
      )}
    >
      {name ? initials(name) : '?'}
    </div>
  )
}

export interface AvatarGroupProps {
  avatars: AvatarProps[]
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({ avatars, max = 4, size = 'sm', className }: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const overflow = avatars.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((av, i) => (
        <div key={i} className="ring-2 ring-white rounded-full">
          <Avatar {...av} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-gray-200 font-semibold text-gray-600 ring-2 ring-white',
            sizeStyles[size],
            'text-[10px]',
          )}
        >
          +{overflow}
        </div>
      )}
    </div>
  )
}
