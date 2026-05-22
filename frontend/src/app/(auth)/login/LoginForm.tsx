'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff, Lock, Mail } from 'lucide-react'
import { useLogin } from '@/hooks/useLogin'

interface FormValues {
  email: string
  password: string
}

interface Props {
  dark?: boolean
}

export function LoginForm({ dark }: Props) {
  const [showPassword, setShowPassword] = useState(false)
  const { mutate: login, isPending, error } = useLogin()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { email: '', password: '' },
  })

  const errorMessage =
    error instanceof Error
      ? ((error as { response?: { data?: { message?: string } } }).response?.data?.message ??
        error.message)
      : null

  if (!dark) {
    // Light mode (fallback — used on non-dark pages)
    return (
      <form onSubmit={handleSubmit((v) => login(v))} className="space-y-4" noValidate>
        {errorMessage && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
        )}
        <DarkField
          id="email"
          type="email"
          placeholder="อีเมล"
          icon={Mail}
          error={errors.email?.message}
          autoComplete="email"
          {...register('email', {
            required: 'กรุณากรอกอีเมล',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'อีเมลไม่ถูกต้อง' },
          })}
        />
        <DarkField
          id="password"
          type={showPassword ? 'text' : 'password'}
          placeholder="รหัสผ่าน"
          icon={Lock}
          trailingIcon={showPassword ? EyeOff : Eye}
          onTrailingClick={() => setShowPassword((v) => !v)}
          error={errors.password?.message}
          autoComplete="current-password"
          {...register('password', { required: 'กรุณากรอกรหัสผ่าน' })}
        />
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60"
        >
          {isPending ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSubmit((v) => login(v))} className="space-y-3" noValidate>
      {errorMessage && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <DarkField
        id="email"
        type="email"
        placeholder="Username"
        icon={Mail}
        error={errors.email?.message}
        autoComplete="email"
        {...register('email', {
          required: 'กรุณากรอกอีเมล',
          pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'อีเมลไม่ถูกต้อง' },
        })}
      />

      <DarkField
        id="password"
        type={showPassword ? 'text' : 'password'}
        placeholder="Password"
        icon={Lock}
        trailingIcon={showPassword ? EyeOff : Eye}
        onTrailingClick={() => setShowPassword((v) => !v)}
        error={errors.password?.message}
        autoComplete="current-password"
        {...register('password', { required: 'กรุณากรอกรหัสผ่าน' })}
      />

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full rounded-lg bg-primary-600 py-3 text-sm font-semibold tracking-wide text-white transition hover:bg-primary-700 active:scale-[0.98] disabled:opacity-60"
      >
        {isPending ? 'Signing in...' : 'Log In'}
      </button>

      <p className="mt-4 text-center text-xs leading-relaxed text-white/30">
        หากไม่สามารถเข้าสู่ระบบได้ กรุณาติดต่อเจ้าหน้าที่ดูแลระบบ
      </p>
    </form>
  )
}

// ─── Dark styled input ────────────────────────────────────────────────────────
import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import { type LucideIcon } from 'lucide-react'

interface DarkFieldProps extends ComponentPropsWithoutRef<'input'> {
  id: string
  icon?: LucideIcon
  trailingIcon?: LucideIcon
  onTrailingClick?: () => void
  error?: string
}

const DarkField = forwardRef<HTMLInputElement, DarkFieldProps>(function DarkField(
  { id, icon: Icon, trailingIcon: TrailingIcon, onTrailingClick, error, className, ...rest },
  ref,
) {
  return (
    <div>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
            <Icon className="h-4 w-4 text-slate-400" />
          </div>
        )}
        <input
          id={id}
          ref={ref}
          className={[
            'w-full rounded-lg bg-[#1a1f2e] py-3 text-sm text-white placeholder-white/30',
            'border border-white/10 outline-none transition',
            'focus:border-primary-500 focus:ring-2 focus:ring-primary-600/30',
            Icon ? 'pl-10' : 'pl-4',
            TrailingIcon ? 'pr-10' : 'pr-4',
            error ? 'border-red-500/50' : '',
            className ?? '',
          ].join(' ')}
          {...rest}
        />
        {TrailingIcon && (
          <button
            type="button"
            onClick={onTrailingClick}
            className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
            tabIndex={-1}
          >
            <TrailingIcon className="h-4 w-4" />
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  )
})
