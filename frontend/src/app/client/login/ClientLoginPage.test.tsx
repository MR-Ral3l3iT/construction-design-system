import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import ClientLoginPage from './page'

const mockMutateAsync = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/useClientAuth', () => ({
  useClientLogin: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/client/login',
}))

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}))

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('ClientLoginPage', () => {
  it('renders email and password inputs', () => {
    render(
      <wrapper>
        <ClientLoginPage />
      </wrapper>,
    )

    expect(screen.getByPlaceholderText('อีเมล')).toBeTruthy()
    expect(screen.getByPlaceholderText('รหัสผ่าน')).toBeTruthy()
    expect(screen.getByRole('button', { name: /เข้าสู่ระบบ/ })).toBeTruthy()
  })

  it('calls login mutation on submit with correct values', async () => {
    mockMutateAsync.mockResolvedValue({
      accessToken: 'tok123',
      user: { roles: ['CUSTOMER'] },
    })

    render(
      <wrapper>
        <ClientLoginPage />
      </wrapper>,
    )

    fireEvent.change(screen.getByPlaceholderText('อีเมล'), {
      target: { value: 'client@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('รหัสผ่าน'), {
      target: { value: 'pass1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/ }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        email: 'client@test.com',
        password: 'pass1234',
      })
    })
  })

  it('redirects to /client/projects on successful CUSTOMER login', async () => {
    mockMutateAsync.mockResolvedValue({
      accessToken: 'tok123',
      user: { roles: ['CUSTOMER'] },
    })

    render(
      <wrapper>
        <ClientLoginPage />
      </wrapper>,
    )

    fireEvent.change(screen.getByPlaceholderText('อีเมล'), {
      target: { value: 'client@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('รหัสผ่าน'), {
      target: { value: 'pass1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/ }))

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/client/projects')
    })
  })

  it('shows error when user role is not CUSTOMER or ADMIN', async () => {
    mockMutateAsync.mockResolvedValue({
      accessToken: 'tok123',
      user: { roles: ['SITE_WORKER'] },
    })

    render(
      <wrapper>
        <ClientLoginPage />
      </wrapper>,
    )

    fireEvent.change(screen.getByPlaceholderText('อีเมล'), {
      target: { value: 'worker@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('รหัสผ่าน'), {
      target: { value: 'pass1234' },
    })
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/ }))

    await waitFor(() => {
      expect(screen.getByText('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งาน Client Portal')).toBeTruthy()
    })
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('shows error message on login failure', async () => {
    mockMutateAsync.mockRejectedValue({
      response: { data: { message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' } },
    })

    render(
      <wrapper>
        <ClientLoginPage />
      </wrapper>,
    )

    fireEvent.change(screen.getByPlaceholderText('อีเมล'), {
      target: { value: 'bad@test.com' },
    })
    fireEvent.change(screen.getByPlaceholderText('รหัสผ่าน'), {
      target: { value: 'wrongpass' },
    })
    fireEvent.click(screen.getByRole('button', { name: /เข้าสู่ระบบ/ }))

    await waitFor(() => {
      expect(screen.getByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeTruthy()
    })
  })
})
